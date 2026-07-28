import type { KimConfig } from '../config'

type KIMSettingsProps = {
  config: KimConfig
  onChange: (config: KimConfig) => void
}

export function KIMSettings({ config, onChange }: KIMSettingsProps) {
  return (
    <article className="panel admin-panel-card kim-settings-card">
      <div className="panel-heading compact">
        <div>
          <p className="eyebrow">KIM</p>
          <h2>Avatar + Room Awareness</h2>
        </div>
      </div>
      <div className="editable-list">
        <label className="toggle-row">
          <input checked={config.voiceEnabled} onChange={(event) => onChange({ ...config, voiceEnabled: event.target.checked })} type="checkbox" />
          <span>Voice enabled</span>
        </label>
        <label className="toggle-row">
          <input checked={config.wakeWordEnabled} onChange={(event) => onChange({ ...config, wakeWordEnabled: event.target.checked })} type="checkbox" />
          <span>Wake word enabled</span>
        </label>
        <label className="toggle-row">
          <input checked={config.micEnabled} onChange={(event) => onChange({ ...config, micEnabled: event.target.checked })} type="checkbox" />
          <span>Mic enabled</span>
        </label>
        <label className="toggle-row">
          <input checked={config.cameraEnabled} onChange={(event) => onChange({ ...config, cameraEnabled: event.target.checked })} type="checkbox" />
          <span>Camera presence</span>
        </label>
        <label className="admin-field">
          Wake word
          <input aria-label="KIM wake word" onChange={(event) => onChange({ ...config, wakeWord: event.target.value })} value={config.wakeWord} />
        </label>
        <label className="admin-field">
          ElevenLabs voice ID
          <input aria-label="ElevenLabs voice ID" onChange={(event) => onChange({ ...config, elevenLabsVoiceId: event.target.value })} value={config.elevenLabsVoiceId} />
        </label>
        <label className="admin-field">
          ElevenLabs API key
          <input
            aria-label="ElevenLabs API key"
            onChange={(event) => onChange({ ...config, elevenLabsApiKey: event.target.value })}
            placeholder="Stored in this browser only"
            type="password"
            value={config.elevenLabsApiKey}
          />
        </label>
      </div>
      <p className="panel-note">Mic and camera permissions are browser-controlled. Camera frames are processed in memory only and are not saved or uploaded.</p>
    </article>
  )
}
