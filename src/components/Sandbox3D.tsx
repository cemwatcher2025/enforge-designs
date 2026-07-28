import { useMemo, useState } from 'react'
import type { Sandbox3DConfig, SandboxPresetId, WorldEngineConfig } from '../config'
import { Sandbox3DControls, type SceneObjectInfo, type TransformMode } from './Sandbox3DControls'
import { Sandbox3DScene, type ModelRequest } from './Sandbox3DScene'
import { WorldEngine } from './WorldEngine'

type Sandbox3DProps = {
  sandboxConfig: Sandbox3DConfig
  worldConfig: WorldEngineConfig
}

export function Sandbox3D({ sandboxConfig, worldConfig }: Sandbox3DProps) {
  const [axesVisible, setAxesVisible] = useState(true)
  const [canAnimate, setCanAnimate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [mode, setMode] = useState<'sandbox' | 'world'>('sandbox')
  const [modelRequest, setModelRequest] = useState<ModelRequest | null>(null)
  const [modelUrl, setModelUrl] = useState('')
  const [objects, setObjects] = useState<SceneObjectInfo[]>([])
  const [preset, setPreset] = useState<SandboxPresetId>('primitives')
  const [resetSignal, setResetSignal] = useState(0)
  const [saveSignal, setSaveSignal] = useState(0)
  const [screenshotSignal, setScreenshotSignal] = useState(0)
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [status, setStatus] = useState('Primitives scene ready.')
  const [timeline, setTimeline] = useState(0)
  const [transformMode, setTransformMode] = useState<TransformMode>('translate')
  const [wireframe, setWireframe] = useState(false)

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  )

  function handleStatus(nextStatus: string, loading = false) {
    setStatus(nextStatus)
    setIsLoading(loading)
  }

  function loadUrl() {
    const url = modelUrl.trim()
    if (!url) {
      setStatus('Paste a .glb or .gltf URL first.')
      return
    }
    setModelRequest({ id: Date.now(), source: url, type: 'url' })
  }

  function loadFile(file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (extension !== 'glb' && extension !== 'gltf') {
      setStatus('Only .glb and .gltf files are supported in this sandbox.')
      return
    }
    setModelRequest({ id: Date.now(), source: URL.createObjectURL(file), type: 'file' })
  }

  function loadEmptyGrid() {
    setPreset('empty-grid')
    setSelectedObjectId(null)
  }

  function handleAnimationState(nextCanAnimate: boolean, nextTimeline: number) {
    setCanAnimate(nextCanAnimate)
    if (!nextCanAnimate) {
      setIsPlaying(false)
      setTimeline(0)
      return
    }
    setTimeline(Number.isFinite(nextTimeline) ? Math.max(0, Math.min(1, nextTimeline)) : 0)
  }

  return (
    <article
      className="panel panel-full sandbox3d-panel"
      onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files?.[0]
        if (file) loadFile(file)
      }}
    >
      <div className="panel-heading compact sandbox-heading">
        <div>
          <p className="eyebrow">Panel 06</p>
          <h2>{mode === 'world' ? 'World Engine' : '3D Sandbox'}</h2>
        </div>
        <div className="sandbox-mode-toggle" role="group" aria-label="3D mode">
          <button data-active={mode === 'sandbox'} onClick={() => setMode('sandbox')} type="button">Sandbox</button>
          <button data-active={mode === 'world'} onClick={() => setMode('world')} type="button">World</button>
        </div>
      </div>

      {mode === 'world' ? (
        <WorldEngine config={worldConfig} />
      ) : <div className="sandbox-layout">
        <div className="sandbox-viewport">
          <Sandbox3DScene
            axesVisible={axesVisible}
            isPlaying={isPlaying}
            modelRequest={modelRequest}
            onAnimationState={handleAnimationState}
            onObjectsChange={setObjects}
            onSelectObject={setSelectedObjectId}
            onStatus={handleStatus}
            preset={preset}
            resetSignal={resetSignal}
            saveSignal={saveSignal}
            screenshotSignal={screenshotSignal}
            selectedObjectId={selectedObjectId}
            timeline={timeline}
            transformMode={transformMode}
            wireframe={wireframe}
          />
          <div className="sandbox-hud">
            <strong>{selectedObject ? selectedObject.name : 'Scene root'}</strong>
            <span>{status}</span>
          </div>
        </div>

        <Sandbox3DControls
          axesVisible={axesVisible}
          canAnimate={canAnimate}
          isLoading={isLoading}
          isPlaying={isPlaying}
          modelUrl={modelUrl}
          objects={objects}
          onAxesChange={setAxesVisible}
          onClearScene={loadEmptyGrid}
          onFileLoad={loadFile}
          onModelUrlChange={setModelUrl}
          onPresetChange={(nextPreset) => {
            setPreset(nextPreset)
            setSelectedObjectId(null)
          }}
          onResetCamera={() => setResetSignal((value) => value + 1)}
          onSaveScene={() => setSaveSignal((value) => value + 1)}
          onScreenshot={() => setScreenshotSignal((value) => value + 1)}
          onSelectObject={setSelectedObjectId}
          onTimelineChange={(value) => setTimeline(Math.max(0, Math.min(1, value)))}
          onTogglePlayback={() => setIsPlaying((value) => !value)}
          onTransformModeChange={setTransformMode}
          onUrlLoad={loadUrl}
          onWireframeChange={setWireframe}
          preset={preset}
          sandboxConfig={sandboxConfig}
          selectedObjectId={selectedObjectId}
          timeline={timeline}
          transformMode={transformMode}
          wireframe={wireframe}
        />
      </div>}
    </article>
  )
}
