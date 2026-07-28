import { useEffect } from 'react'
import { usePresence } from '../hooks/usePresence'

type KIMPresenceProps = {
  enabled: boolean
  onPresenceChange: (present: boolean, cameraActive: boolean, error: string) => void
  onPresenceReturn: () => void
}

export function KIMPresence({ enabled, onPresenceChange, onPresenceReturn }: KIMPresenceProps) {
  const presence = usePresence({ enabled, onPresenceReturn })

  useEffect(() => {
    onPresenceChange(presence.present, presence.cameraActive, presence.error)
  }, [onPresenceChange, presence.cameraActive, presence.error, presence.present])

  return null
}
