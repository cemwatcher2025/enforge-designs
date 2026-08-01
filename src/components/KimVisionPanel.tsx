import { useCallback, useEffect, useRef, useState } from 'react'
import { useCamera } from '../context/cameraContext'
import { assessWithMoondream, defaultMoondreamModelId, hasBrowserMoondreamSupport, loadMoondream, type MoondreamStatus } from '../utils/moondreamVision'

type VisionMode = 'gpuServer' | 'moondream' | 'proxy' | 'stats'

type VisionAssessment = {
  brightness: number
  kind?: 'check' | 'observation' | 'notice' | 'error'
  mode: VisionMode
  motion: number | null
  note: string
  timestamp: string
  trigger: string
}

type VisionMemory = {
  averageBrightness: number | null
  averageMotion: number | null
  lastDeepObservation: string | null
  lastSeenAt: string | null
  samples: number
}

type BaselineSignal = {
  brightnessDelta: number
  learnedBrightnessShift: boolean
  learnedMotionShift: boolean
  motionDelta: number
  ready: boolean
}

const endpointStorageKey = 'enforge-kim-vision-endpoint'
const gpuEndpointStorageKey = 'enforge-kim-vision-gpu-endpoint'
const visionModeStorageKey = 'enforge-kim-vision-mode'
const modelStorageKey = 'enforge-kim-vision-model'
const frameIntervalStorageKey = 'enforge-kim-vision-frame-interval'
const motionThresholdStorageKey = 'enforge-kim-vision-motion-threshold'
const cooldownStorageKey = 'enforge-kim-vision-cooldown'
const deepAutoStorageKey = 'enforge-kim-vision-deep-auto'
const assessmentLogStorageKey = 'enforge-kim-vision-assessments'
const visionMemoryStorageKey = 'enforge-kim-vision-memory'
const defaultVisionEndpoint = import.meta.env.VITE_KIM_VISION_ENDPOINT
  || (import.meta.env.VITE_COMMAND_CENTER_PROXY_URL
    ? `${String(import.meta.env.VITE_COMMAND_CENTER_PROXY_URL).replace(/\/$/, '')}/api/kim/vision`
    : '')
const defaultGpuEndpoint = 'http://127.0.0.1:8765'
const baselineWarmupSamples = 8
const baselineAdaptRate = 0.12
const defaultFrameInterval = 240
const defaultCooldownSeconds = 45
const strongMotionCooldownSeconds = 22

function averageBrightness(data: Uint8ClampedArray) {
  let total = 0
  const stride = 16
  for (let index = 0; index < data.length; index += 4 * stride) {
    total += (data[index] + data[index + 1] + data[index + 2]) / 3
  }
  return Math.round((total / (data.length / 4 / stride) / 255) * 100)
}

function frameDelta(current: Uint8ClampedArray, previous: Uint8ClampedArray | null) {
  if (!previous) return null
  let total = 0
  const stride = 20
  for (let index = 0; index < current.length; index += 4 * stride) {
    total += Math.abs(current[index] - previous[index])
      + Math.abs(current[index + 1] - previous[index + 1])
      + Math.abs(current[index + 2] - previous[index + 2])
  }
  return Math.round((total / (current.length / 4 / stride) / 765) * 100)
}

function localNote(brightness: number, motion: number | null) {
  const light = brightness > 68 ? 'bright' : brightness < 28 ? 'dim' : 'balanced'
  const movement = motion == null ? 'baseline frame captured' : motion > 18 ? 'noticeable motion' : motion > 6 ? 'light movement' : 'mostly steady'
  return `Local frame read: ${light} lighting, ${movement}.`
}

function defaultVisionMemory(): VisionMemory {
  return {
    averageBrightness: null,
    averageMotion: null,
    lastDeepObservation: null,
    lastSeenAt: null,
    samples: 0,
  }
}

function loadVisionMemory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(visionMemoryStorageKey) || 'null') as VisionMemory | null
    return parsed && typeof parsed.samples === 'number' ? parsed : defaultVisionMemory()
  } catch {
    return defaultVisionMemory()
  }
}

