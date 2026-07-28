import type { KimConfig } from '../config'

type KIMAvatarProps = {
  cameraActive: boolean
  config: KimConfig
  listening: boolean
  onSleep: () => void
  onSkip: () => void
  onWake: () => void
  presenceDetected: boolean
  speaking: boolean
  status: string
}

export function KIMAvatar({ cameraActive, config, listening, onSleep, onSkip, onWake, presenceDetected, speaking, status }: KIMAvatarProps) {
  const state = !config.micEnabled && !config.cameraEnabled ? 'standby' : speaking ? 'speaking' : listening ? 'listening' : presenceDetected ? 'aware' : 'idle'

  return (
    <aside className="kim-avatar-shell" data-state={state} aria-label="KIM avatar">
      <div className="kim-privacy-dots" aria-label="KIM sensor status">
        <span data-active={config.micEnabled} title="Microphone" />
        <span data-active={cameraActive} title="Camera" />
      </div>
      <svg className="kim-avatar" viewBox="0 0 150 200" role="img" aria-label="KIM hologram avatar">
        <defs>
          <filter id="kim-glow">
            <feGaussianBlur stdDeviation="2.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="kim-line" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#b9f9ff" />
            <stop offset="52%" stopColor="#00e5ff" />
            <stop offset="100%" stopColor="#3d5cff" />
          </linearGradient>
        </defs>
        <ellipse className="kim-halo" cx="75" cy="186" rx="45" ry="8" />
        <path className="kim-body" d="M39 174 C47 130, 52 112, 75 112 C98 112, 105 130, 112 174" />
        <path className="kim-shoulders" d="M25 176 C42 154, 52 146, 75 146 C98 146, 110 154, 125 176" />
        <path className="kim-head" d="M44 70 C44 33, 57 17, 75 17 C93 17, 106 33, 106 70 C106 101, 93 121, 75 121 C57 121, 44 101, 44 70 Z" />
        <path className="kim-face-line" d="M75 18 C72 41, 72 89, 75 120" />
        <path className="kim-face-line" d="M48 61 C63 55, 87 55, 102 61" />
        <path className="kim-face-line" d="M50 87 C65 94, 86 94, 100 87" />
        <path className="kim-face-line" d="M54 34 C66 43, 85 43, 97 34" />
        <path className="kim-face-line" d="M52 105 C66 111, 85 111, 98 105" />
        <ellipse className="kim-eye" cx="64" cy="70" rx="6" ry="3.8" />
        <ellipse className="kim-eye" cx="86" cy="70" rx="6" ry="3.8" />
        <g className="kim-scan-lines">
          <line x1="36" x2="114" y1="51" y2="51" />
          <line x1="39" x2="111" y1="78" y2="78" />
          <line x1="45" x2="105" y1="105" y2="105" />
        </g>
      </svg>
      <div className="kim-avatar-panel">
        <strong>KIM</strong>
        <span>{status}</span>
        <div className="kim-avatar-actions">
          <button onClick={onSkip} type="button">Skip</button>
          <button onClick={state === 'standby' ? onWake : onSleep} type="button">{state === 'standby' ? 'Wake' : 'Sleep'}</button>
        </div>
      </div>
    </aside>
  )
}
