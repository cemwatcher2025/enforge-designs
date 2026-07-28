import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { KimConfig } from '../config'

export type KimVoiceMode = 'elevenlabs' | 'synthesis'

export type KIMVoiceHandle = {
  skip: () => void
  speak: (text: string, mode?: KimVoiceMode) => void
}

type KIMVoiceProps = {
  config: KimConfig
  onSpeakingChange: (speaking: boolean) => void
}

type QueueItem = {
  mode: KimVoiceMode
  text: string
}

export const KIMVoice = forwardRef<KIMVoiceHandle, KIMVoiceProps>(({ config, onSpeakingChange }, ref) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingRef = useRef(false)
  const queueRef = useRef<QueueItem[]>([])
  const [status, setStatus] = useState('Voice idle')

  async function playNext() {
    if (playingRef.current) return
    const item = queueRef.current.shift()
    if (!item || !config.voiceEnabled) {
      playingRef.current = false
      onSpeakingChange(false)
      return
    }

    playingRef.current = true
    onSpeakingChange(true)
    setStatus('KIM speaking')

    try {
      if (item.mode === 'elevenlabs' && config.elevenLabsApiKey.trim()) {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoiceId}`, {
          body: JSON.stringify({
            model_id: 'eleven_multilingual_v2',
            text: item.text,
            voice_settings: { similarity_boost: 0.72, stability: 0.48 },
          }),
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': config.elevenLabsApiKey.trim(),
          },
          method: 'POST',
        })
        if (!response.ok) throw new Error(`ElevenLabs returned ${response.status}`)
        const blob = await response.blob()
        const audio = new Audio(URL.createObjectURL(blob))
        audioRef.current = audio
        await audio.play()
        await new Promise<void>((resolve) => {
          audio.onended = () => resolve()
          audio.onerror = () => resolve()
        })
      } else {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(item.text)
        utterance.rate = 0.95
        utterance.pitch = 1.04
        await new Promise<void>((resolve) => {
          utterance.onend = () => resolve()
          utterance.onerror = () => resolve()
          window.speechSynthesis.speak(utterance)
        })
      }
    } catch {
      const utterance = new SpeechSynthesisUtterance(item.text)
      window.speechSynthesis.speak(utterance)
    } finally {
      playingRef.current = false
      audioRef.current = null
      setStatus(queueRef.current.length > 0 ? 'Voice queued' : 'Voice idle')
      onSpeakingChange(queueRef.current.length > 0)
      void playNext()
    }
  }

  useImperativeHandle(ref, () => ({
    skip() {
      audioRef.current?.pause()
      window.speechSynthesis.cancel()
      queueRef.current = []
      playingRef.current = false
      setStatus('Voice skipped')
      onSpeakingChange(false)
    },
    speak(text: string, mode: KimVoiceMode = 'synthesis') {
      if (!text.trim()) return
      queueRef.current.push({ mode, text })
      void playNext()
    },
  }))

  return <span className="kim-voice-status">{status}</span>
})