function updateVisionMemory(memory: VisionMemory, brightness: number, motion: number | null, timestamp: string, deepObservation?: string) {
  const samples = memory.samples + 1
  const motionValue = motion ?? memory.averageMotion ?? 0
  const shouldWarmUp = memory.samples < baselineWarmupSamples
  const blend = (current: number | null, next: number) => {
    if (current == null) return next
    if (shouldWarmUp) return ((current * memory.samples) + next) / samples
    return (current * (1 - baselineAdaptRate)) + (next * baselineAdaptRate)
  }
  const currentMotion = memory.averageMotion ?? motionValue
  const stableMotionCeiling = Math.max(6, currentMotion + 2)
  const motionForBaseline = shouldWarmUp || motionValue <= stableMotionCeiling
    ? motionValue
    : currentMotion
  const nextMemory: VisionMemory = {
    averageBrightness: Math.round(blend(memory.averageBrightness, brightness) * 10) / 10,
    averageMotion: Math.round(blend(memory.averageMotion, motionForBaseline) * 10) / 10,
    lastDeepObservation: deepObservation || memory.lastDeepObservation,
    lastSeenAt: timestamp,
    samples,
  }
  window.localStorage.setItem(visionMemoryStorageKey, JSON.stringify(nextMemory))
  return nextMemory
}

function quietCheckNote(brightness: number, motion: number | null, memory: VisionMemory) {
  const memoryText = memory.samples < baselineWarmupSamples
    ? `KIM is learning the room baseline (${memory.samples}/${baselineWarmupSamples} samples).`
    : `Baseline learned: usual light ${memory.averageBrightness ?? brightness}%, usual motion ${memory.averageMotion ?? 0}%.`
  return `Check logged: ${localNote(brightness, motion)} ${memoryText}`
}

function baselineSignal(memory: VisionMemory, brightness: number, motion: number | null, brightnessDelta: number): BaselineSignal {
  const motionValue = motion ?? 0
  const usualMotion = memory.averageMotion ?? 0
  const usualBrightness = memory.averageBrightness ?? brightness
  const motionDelta = Math.max(0, motionValue - usualMotion)
  const learnedBrightnessDelta = Math.abs(brightness - usualBrightness)
  const ready = memory.samples >= baselineWarmupSamples
  const learnedMotionThreshold = Math.max(usualMotion + 6, Math.round(usualMotion * 2.5), 10)

  return {
    brightnessDelta: Math.max(brightnessDelta, learnedBrightnessDelta),
    learnedBrightnessShift: ready && learnedBrightnessDelta >= 10,
    learnedMotionShift: ready && motion != null && motionValue >= learnedMotionThreshold,
    motionDelta,
    ready,
  }
}

function loadFrameInterval() {
  const saved = Number(window.localStorage.getItem(frameIntervalStorageKey) || defaultFrameInterval)
  if (!Number.isFinite(saved) || saved <= 0) return defaultFrameInterval
  return Math.min(saved, defaultFrameInterval)
}

function loadCooldownSeconds() {
  const saved = Number(window.localStorage.getItem(cooldownStorageKey) || defaultCooldownSeconds)
  if (!Number.isFinite(saved) || saved <= 0) return defaultCooldownSeconds
  return Math.min(saved, defaultCooldownSeconds)
}

function triggerFromSignals(
  forceAssessment: boolean,
  motion: number | null,
  brightnessDelta: number,
  signal: BaselineSignal,
  motionThreshold: number,
) {
  if (forceAssessment) return 'manual'
  if (motion != null && motion >= motionThreshold) return `motion ${motion}%`
  if (brightnessDelta >= 14) return `lighting shift ${brightnessDelta}%`
  if (signal.learnedMotionShift) return `learned motion shift +${signal.motionDelta}%`
  if (signal.learnedBrightnessShift) return `learned light shift ${signal.brightnessDelta}%`
  return null
}

const assessmentPrompt = 'Report only the visible activity or change in one short natural sentence. Focus on people, animals, held objects, entering, leaving, standing, sitting, or large motion. Avoid clothing, facial expressions, and room descriptions unless they are unmistakable. Do not mention prompt categories or instructions. Do not identify private screen text.'

function prependAssessment(current: VisionAssessment[], next: VisionAssessment) {
  return [next, ...current].slice(0, 40)
}

function updateVisionObservation(memory: VisionMemory, timestamp: string, deepObservation?: string) {
  const nextMemory: VisionMemory = {
    ...memory,
    lastDeepObservation: deepObservation || memory.lastDeepObservation,
    lastSeenAt: timestamp,
  }
  window.localStorage.setItem(visionMemoryStorageKey, JSON.stringify(nextMemory))
  return nextMemory
}

