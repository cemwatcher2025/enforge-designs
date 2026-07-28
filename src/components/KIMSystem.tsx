import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AdminConfig, KimConfig } from '../config'
import { runVoiceCommand, type VoiceCommandContext } from '../hooks/useVoiceCommands'
import { KIMAvatar } from './KIMAvatar'
import { KIMPresence } from './KIMPresence'
import { KIMVoice, type KIMVoiceHandle } from './KIMVoice'
import { KIMVoiceControl } from './KIMVoiceControl'

type KIMSystemProps = {
  config: AdminConfig
  dashboardSummary: VoiceCommandContext['dashboardSummary']
  onConfigChange: (config: AdminConfig) => void
  onPrefillMinistryHours: (hours: string, type: string) => void
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function KIMSystem({ config, dashboardSummary, onConfigChange, onPrefillMinistryHours }: KIMSystemProps) {
  const [cameraActive, setCameraActive] = useState(false)
  const [kimStatus, setKimStatus] = useState('KIM idle.')
  const [listening, setListening] = useState(false)
  const [presenceDetected, setPresenceDetected] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const voiceRef = useRef<KIMVoiceHandle | null>(null)

  const kimConfig = config.kim
  const listeningAllowed = kimConfig.micEnabled && kimConfig.wakeWordEnabled && (presenceDetected || !kimConfig.cameraEnabled)

  const updateKimConfig = useCallback((nextKim: KimConfig) => {
    onConfigChange({ ...config, kim: nextKim })
  }, [config, onConfigChange])

  const speak = useCallback((text: string, mode: 'elevenlabs' | 'synthesis' = 'synthesis') => {
    setKimStatus(text)
    voiceRef.current?.speak(text, mode)
  }, [])

  const commandContext = useMemo<VoiceCommandContext>(() => ({
    config,
    dashboardSummary,
    onConfigChange,
    onPrefillMinistryHours,
  }), [config, dashboardSummary, onConfigChange, onPrefillMinistryHours])

  const handleCommand = useCallback((text: string) => {
    const result = runVoiceCommand(text, commandContext)
    if (result.action === 'sleep') {
      updateKimConfig({ ...kimConfig, cameraEnabled: false, micEnabled: false })
    }
    if (result.action === 'wake') {
      updateKimConfig({ ...kimConfig, micEnabled: true })
    }
    speak(result.response, 'synthesis')
  }, [commandContext, kimConfig, speak, updateKimConfig])

  const handlePresenceChange = useCallback((present: boolean, active: boolean, error: string) => {
    setPresenceDetected(present)
    setCameraActive(active)
    if (error) setKimStatus(error)
    else if (!present && kimConfig.cameraEnabled) setKimStatus('KIM standby.')
  }, [kimConfig.cameraEnabled])

  const handlePresenceReturn = useCallback(() => {
    speak('Welcome back Brandon. I am here when you need me.', 'elevenlabs')
  }, [speak])

  useEffect(() => {
    const key = `kim-greeting-${todayKey()}`
    if (window.localStorage.getItem(key)) return
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
    const unread = dashboardSummary.unreadEmails === null ? 'your Gmail connector is not reporting unread email yet' : `${dashboardSummary.unreadEmails} unread emails`
    const timeout = window.setTimeout(() => {
      speak(`${greeting} Brandon. You have ${dashboardSummary.todayMeetings} meetings today and ${unread}.`, 'elevenlabs')
    }, 0)
    window.localStorage.setItem(key, 'true')
    return () => window.clearTimeout(timeout)
  }, [dashboardSummary.todayMeetings, dashboardSummary.unreadEmails, speak])

  useEffect(() => {
    if (window.sessionStorage.getItem('kim-session-returned')) return
    window.sessionStorage.setItem('kim-session-returned', 'true')
  }, [])

  return (
    <>
      <KIMVoice ref={voiceRef} config={kimConfig} onSpeakingChange={setSpeaking} />
      <KIMVoiceControl
        config={kimConfig}
        listeningAllowed={listeningAllowed}
        onCommand={handleCommand}
        onListeningChange={setListening}
        onStatus={setKimStatus}
      />
      <KIMPresence
        enabled={kimConfig.cameraEnabled}
        onPresenceChange={handlePresenceChange}
        onPresenceReturn={handlePresenceReturn}
      />
      <KIMAvatar
        cameraActive={cameraActive}
        config={kimConfig}
        listening={listening}
        onSkip={() => voiceRef.current?.skip()}
        onSleep={() => updateKimConfig({ ...kimConfig, cameraEnabled: false, micEnabled: false })}
        onWake={() => updateKimConfig({ ...kimConfig, micEnabled: true })}
        presenceDetected={presenceDetected}
        speaking={speaking}
        status={kimStatus}
      />
    </>
  )
}
