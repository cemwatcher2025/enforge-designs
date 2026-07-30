import { useCallback, useEffect, useRef, useState } from 'react'
import { useCamera } from '../context/cameraContext'

type VisionAssessment = {
  brightness: number
  motion: number | null
  note: string
  timestamp: string
}

const endpointStorageKey = 'enforge-kim-vision-endpoint'
const defaultVisionEndpoint = import.meta.env.VITE_KIM_VISION_ENDPOINT
  || (import.meta.env.VITE_COMMAND_CENTER_PROXY_URL
    ? `${String(import.meta.env.VITE_COMMAND_CENTER_PROXY_URL).replace(/\/$/, '')}/api/kim/vision`
    : '')

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

async function postVisionAssessment(endpoint: string, imageDataUrl: string, metadata: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    body: JSON.stringify({
      imageDataUrl,
      metadata,
      prompt: 'Assess this dashboard camera snapshot briefly. Focus on posture, presence, workspace state, lighting, and whether Brandon appears actively working. Do not identify private text on screen.',
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = await response.json().catch(() => ({})) as { assessment?: string; summary?: string; error?: string }
  if (!response.ok) throw new Error(payload.error || `Vision endpoint returned ${response.status}`)
  return payload.assessment || payload.summary || 'KIM received the frame but did not return a text assessment.'
}

export function KimVisionPanel() {
  const { attachVideo, isActive, isMirrored } = useCamera()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null)
  const frameCountRef = useRef(0)
  const [enabled, setEnabled] = useState(false)
  const [frameInterval, setFrameInterval] = useState(1000)
  const [endpoint, setEndpoint] = useState(() => window.localStorage.getItem(endpointStorageKey) || defaultVisionEndpoint)
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState('Waiting for camera.')
  const [assessments, setAssessments] = useState<VisionAssessment[]>([])
  const effectiveStatus = !isActive
    ? 'Waiting for camera.'
    : enabled
      ? `KIM is sampling every ${frameInterval.toLocaleString()} frames.`
      : status

  const captureAndAssess = useCallback(async () => {
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
      const timestamp = new Date().toISOString()
      let note = localNote(brightness, motion)

      if (endpoint.trim()) {
        note = await postVisionAssessment(endpoint.trim(), canvas.toDataURL('image/jpeg', 0.68), {
          brightness,
          frameCount: frameCountRef.current,
          height,
          motion,
          timestamp,
          width,
        })
      }

      setAssessments((current) => [{ brightness, motion, note, timestamp }, ...current].slice(0, 6))
      setStatus(endpoint.trim() ? 'KIM assessment received.' : 'Local frame stats captured. Add an endpoint for KIM assessment.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Vision assessment failed.')
    } finally {
      setIsSending(false)
    }
  }, [endpoint, isMirrored, isSending])

  useEffect(() => {
    if (videoRef.current) attachVideo(videoRef.current)
  }, [attachVideo, isActive])

  useEffect(() => {
    window.localStorage.setItem(endpointStorageKey, endpoint)
  }, [endpoint])

  useEffect(() => {
    if (!enabled || !isActive) return undefined
    let cancelled = false
    let requestId = 0

    function tick() {
      if (cancelled) return
      frameCountRef.current += 1
      if (frameCountRef.current % frameInterval === 0) void captureAndAssess()
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
        <label htmlFor="kim-vision-interval">
          <span>Frame interval</span>
          <input
            id="kim-vision-interval"
            min={120}
            onChange={(event) => setFrameInterval(Number(event.target.value))}
            step={20}
            type="number"
            value={frameInterval}
          />
        </label>
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
      </div>

      <div className="camera-actions">
        <button disabled={!isActive || isSending} onClick={() => void captureAndAssess()} type="button">
          {isSending ? 'Assessing...' : 'Analyze now'}
        </button>
      </div>

      <div className="kim-vision-feed">
        {assessments.length === 0 ? (
          <p>No assessments yet. Start the camera, enable analysis, or click Analyze now.</p>
        ) : assessments.map((assessment) => (
          <div key={assessment.timestamp}>
            <strong>{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(assessment.timestamp))}</strong>
            <p>{assessment.note}</p>
            <span>Light {assessment.brightness}% · Motion {assessment.motion == null ? 'baseline' : `${assessment.motion}%`}</span>
          </div>
        ))}
      </div>
    </article>
  )
}