function cleanModelObservation(note: string, fallback: string) {
  const cleaned = note
    .replace(/^the most useful current visual observation is that\s+/i, '')
    .replace(/^the most useful observation is that\s+/i, '')
    .trim()
  const normalized = cleaned.toLowerCase()
  const instructionEchoes = [
    'brandon present/away',
    'brandon is present, moving',
    'focused/moving/phone',
    'new people/animals/objects',
    'person/animal/object',
    'using a phone/object',
    'entered or left',
    'what is the most useful current visual observation',
    'visible activity or change',
    'prompt categories',
  ]
  const lowValueOrRisky = [
    'fan on his head',
    'fan on her head',
    'fan on the head',
    'tie',
    'surprised',
    'sunset',
    'blue shirt',
    'black leather chair',
    'living room with a fan',
  ]
  const usefulSignals = [
    'holding',
    'standing',
    'walking',
    'entered',
    'left',
    'dog',
    'cat',
    'animal',
    'phone',
    'remote',
    'mug',
    'spray bottle',
    'object',
  ]
  const genericStableCaptions = [
    'a man sitting in a chair in a room',
    'a man sitting in a chair in a living room',
    'a man is sitting in a chair in a room',
  ]
  if (instructionEchoes.some((phrase) => normalized.includes(phrase))) {
    return `${fallback} Model echoed the observation prompt, so KIM logged this as a numeric notice instead.`
  }
  if (genericStableCaptions.some((phrase) => normalized === phrase || normalized === `${phrase}.`)) {
    return `${fallback} Model saw no distinct new action beyond stable seated presence.`
  }
  if (lowValueOrRisky.some((phrase) => normalized.includes(phrase))) {
    const stripped = cleaned
      .replace(/\s+in a blue shirt and tie/gi, '')
      .replace(/\s+in a blue shirt/gi, '')
      .replace(/\s+wearing a blue shirt/gi, '')
      .replace(/\s+with a sunset in the background/gi, '')
      .replace(/\s+with a fan on (his|her|their) head/gi, '')
      .replace(/\s+and looking surprised/gi, '')
      .replace(/\s+with a surprised expression/gi, '')
      .replace(/\s+in a living room with a fan/gi, '')
      .replace(/\s+in a living room\.?$/i, '.')
      .replace(/\s+in a room\.?$/i, '.')
      .replace(/\s{2,}/g, ' ')
      .trim()

    if (usefulSignals.some((phrase) => stripped.toLowerCase().includes(phrase))) {
      return stripped || `${fallback} Model saw movement, but the fine detail was uncertain.`
    }
    return `${fallback} Model saw movement, but the fine detail was uncertain.`
  }
  return (cleaned || note)
    .replace(/\s+in a living room\.?$/i, '.')
    .replace(/\s+in a room\.?$/i, '.')
    .replace(/\s+with a room in the background\.?$/i, '.')
}

async function postVisionAssessment(endpoint: string, imageDataUrl: string, metadata: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    body: JSON.stringify({
      imageDataUrl,
      metadata,
      prompt: assessmentPrompt,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = await response.json().catch(() => ({})) as { assessment?: string; summary?: string; error?: string }
  if (!response.ok) throw new Error(payload.error || `Vision endpoint returned ${response.status}`)
  return payload.assessment || payload.summary || 'KIM received the frame but did not return a text assessment.'
}

async function postGpuServerAssessment(baseUrl: string, imageDataUrl: string, metadata: Record<string, unknown>) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/analyze`, {
    body: JSON.stringify({
      imageDataUrl,
      metadata,
      prompt: assessmentPrompt,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = await response.json().catch(() => ({})) as { description?: string; detail?: string; error?: string }
  if (!response.ok) throw new Error(payload.detail || payload.error || `Local GPU server returned ${response.status}`)
  return payload.description || 'Local GPU server returned an empty assessment.'
}

async function checkGpuServerHealth(baseUrl: string) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/health`)
  const payload = await response.json().catch(() => ({})) as { ok?: boolean; provider?: string | null; ready?: boolean; detail?: string }
  if (!response.ok) throw new Error(payload.detail || `Local GPU server returned ${response.status}`)
  return payload
}

