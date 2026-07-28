import { useEffect, useRef, useState } from 'react'

type UsePresenceOptions = {
  enabled: boolean
  onPresenceReturn?: () => void
}

export function usePresence({ enabled, onPresenceReturn }: UsePresenceOptions) {
  const [cameraActive, setCameraActive] = useState(false)
  const [error, setError] = useState('')
  const [present, setPresent] = useState(false)
  const lastFrameRef = useRef<ImageData | null>(null)
  const absentFramesRef = useRef(0)
  const presentRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!enabled) {
      const timeout = window.setTimeout(() => {
        setCameraActive(false)
        setPresent(false)
      }, 0)
      lastFrameRef.current = null
      return () => window.clearTimeout(timeout)
    }

    let animationFrame = 0
    let cancelled = false
    let stream: MediaStream | null = null
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    videoRef.current = video

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: 320 } })
        if (cancelled) return
        video.srcObject = stream
        await video.play()
        setCameraActive(true)
        setError('')
        tick()
      } catch (nextError) {
        setCameraActive(false)
        setError(nextError instanceof Error ? nextError.message : 'Camera unavailable.')
      }
    }

    function tick() {
      if (cancelled || !context || video.readyState < 2) {
        animationFrame = window.requestAnimationFrame(tick)
        return
      }

      canvas.width = 96
      canvas.height = 72
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frame = context.getImageData(0, 0, canvas.width, canvas.height)
      const previous = lastFrameRef.current
      let diff = 0

      if (previous) {
        for (let index = 0; index < frame.data.length; index += 16) {
          diff += Math.abs(frame.data[index] - previous.data[index])
        }
        const motion = diff / (frame.data.length / 16)
        const nextPresent = motion > 5
        if (nextPresent) {
          absentFramesRef.current = 0
          if (!presentRef.current) onPresenceReturn?.()
          presentRef.current = true
          setPresent(true)
        } else {
          absentFramesRef.current += 1
          if (absentFramesRef.current > 90) {
            presentRef.current = false
            setPresent(false)
          }
        }
      }

      lastFrameRef.current = frame
      animationFrame = window.requestAnimationFrame(tick)
    }

    void startCamera()

    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrame)
      stream?.getTracks().forEach((track) => track.stop())
      setCameraActive(false)
    }
  }, [enabled, onPresenceReturn])

  return { cameraActive, error, present, videoRef }
}
