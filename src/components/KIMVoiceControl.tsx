import { useEffect, useRef, useState } from 'react'
import type { KimConfig } from '../config'

type SpeechRecognitionAlternative = {
  transcript: string
}

type SpeechRecognitionResult = {
  0: SpeechRecognitionAlternative
  isFinal: boolean
}

type SpeechRecognitionEvent = {
  results: ArrayLike<SpeechRecognitionResult>
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onend: (() => void) | null
  onerror: (() => void) | null
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  start: () => void
  stop: () => void
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition
}

type KIMVoiceControlProps = {
  config: KimConfig
  listeningAllowed: boolean
  onCommand: (text: string) => void
  onListeningChange: (listening: boolean) => void
  onStatus: (status: string) => void
}

export function KIMVoiceControl({ config, listeningAllowed, onCommand, onListeningChange, onStatus }: KIMVoiceControlProps) {
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const wakeWordActiveRef = useRef(false)

  useEffect(() => {
    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition
    if (!SpeechRecognition) {
      const timeout = window.setTimeout(() => {
        setSupported(false)
        onStatus('Speech recognition is not available in this browser.')
      }, 0)
      return () => window.clearTimeout(timeout)
    }

    if (!config.micEnabled || !config.wakeWordEnabled || !listeningAllowed) {
      recognitionRef.current?.stop()
      recognitionRef.current = null
      onListeningChange(false)
      return undefined
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    recognition.onresult = (event) => {
      const latest = event.results[event.results.length - 1]
      const transcript = latest?.[0]?.transcript?.trim() ?? ''
      if (!transcript) return
      const lowered = transcript.toLowerCase()
      const wakeWord = config.wakeWord.toLowerCase()
      if (lowered.includes(wakeWord)) {
        wakeWordActiveRef.current = true
        onStatus('KIM is listening.')
        onListeningChange(true)
        const command = lowered.split(wakeWord).pop()?.trim()
        if (command) onCommand(command)
        return
      }
      if (wakeWordActiveRef.current) onCommand(transcript)
    }

    recognition.onerror = () => {
      onStatus('Mic listening paused.')
      onListeningChange(false)
    }

    recognition.onend = () => {
      onListeningChange(false)
      if (config.micEnabled && config.wakeWordEnabled && listeningAllowed) {
        try {
          recognition.start()
        } catch {
          onStatus('Mic restart blocked by browser permissions.')
        }
      }
    }

    try {
      recognition.start()
      onStatus('Wake word armed.')
      onListeningChange(true)
    } catch {
      onStatus('Mic permission required.')
      onListeningChange(false)
    }

    return () => {
      recognition.stop()
      recognitionRef.current = null
      onListeningChange(false)
    }
  }, [config.micEnabled, config.wakeWord, config.wakeWordEnabled, listeningAllowed, onCommand, onListeningChange, onStatus])

  if (supported) return null
  return <span className="kim-support-warning">SpeechRecognition unavailable</span>
}
