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
          <linearGradient id="kim-line" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#b9f9ff" />
            <stop offset="52%" stopColor="#00e5ff" />
            <stop offset="100%" stopColor="#3d5cff" />
          </linearGradient>
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
        <ellipse className="kim-halo" cx="85" cy="199" rx="46" ry="7" />
        <path className="kim-neck" d="M71 149 C69 170, 66 190, 58 207 M99 149 C101 170, 104 190, 112 207" />
        <path className="kim-head-shell" d="M44 82 C44 36, 61 16, 85 16 C109 16, 126 36, 126 82 C126 123, 109 154, 85 158 C61 154, 44 123, 44 82 Z" />
        <path className="kim-cranium" d="M50 68 C57 30, 70 20, 85 20 C100 20, 113 30, 120 68" />
        <path className="kim-ear" d="M43 82 C32 84, 34 111, 47 116" />
        <path className="kim-ear" d="M127 82 C138 84, 136 111, 123 116" />
        <path className="kim-brow" d="M54 78 C62 70, 73 70, 79 77" />
        <path className="kim-brow" d="M91 77 C98 70, 109 70, 117 78" />
        <path className="kim-eye-socket" d="M55 88 C62 81, 75 82, 80 88 C74 96, 61 96, 55 88 Z" />
        <path className="kim-eye-socket" d="M90 88 C96 82, 109 81, 116 88 C110 96, 97 96, 90 88 Z" />
        <ellipse className="kim-eye" cx="68" cy="88" rx="10" ry="4.6" />
        <ellipse className="kim-eye" cx="103" cy="88" rx="10" ry="4.6" />
        <path className="kim-nose-plane" d="M85 86 C82 103, 76 115, 78 124 C82 128, 88 128, 92 124 C94 115, 88 103, 85 86 Z" />
        <path className="kim-mouth-plane" d="M69 139 C77 144, 94 144, 102 139" />
        <path className="kim-cheek" d="M53 104 C63 117, 72 120, 80 123" />
        <path className="kim-cheek" d="M117 104 C107 117, 98 120, 90 123" />
        <g className="kim-circuitry">
          <path d="M85 27 L85 55 L78 63 L78 77" />
          <path d="M67 36 L70 56 L61 67" />
          <path d="M103 36 L100 56 L109 67" />
          <path d="M55 112 L71 117 L78 132" />
          <path d="M115 112 L99 117 L92 132" />
          <circle cx="65" cy="53" r="1.8" />
          <circle cx="105" cy="53" r="1.8" />
          <circle cx="73" cy="121" r="1.4" />
          <circle cx="97" cy="121" r="1.4" />
        </g>
        <g className="kim-scan-lines">
          <path d="M49 61 C70 55, 100 55, 121 61" />
          <path d="M47 105 C68 114, 102 114, 123 105" />
          <path d="M59 144 C75 151, 95 151, 111 144" />
        </g>
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
