import { useEffect, useRef, useState } from 'react'

type CameraDevice = {
  deviceId: string
  label: string
}

function mediaSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia)
}

export function CameraPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [isMirrored, setIsMirrored] = useState(true)
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState('Camera is off. Start preview when you want a local view.')

  async function loadDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return
    const availableDevices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = availableDevices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }))
    setDevices(videoDevices)
    setSelectedDeviceId((current) => current || videoDevices[0]?.deviceId || '')
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsActive(false)
    setStatus('Camera is off. Preview stopped locally.')
  }

  async function startCamera(deviceId = selectedDeviceId) {
    if (!mediaSupported()) {
      setStatus('This browser does not support camera preview.')
      return
    }

    try {
      stopCamera()
      setStatus('Requesting camera permission...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setIsActive(true)
      setStatus('Live local camera preview. Nothing is recorded or uploaded.')
      await loadDevices()
    } catch (error) {
      setIsActive(false)
      setStatus(error instanceof Error ? error.message : 'Camera preview failed to start.')
    }
  }

  function captureSnapshot() {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      setStatus('Camera frame is not ready yet.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) return
    if (isMirrored) {
      context.translate(canvas.width, 0)
      context.scale(-1, 1)
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    const link = document.createElement('a')
    link.download = `enforge-camera-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setStatus('Snapshot downloaded locally.')
  }

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      loadDevices().catch(() => {
        if (!cancelled) setStatus('Camera devices could not be listed yet.')
      })
    }, 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      stopCamera()
    }
  }, [])

  return (
    <article className="panel panel-wide camera-panel">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">Panel 08</p>
          <h2>Studio Camera</h2>
        </div>
        <span className="panel-badge">{isActive ? 'Local live' : 'Private'}</span>
      </div>

      <div className="camera-stage">
        <video
          aria-label="Local camera preview"
          autoPlay
          className={isMirrored ? 'is-mirrored' : ''}
          muted
          playsInline
          ref={videoRef}
        />
        {!isActive ? (
          <div className="camera-placeholder">
            <strong>Camera off</strong>
            <span>Start preview to show your local webcam feed here.</span>
          </div>
        ) : null}
      </div>

      <div className="camera-controls">
        <label htmlFor="camera-device">
          <span>Camera</span>
          <select
            disabled={devices.length === 0}
            id="camera-device"
            onChange={(event) => {
              setSelectedDeviceId(event.target.value)
              if (isActive) void startCamera(event.target.value)
            }}
            value={selectedDeviceId}
          >
            {devices.length === 0 ? <option value="">Default camera</option> : null}
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>{device.label}</option>
            ))}
          </select>
        </label>

        <div className="camera-actions">
          <button onClick={() => void startCamera()} type="button">{isActive ? 'Restart' : 'Start'}</button>
          <button disabled={!isActive} onClick={stopCamera} type="button">Stop</button>
          <button disabled={!isActive} onClick={captureSnapshot} type="button">Snapshot</button>
          <label className="camera-toggle">
            <input checked={isMirrored} onChange={(event) => setIsMirrored(event.target.checked)} type="checkbox" />
            <span>Mirror</span>
          </label>
        </div>
      </div>

      <p className="camera-status">{status}</p>
    </article>
  )
}
