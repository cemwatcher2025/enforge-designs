import type { Sandbox3DConfig, SandboxPresetId } from '../config'

export type SceneObjectInfo = {
  id: string
  name: string
  type: string
}

export type TransformMode = 'translate' | 'rotate' | 'scale'

type Sandbox3DControlsProps = {
  axesVisible: boolean
  canAnimate: boolean
  isLoading: boolean
  isPlaying: boolean
  modelUrl: string
  objects: SceneObjectInfo[]
  preset: SandboxPresetId
  sandboxConfig: Sandbox3DConfig
  selectedObjectId: string | null
  timeline: number
  transformMode: TransformMode
  wireframe: boolean
  onAxesChange: (visible: boolean) => void
  onClearScene: () => void
  onFileLoad: (file: File) => void
  onModelUrlChange: (url: string) => void
  onPresetChange: (preset: SandboxPresetId) => void
  onSaveScene: () => void
  onScreenshot: () => void
  onSelectObject: (id: string | null) => void
  onTimelineChange: (value: number) => void
  onTogglePlayback: () => void
  onTransformModeChange: (mode: TransformMode) => void
  onUrlLoad: () => void
  onWireframeChange: (wireframe: boolean) => void
  onResetCamera: () => void
}

export function Sandbox3DControls({
  axesVisible,
  canAnimate,
  isLoading,
  isPlaying,
  modelUrl,
  objects,
  preset,
  sandboxConfig,
  selectedObjectId,
  timeline,
  transformMode,
  wireframe,
  onAxesChange,
  onClearScene,
  onFileLoad,
  onModelUrlChange,
  onPresetChange,
  onSaveScene,
  onScreenshot,
  onSelectObject,
  onTimelineChange,
  onTogglePlayback,
  onTransformModeChange,
  onUrlLoad,
  onWireframeChange,
  onResetCamera,
}: Sandbox3DControlsProps) {
  return (
    <aside className="sandbox-controls" aria-label="3D sandbox controls">
      <section className="sandbox-control-section">
        <div className="sandbox-section-heading">
          <strong>Load</strong>
          {isLoading && <span className="sandbox-spinner" aria-label="Loading model" />}
        </div>
        <div className="sandbox-url-row">
          <input
            aria-label="GLB or GLTF model URL"
            onChange={(event) => onModelUrlChange(event.target.value)}
            placeholder="https://example.com/model.glb"
            type="url"
            value={modelUrl}
          />
          <button onClick={onUrlLoad} type="button">Load URL</button>
        </div>
        <label className="sandbox-file-picker">
          <input
            accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onFileLoad(file)
              event.currentTarget.value = ''
            }}
            type="file"
          />
          Browse local model
        </label>
      </section>

      <section className="sandbox-control-section">
        <strong>Preset scenes</strong>
        <div className="sandbox-button-grid">
          {sandboxConfig.presets.map((scene) => (
            <button
              data-active={preset === scene.id}
              key={scene.id}
              onClick={() => onPresetChange(scene.id)}
              title={scene.detail}
              type="button"
            >
              {scene.name}
            </button>
          ))}
        </div>
      </section>

      <section className="sandbox-control-section">
        <strong>Demo models</strong>
        <div className="sandbox-button-grid">
          {sandboxConfig.demoModels.map((model) => (
            <button key={model.id} onClick={() => onPresetChange(model.preset)} title={model.detail} type="button">
              {model.name}
            </button>
          ))}
        </div>
      </section>

      <section className="sandbox-control-section">
        <strong>Scene controls</strong>
        <div className="sandbox-toggle-grid">
          <label>
            <input checked={wireframe} onChange={(event) => onWireframeChange(event.target.checked)} type="checkbox" />
            Wireframe
          </label>
          <label>
            <input checked={axesVisible} onChange={(event) => onAxesChange(event.target.checked)} type="checkbox" />
            Axes
          </label>
        </div>
        <div className="sandbox-button-grid">
          <button onClick={onResetCamera} type="button">Reset Camera</button>
          <button onClick={onScreenshot} type="button">Screenshot</button>
          <button onClick={onSaveScene} type="button">Save Scene</button>
          <button onClick={onClearScene} type="button">Empty Grid</button>
        </div>
      </section>

      <section className="sandbox-control-section">
        <strong>Animation</strong>
        <button disabled={!canAnimate} onClick={onTogglePlayback} type="button">
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <input
          aria-label="Animation timeline"
          disabled={!canAnimate}
          max="1"
          min="0"
          onChange={(event) => onTimelineChange(Number(event.target.value))}
          step="0.01"
          type="range"
          value={timeline}
        />
      </section>

      <section className="sandbox-control-section sandbox-objects">
        <strong>Scene objects</strong>
        <div className="sandbox-object-list">
          <button data-active={!selectedObjectId} onClick={() => onSelectObject(null)} type="button">Scene root</button>
          {objects.map((object) => (
            <button
              data-active={selectedObjectId === object.id}
              key={object.id}
              onClick={() => onSelectObject(object.id)}
              type="button"
            >
              <span>{object.name}</span>
              <em>{object.type}</em>
            </button>
          ))}
        </div>
        <div className="sandbox-transform-modes" role="group" aria-label="Transform mode">
          <button data-active={transformMode === 'translate'} onClick={() => onTransformModeChange('translate')} type="button">Move</button>
          <button data-active={transformMode === 'rotate'} onClick={() => onTransformModeChange('rotate')} type="button">Rotate</button>
          <button data-active={transformMode === 'scale'} onClick={() => onTransformModeChange('scale')} type="button">Scale</button>
        </div>
      </section>
    </aside>
  )
}
