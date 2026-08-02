import '@tensorflow/tfjs-backend-webgl'
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'

export type KimDetection = {
  bbox: [number, number, number, number]
  className: string
  score: number
}

export type KimDetectorStatus = {
  detail: string
  stage: 'idle' | 'loading' | 'ready' | 'detecting' | 'error'
}

let detectorPromise: Promise<cocoSsd.ObjectDetection> | null = null

export async function loadKimObjectDetector(onStatus?: (status: KimDetectorStatus) => void) {
  if (!detectorPromise) {
    onStatus?.({ detail: 'Loading local object detector...', stage: 'loading' })
    detectorPromise = (async () => {
      await tf.setBackend('webgl')
      await tf.ready()
      return cocoSsd.load({ base: 'lite_mobilenet_v2' })
    })()
  }
  const detector = await detectorPromise
  onStatus?.({ detail: 'Local detector ready.', stage: 'ready' })
  return detector
}

export async function detectKimObjects(
  image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement,
  onStatus?: (status: KimDetectorStatus) => void,
) {
  onStatus?.({ detail: 'Local detector scanning frame...', stage: 'detecting' })
  const detector = await loadKimObjectDetector(onStatus)
  const predictions = await detector.detect(image, 12, 0.42)
  onStatus?.({ detail: `Local detector found ${predictions.length} object${predictions.length === 1 ? '' : 's'}.`, stage: 'ready' })
  return predictions.map((prediction) => ({
    bbox: prediction.bbox as [number, number, number, number],
    className: prediction.class,
    score: prediction.score,
  }))
}

export function summarizeKimDetections(detections: KimDetection[]) {
  const useful = detections
    .filter((detection) => detection.score >= 0.5)
    .sort((a, b) => b.score - a.score)

  const counts = useful.reduce<Record<string, number>>((current, detection) => {
    current[detection.className] = (current[detection.className] || 0) + 1
    return current
  }, {})

  const labels = Object.entries(counts).map(([label, count]) => count > 1 ? `${count} ${label}` : label)
  return {
    labels,
    personVisible: Boolean(counts.person),
    dogVisible: Boolean(counts.dog),
    chairVisible: Boolean(counts.chair),
    heldObjectLikely: useful.some((detection) => [
      'bottle',
      'cell phone',
      'cup',
      'fork',
      'keyboard',
      'mouse',
      'remote',
      'scissors',
      'sports ball',
      'toothbrush',
    ].includes(detection.className)),
  }
}
