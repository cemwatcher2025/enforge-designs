import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../context/cameraContext'

export function CameraPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [snapshotStatus, setSnapshotStatus] = useState('')
  const {
    attachVideo,
    devices,
    isActive,
    isMirrored,
    selectedDeviceId,
    setIsMirrored,
    setSelectedDeviceId,
    startCamera,
    status,
    stopCamera,
  } = useCamera()

  function captureSnapshot() {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      setSnapshotStatus('Camera frame is not ready yet.')
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
    setSnapshotStatus('Snapshot downloaded locally.')
  }

  useEffect(() => {
    if (videoRef.current) attachVideo(videoRef.current)
  }, [attachVideo, isActive])

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
      {snapshotStatus ? <p className="camera-status">{snapshotStatus}</p> : null}
    </article>
  )
}
