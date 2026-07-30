import { createContext, useContext } from 'react'

export type CameraDevice = {
  deviceId: string
  label: string
}

export type CameraContextValue = {
  attachVideo: (video: HTMLVideoElement | null) => void
  devices: CameraDevice[]
  isActive: boolean
  isMirrored: boolean
  selectedDeviceId: string
  setIsMirrored: (value: boolean) => void
  setSelectedDeviceId: (deviceId: string) => void
  startCamera: (deviceId?: string) => Promise<void>
  status: string
  stopCamera: () => void
  stream: MediaStream | null
}

export const CameraContext = createContext<CameraContextValue | null>(null)

export function useCamera() {
  const context = useContext(CameraContext)
  if (!context) throw new Error('useCamera must be used inside CameraProvider')
  return context
}
