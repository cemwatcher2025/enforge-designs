import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CameraContext, type CameraContextValue, type CameraDevice } from './cameraContext'

function mediaSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia)
}

export function CameraProvider({ children }: { children: ReactNode }) {
  const streamRef = useRef<MediaStream | null>(null)
  const videoElementsRef = useRef(new Set<HTMLVideoElement>())
  const [devices, setDevices] = useState<CameraDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [isMirrored, setIsMirrored] = useState(true)
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState('Camera is off. Start preview when you want a local view.')
  const [stream, setStream] = useState<MediaStream | null>(null)

  const loadDevices = useCallback(async () => {
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
  }, [])

  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return
    videoElementsRef.current.add(video)
    video.srcObject = streamRef.current
    if (streamRef.current) void video.play()
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    videoElementsRef.current.forEach((video) => {
      video.srcObject = null
    })
    setStream(null)
    setIsActive(false)
    setStatus('Camera is off. Preview stopped locally.')
  }, [])

  const startCamera = useCallback(async (deviceId = selectedDeviceId) => {
    if (!mediaSupported()) {
      setStatus('This browser does not support camera preview.')
      return
    }

    try {
      stopCamera()
      setStatus('Requesting camera permission...')
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' },
      })
      streamRef.current = nextStream
      setStream(nextStream)
      videoElementsRef.current.forEach((video) => {
        video.srcObject = nextStream
        void video.play()
      })
      setIsActive(true)
      setStatus('Live local camera preview. Nothing is recorded or uploaded.')
      await loadDevices()
    } catch (error) {
      setIsActive(false)
      setStream(null)
      setStatus(error instanceof Error ? error.message : 'Camera preview failed to start.')
    }
  }, [loadDevices, selectedDeviceId, stopCamera])

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
  }, [loadDevices, stopCamera])

  const value = useMemo<CameraContextValue>(() => ({
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
    stream,
  }), [attachVideo, devices, isActive, isMirrored, selectedDeviceId, startCamera, status, stopCamera, stream])

  return <CameraContext.Provider value={value}>{children}</CameraContext.Provider>
}
