import type { KimConfig } from '../config'

type KIMAvatarProps = {
  cameraActive: boolean
  commandMode: boolean
  config: KimConfig
  listening: boolean
  onSleep: () => void
  onSkip: () => void
  onWake: () => void
  presenceDetected: boolean
  speaking: boolean
  status: string
}

export function KIMAvatar({ cameraActive, commandMode, config, listening, onSleep, onSkip, onWake, presenceDetected, speaking, status }: KIMAvatarProps) {
  const state = !config.micEnabled && !config.cameraEnabled ? 'standby' : speaking ? 'speaking' : commandMode || listening ? 'listening' : presenceDetected ? 'aware' : 'idle'

  return (
    <aside className="kim-avatar-shell" data-state={state} aria-label="KIM avatar">
      <div className="kim-privacy-dots" aria-label="KIM sensor status">
        <span data-active={config.micEnabled} title="Microphone" />
        <span data-active={cameraActive} title="Camera" />
      </div>
      <svg className="kim-avatar" viewBox="0 0 170 220" role="img" aria-label="KIM hologram avatar">
        <defs>
          <filter id="kim-glow">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="kim-skin" cx="48%" cy="40%" r="64%">
            <stop offset="0%" stopColor="#bdf8ff" stopOpacity="0.54" />
            <stop offset="45%" stopColor="#52cfff" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#123461" stopOpacity="0.18" />
          </radialGradient>
          <radialGradient id="kim-eye-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="48%" stopColor="#cfffff" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.12" />
          </radialGradient>
        </defs>
        <path className="kim-head-shell" d="M44 84 C44 38, 61 18, 85 18 C109 18, 126 38, 126 84 C126 126, 109 156, 85 160 C61 156, 44 126, 44 84 Z" />
        <ellipse className="kim-eye" cx="68" cy="88" rx="10" ry="4.6" />
        <ellipse className="kim-eye" cx="103" cy="88" rx="10" ry="4.6" />
      </svg>
      <div className="kim-avatar-panel">
        <strong>KIM</strong>
        <span>{status}</span>
        <div className="kim-avatar-actions">
          <button onClick={onSkip} type="button">Skip</button>
          <button onClick={commandMode ? onSleep : onWake} type="button">{commandMode ? 'Cancel' : state === 'standby' ? 'Wake' : 'Command'}</button>
        </div>
      </div>
    </aside>
  )
}
