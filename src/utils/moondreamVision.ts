type TransformersModule = typeof import('@huggingface/transformers')

type LoadedMoondream = {
  model: Awaited<ReturnType<TransformersModule['Moondream1ForConditionalGeneration']['from_pretrained']>>
  processor: Awaited<ReturnType<TransformersModule['AutoProcessor']['from_pretrained']>>
  tokenizer: Awaited<ReturnType<TransformersModule['AutoTokenizer']['from_pretrained']>>
  transformers: TransformersModule
}

export type MoondreamStatus = {
  stage: 'idle' | 'loading' | 'ready' | 'analyzing' | 'error'
  detail: string
}

export const defaultMoondreamModelId = 'Xenova/moondream2'

let loadPromise: Promise<LoadedMoondream> | null = null

function cleanMoondreamOutput(output: string) {
  const answerMarker = 'Answer:'
  const afterAnswer = output.includes(answerMarker)
    ? output.slice(output.lastIndexOf(answerMarker) + answerMarker.length)
    : output

  return afterAnswer
    .replace(/<\|endoftext\|>/g, '')
    .replace(/<image>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasBrowserMoondreamSupport() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

export async function loadMoondream(
  modelId = defaultMoondreamModelId,
  onStatus?: (status: MoondreamStatus) => void,
) {
  if (!hasBrowserMoondreamSupport()) {
    throw new Error('Local Moondream needs a browser with WebGPU support. Try current Chrome or Edge over HTTPS.')
  }

  loadPromise ??= (async () => {
    onStatus?.({ detail: `Loading ${modelId} from Hugging Face. First run can take a while.`, stage: 'loading' })
    const transformers = await import('@huggingface/transformers')
    transformers.env.allowLocalModels = false

    const [processor, tokenizer, model] = await Promise.all([
      transformers.AutoProcessor.from_pretrained(modelId),
      transformers.AutoTokenizer.from_pretrained(modelId),
      transformers.Moondream1ForConditionalGeneration.from_pretrained(modelId, {
        device: 'webgpu',
        dtype: {
          decoder_model_merged: 'q4',
          embed_tokens: 'fp16',
          vision_encoder: 'fp16',
        },
        progress_callback: (progress: { file?: string; progress?: number; status?: string }) => {
          if (progress.status !== 'progress') return
          const percent = typeof progress.progress === 'number' ? ` ${Math.round(progress.progress)}%` : ''
          onStatus?.({ detail: `Downloading ${progress.file || 'model file'}${percent}`, stage: 'loading' })
        },
      }),
    ])

    onStatus?.({ detail: 'Moondream is loaded and ready locally.', stage: 'ready' })
    return { model, processor, tokenizer, transformers }
  })()

  return loadPromise
}

export async function assessWithMoondream(
  imageDataUrl: string,
  prompt: string,
  modelId = defaultMoondreamModelId,
  onStatus?: (status: MoondreamStatus) => void,
) {
  const { model, processor, tokenizer, transformers } = await loadMoondream(modelId, onStatus)
  onStatus?.({ detail: 'Moondream is reading the current camera frame.', stage: 'analyzing' })

  const text = `<image>\n\nQuestion: ${prompt}\n\nAnswer:`
  const image = await transformers.RawImage.fromURL(imageDataUrl)
  const inputs = await processor(image, text)
  const output = await model.generate({
    ...inputs,
    do_sample: false,
    max_new_tokens: 80,
  })
  const decoded = tokenizer.batch_decode(output as Parameters<typeof tokenizer.batch_decode>[0], { skip_special_tokens: false })
  const note = cleanMoondreamOutput(Array.isArray(decoded) ? decoded[0] : String(decoded))
  onStatus?.({ detail: 'Local Moondream assessment complete.', stage: 'ready' })
  return note || 'Moondream finished but returned an empty assessment.'
}