export function KimVisionPanel() {
  const { attachVideo, isActive, isMirrored } = useCamera()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null)
  const lastBrightnessRef = useRef<number | null>(null)
  const lastAssessmentAtRef = useRef(0)
  const memoryRef = useRef<VisionMemory>(loadVisionMemory())
  const frameCountRef = useRef(0)
  const [enabled, setEnabled] = useState(false)
  const [frameInterval, setFrameInterval] = useState(loadFrameInterval)
  const [motionThreshold, setMotionThreshold] = useState(() => Number(window.localStorage.getItem(motionThresholdStorageKey) || 22))
  const [cooldownSeconds, setCooldownSeconds] = useState(loadCooldownSeconds)
  const [deepAutoEnabled, setDeepAutoEnabled] = useState(() => window.localStorage.getItem(deepAutoStorageKey) === 'true')
  const [visionMode, setVisionMode] = useState<VisionMode>(() => {
    const saved = window.localStorage.getItem(visionModeStorageKey)
    return saved === 'gpuServer' || saved === 'proxy' || saved === 'stats' || saved === 'moondream' ? saved : 'moondream'
  })
  const [modelId, setModelId] = useState(() => window.localStorage.getItem(modelStorageKey) || defaultMoondreamModelId)
  const [endpoint, setEndpoint] = useState(() => window.localStorage.getItem(endpointStorageKey) || defaultVisionEndpoint)
  const [gpuEndpoint, setGpuEndpoint] = useState(() => window.localStorage.getItem(gpuEndpointStorageKey) || defaultGpuEndpoint)
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState('Waiting for camera.')
  const [gpuServerStatus, setGpuServerStatus] = useState('Not checked.')
  const [modelStatus, setModelStatus] = useState<MoondreamStatus>({
    detail: hasBrowserMoondreamSupport()
      ? 'Local Moondream is available. First analysis downloads the model from Hugging Face.'
      : 'Local Moondream needs WebGPU. Proxy and stats modes still work.',
    stage: hasBrowserMoondreamSupport() ? 'idle' : 'error',
  })
  const [assessments, setAssessments] = useState<VisionAssessment[]>(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(assessmentLogStorageKey) || '[]') as VisionAssessment[]
      return Array.isArray(parsed) ? parsed.slice(0, 20) : []
    } catch {
      return []
    }
  })
  const effectiveStatus = !isActive
    ? 'Waiting for camera.'
    : enabled
      ? `KIM is watching for meaningful changes every ${frameInterval.toLocaleString()} frames.`
      : status

  const refreshGpuServerHealth = useCallback(async () => {
    setGpuServerStatus('Checking local GPU server...')
    try {
      const health = await checkGpuServerHealth(gpuEndpoint.trim() || defaultGpuEndpoint)
      const provider = health.provider || 'no GPU provider'
      setGpuServerStatus(`${health.ok ? 'Online' : 'Unavailable'}: ${provider}. ${health.detail || ''}`)
    } catch (error) {
      setGpuServerStatus(error instanceof Error ? error.message : 'Local GPU server health check failed.')
    }
  }, [gpuEndpoint])

  const captureAndAssess = useCallback(async (trigger = 'manual', forceAssessment = true) => {
    const video = videoRef.current
    if (!video || video.readyState < 2 || isSending) return
    setIsSending(true)

    try {
      const width = 320
      const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('Snapshot canvas unavailable.')
      if (isMirrored) {
        context.translate(width, 0)
        context.scale(-1, 1)
      }
      context.drawImage(video, 0, 0, width, height)
      const image = context.getImageData(0, 0, width, height)
      const brightness = averageBrightness(image.data)
      const motion = frameDelta(image.data, previousFrameRef.current)
      previousFrameRef.current = new Uint8ClampedArray(image.data)
      const brightnessDelta = lastBrightnessRef.current == null ? 0 : Math.abs(brightness - lastBrightnessRef.current)
      lastBrightnessRef.current = brightness
      const timestamp = new Date().toISOString()
      let note = localNote(brightness, motion)
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.68)
      const now = Date.now()
      const cooldownOpen = now - lastAssessmentAtRef.current >= cooldownSeconds * 1000
      const signal = baselineSignal(memoryRef.current, brightness, motion, brightnessDelta)
      const meaningfulMotion = motion != null && motion >= motionThreshold
      const meaningfulLightChange = brightnessDelta >= 14
      const learnedChange = signal.learnedMotionShift || signal.learnedBrightnessShift
      const strongLearnedMotion = signal.ready
        && motion != null
        && motion >= Math.max((memoryRef.current.averageMotion ?? 0) + 8, 12)
      const strongMotionCooldownOpen = now - lastAssessmentAtRef.current >= strongMotionCooldownSeconds * 1000
      const triggerReason = triggerFromSignals(forceAssessment, motion, brightnessDelta, signal, motionThreshold)
      const shouldAssess = forceAssessment
        || (cooldownOpen && (meaningfulMotion || meaningfulLightChange || learnedChange))
        || (strongMotionCooldownOpen && strongLearnedMotion)

      if (!shouldAssess) {
        const nextMemory = updateVisionMemory(memoryRef.current, brightness, motion, timestamp)
        memoryRef.current = nextMemory
        const quietNote = quietCheckNote(brightness, motion, nextMemory)
        setAssessments((current) => prependAssessment(current, {
          brightness,
          kind: 'check',
          mode: visionMode,
          motion,
          note: quietNote,
          timestamp,
          trigger: 'routine check',
        }))
        setStatus(signal.ready
          ? `Routine check logged. Motion ${motion == null ? 'baseline' : `${motion}%`} is within learned baseline.`
          : `Routine check logged. Motion ${motion == null ? 'baseline' : `${motion}%`} stays below ${motionThreshold}%.`)
        return
      }

      const assessmentTrigger = triggerReason || trigger
      const runDeepAssessment = forceAssessment || deepAutoEnabled

      if (!runDeepAssessment) {
        note = signal.ready && learnedChange
          ? `Learned-baseline change noticed: ${assessmentTrigger}. ${localNote(brightness, motion)} Usual light ${memoryRef.current.averageBrightness ?? brightness}%, usual motion ${memoryRef.current.averageMotion ?? 0}%. Deep assessment skipped to keep the dashboard responsive.`
          : `Change noticed: ${assessmentTrigger}. ${localNote(brightness, motion)} Deep assessment skipped to keep the dashboard responsive.`
      }

      if (runDeepAssessment && visionMode === 'gpuServer') {
        try {
          note = await postGpuServerAssessment(gpuEndpoint.trim() || defaultGpuEndpoint, imageDataUrl, {
            brightness,
            frameCount: frameCountRef.current,
            height,
            motion,
            timestamp,
            width,
          })
          note = cleanModelObservation(note, localNote(brightness, motion))
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Local GPU server failed.'
          note = `${localNote(brightness, motion)} Local GPU server unavailable: ${message}`
        }
      }

      if (runDeepAssessment && visionMode === 'moondream') {
        try {
          note = await assessWithMoondream(imageDataUrl, assessmentPrompt, modelId.trim() || defaultMoondreamModelId, setModelStatus)
          note = cleanModelObservation(note, localNote(brightness, motion))
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Local Moondream failed.'
          setModelStatus({ detail: message, stage: 'error' })
          note = `${localNote(brightness, motion)} Local Moondream was unavailable: ${message}`
        }
      }

      if (runDeepAssessment && visionMode === 'proxy' && endpoint.trim()) {
        note = await postVisionAssessment(endpoint.trim(), imageDataUrl, {
          brightness,
          frameCount: frameCountRef.current,
          height,
          motion,
          timestamp,
          width,
        })
        note = cleanModelObservation(note, localNote(brightness, motion))
      }

      lastAssessmentAtRef.current = now
      const nextMemory = updateVisionObservation(memoryRef.current, timestamp, runDeepAssessment ? note : undefined)
      memoryRef.current = nextMemory
      setAssessments((current) => prependAssessment(current, {
        brightness,
        kind: runDeepAssessment ? 'observation' : 'notice',
        mode: visionMode,
        motion,
        note,
        timestamp,
        trigger: assessmentTrigger,
      }))
      setStatus(visionMode === 'moondream'
        ? runDeepAssessment ? `Local Moondream pass complete: ${assessmentTrigger}.` : `Change logged without deep model: ${assessmentTrigger}.`
        : visionMode === 'gpuServer'
          ? runDeepAssessment ? `Local GPU server pass complete: ${assessmentTrigger}.` : `Change logged without deep model: ${assessmentTrigger}.`
        : visionMode === 'proxy' && endpoint.trim()
          ? `Proxy KIM assessment received: ${assessmentTrigger}.`
          : `Local frame stats captured: ${assessmentTrigger}.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Vision assessment failed.')
    } finally {
      setIsSending(false)
    }
  }, [cooldownSeconds, deepAutoEnabled, endpoint, gpuEndpoint, isMirrored, isSending, modelId, motionThreshold, visionMode])

  useEffect(() => {
    if (videoRef.current) attachVideo(videoRef.current)
  }, [attachVideo, isActive])

  useEffect(() => {
    window.localStorage.setItem(endpointStorageKey, endpoint)
  }, [endpoint])

  useEffect(() => {
    window.localStorage.setItem(gpuEndpointStorageKey, gpuEndpoint)
  }, [gpuEndpoint])

  useEffect(() => {
    window.localStorage.setItem(visionModeStorageKey, visionMode)
  }, [visionMode])

  useEffect(() => {
    window.localStorage.setItem(modelStorageKey, modelId)
  }, [modelId])

  useEffect(() => {
    window.localStorage.setItem(motionThresholdStorageKey, String(motionThreshold))
  }, [motionThreshold])

  useEffect(() => {
    window.localStorage.setItem(frameIntervalStorageKey, String(frameInterval))
  }, [frameInterval])

  useEffect(() => {
    window.localStorage.setItem(cooldownStorageKey, String(cooldownSeconds))
  }, [cooldownSeconds])

  useEffect(() => {
    window.localStorage.setItem(deepAutoStorageKey, String(deepAutoEnabled))
  }, [deepAutoEnabled])

  useEffect(() => {
    window.localStorage.setItem(assessmentLogStorageKey, JSON.stringify(assessments))
  }, [assessments])

  useEffect(() => {
    if (!enabled || !isActive) return undefined
    let cancelled = false
    let requestId = 0

    function tick() {
      if (cancelled) return
      frameCountRef.current += 1
      if (frameCountRef.current % frameInterval === 0) void captureAndAssess('change detected', false)
      requestId = window.requestAnimationFrame(tick)
    }

    requestId = window.requestAnimationFrame(tick)
    return () => {
      cancelled = true
      window.cancelAnimationFrame(requestId)
    }
  }, [captureAndAssess, enabled, frameInterval, isActive])

  return (
    <article className="panel panel-wide kim-vision-panel">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Panel 09</p>
          <h2>KIM Vision</h2>
        </div>
        <span className="panel-badge">{enabled && isActive ? 'Sampling' : 'Standby'}</span>
      </div>

      <video aria-hidden="true" className="kim-vision-hidden-video" muted playsInline ref={videoRef} />

      <div className="kim-vision-console">
        <div>
          <strong>{isActive ? 'Camera feed available' : 'Camera required'}</strong>
          <span>{effectiveStatus}</span>
        </div>
        <label className="camera-toggle">
          <input checked={enabled && isActive} disabled={!isActive} onChange={(event) => setEnabled(event.target.checked)} type="checkbox" />
          <span>Analyze</span>
        </label>
      </div>

      <div className="kim-vision-controls">
        <label htmlFor="kim-vision-mode">
          <span>Analysis mode</span>
          <select id="kim-vision-mode" onChange={(event) => setVisionMode(event.target.value as VisionMode)} value={visionMode}>
            <option value="gpuServer">Local GPU Server</option>
            <option value="moondream">Local Moondream</option>
            <option value="proxy">Proxy endpoint</option>
            <option value="stats">Local stats only</option>
          </select>
        </label>
        <label htmlFor="kim-vision-interval">
          <span>Watch interval</span>
          <input
            id="kim-vision-interval"
            min={60}
            onChange={(event) => setFrameInterval(Number(event.target.value))}
            step={20}
            type="number"
            value={frameInterval}
          />
        </label>
        <label htmlFor="kim-vision-threshold">
          <span>Motion trigger</span>
          <input
            id="kim-vision-threshold"
            max={60}
            min={6}
            onChange={(event) => setMotionThreshold(Number(event.target.value))}
            step={1}
            type="number"
            value={motionThreshold}
          />
        </label>
        <label htmlFor="kim-vision-cooldown">
          <span>Cooldown seconds</span>
          <input
            id="kim-vision-cooldown"
            max={600}
            min={15}
            onChange={(event) => setCooldownSeconds(Number(event.target.value))}
            step={5}
            type="number"
            value={cooldownSeconds}
          />
        </label>
        <label className="camera-toggle kim-vision-deep-auto">
          <input checked={deepAutoEnabled} onChange={(event) => setDeepAutoEnabled(event.target.checked)} type="checkbox" />
          <span>Deep auto</span>
        </label>
        <label htmlFor="kim-vision-model">
          <span>HF model</span>
          <input
            disabled={visionMode !== 'moondream'}
            id="kim-vision-model"
            onChange={(event) => setModelId(event.target.value)}
            placeholder={defaultMoondreamModelId}
            type="text"
            value={modelId}
          />
        </label>
        {visionMode === 'gpuServer' ? (
          <label htmlFor="kim-vision-gpu-endpoint">
            <span>GPU server</span>
            <input
              id="kim-vision-gpu-endpoint"
              onChange={(event) => setGpuEndpoint(event.target.value)}
              placeholder={defaultGpuEndpoint}
              type="url"
              value={gpuEndpoint}
            />
          </label>
        ) : null}
        {visionMode === 'proxy' ? (
          <label htmlFor="kim-vision-endpoint">
            <span>Vision endpoint</span>
            <input
              id="kim-vision-endpoint"
              onChange={(event) => setEndpoint(event.target.value)}
              placeholder="Proxy endpoint for KIM vision"
              type="url"
              value={endpoint}
            />
          </label>
        ) : null}
      </div>

      <div className="camera-actions">
        <button
          disabled={visionMode !== 'moondream' || modelStatus.stage === 'loading' || modelStatus.stage === 'analyzing'}
          onClick={() => void loadMoondream(modelId.trim() || defaultMoondreamModelId, setModelStatus).catch((error: unknown) => {
            setModelStatus({ detail: error instanceof Error ? error.message : 'Moondream failed to load.', stage: 'error' })
          })}
          type="button"
        >
          {modelStatus.stage === 'loading' ? 'Loading model...' : 'Load model'}
        </button>
        <button disabled={!isActive || isSending} onClick={() => void captureAndAssess('manual', true)} type="button">
          {isSending ? 'Assessing...' : 'Analyze now'}
        </button>
        <button disabled={visionMode !== 'gpuServer'} onClick={() => void refreshGpuServerHealth()} type="button">
          Check server
        </button>
        <button disabled={assessments.length === 0} onClick={() => setAssessments([])} type="button">
          Clear log
        </button>
      </div>

      <div className={`kim-vision-model-status ${modelStatus.stage}`}>
        <strong>{visionMode === 'gpuServer' ? 'Local GPU server' : visionMode === 'moondream' ? 'Browser model' : visionMode === 'proxy' ? 'Remote endpoint' : 'Cost-free stats'}</strong>
        <span>{visionMode === 'moondream'
          ? deepAutoEnabled
            ? `${modelStatus.detail} Automatic changes can run Moondream.`
            : `${modelStatus.detail} Automatic changes log fast; Analyze now runs Moondream.`
          : visionMode === 'gpuServer'
            ? `${gpuServerStatus} Automatic changes ${deepAutoEnabled ? 'can call' : 'log fast; Analyze now calls'} ${gpuEndpoint || defaultGpuEndpoint}.`
          : visionMode === 'proxy'
            ? 'Snapshots are sent only to the configured proxy endpoint.'
            : 'No image leaves the browser; only brightness and motion are computed.'}</span>
      </div>

      <div className="kim-vision-feed">
        {assessments.length === 0 ? (
          <p>No assessments yet. Start the camera, enable analysis, or click Analyze now.</p>
        ) : assessments.map((assessment) => (
          <div data-kind={assessment.kind || 'observation'} key={assessment.timestamp}>
            <strong>{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(assessment.timestamp))}</strong>
            <p>{assessment.note}</p>
            <span>{assessment.trigger} · Light {assessment.brightness}% · Motion {assessment.motion == null ? 'baseline' : `${assessment.motion}%`}</span>
          </div>
        ))}
      </div>
    </article>
  )
}
