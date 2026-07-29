/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { WorldEngineConfig } from '../config'
import { useWorld, type WorldObject } from '../hooks/useWorld'
import { WorldInteraction } from './WorldInteraction'
import { WorldObjectList } from './WorldObjectList'

type WorldEngineProps = {
  config: WorldEngineConfig
}

const threeUrl = 'https://esm.sh/three@0.160.0'
const orbitUrl = 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js'
const gltfUrl = 'https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'

function formatVersion(version: number, modified: string | null) {
  if (!modified) return `v${version}`
  const date = new Date(modified)
  if (Number.isNaN(date.getTime())) return `v${version}`
  return `v${version} · ${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)}`
}

function applyVector(target: any, source: { x: number; y: number; z: number }) {
  target.set(source.x, source.y, source.z)
}

function multiplyVector(target: any, source: { x: number; y: number; z: number }) {
  target.set(target.x * source.x, target.y * source.y, target.z * source.z)
}

export function WorldEngine({ config }: WorldEngineProps) {
  const { error, isLoading, logInteraction, refresh, resetWorld, selectedObjectMap, state } = useWorld()
  const [renderStatus, setRenderStatus] = useState('Loading persistent world...')
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [flashObjectId, setFlashObjectId] = useState<string | null>(null)
  const mountRef = useRef<HTMLDivElement | null>(null)
  const labelsRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<Record<string, any> | null>(null)

  const selectedObject = useMemo(
    () => selectedObjectId ? selectedObjectMap.get(selectedObjectId) ?? null : null,
    [selectedObjectId, selectedObjectMap],
  )

  async function handleInteract(object: WorldObject) {
    setFlashObjectId(object.id)
    setRenderStatus(`${object.interactionType} logged for ${object.name}.`)
    await logInteraction(object.id, object.interactionType)
    window.setTimeout(() => setFlashObjectId(null), 520)
  }

  function handleResetWorld() {
    if (!window.confirm('Reset the persistent world? This removes all world objects and interactions.')) return
    setSelectedObjectId(null)
    void resetWorld()
  }

  useEffect(() => {
    let disposed = false
    const mount = mountRef.current
    const labels = labelsRef.current
    if (!mount || !labels) return undefined

    async function initWorld() {
      try {
        const [THREE, orbitModule, gltfModule] = await Promise.all([
          import(/* @vite-ignore */ threeUrl),
          import(/* @vite-ignore */ orbitUrl),
          import(/* @vite-ignore */ gltfUrl),
        ])
        const container = mountRef.current
        const labelContainer = labelsRef.current
        if (disposed || !container || !labelContainer) return
        const safeContainer: HTMLDivElement = container
        const safeLabelContainer: HTMLDivElement = labelContainer

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x040710)
        scene.fog = new THREE.Fog(0x040710, 18, 70)

        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(safeContainer.clientWidth, safeContainer.clientHeight)
        safeContainer.appendChild(renderer.domElement)

        const camera = new THREE.PerspectiveCamera(48, safeContainer.clientWidth / safeContainer.clientHeight, 0.1, 1000)
        camera.position.set(9, 7, 11)

        const controls = new orbitModule.OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.target.set(0, 1, 0)

        const root = new THREE.Group()
        root.name = 'Persistent World'
        scene.add(root)

        const grid = new THREE.GridHelper(40, 40, 0x00e5ff, 0x17324b)
        scene.add(grid)
        const axes = new THREE.AxesHelper(4)
        axes.visible = false
        scene.add(axes)

        scene.add(new THREE.HemisphereLight(0xc8f7ff, 0x07101e, 1.8))
        const key = new THREE.DirectionalLight(0xffffff, 2.2)
        key.position.set(7, 10, 6)
        scene.add(key)
        const rim = new THREE.PointLight(0xff2fb3, 18, 28)
        rim.position.set(-8, 5, -7)
        scene.add(rim)

        const raycaster = new THREE.Raycaster()
        const pointer = new THREE.Vector2()
        const loader = new gltfModule.GLTFLoader()

        const runtime: Record<string, any> = {
          THREE,
          camera,
          controls,
          labelElements: new Map(),
          labels: labelsRef.current,
          loader,
          mount: safeContainer,
          objectGroups: new Map(),
          raycaster,
          renderer,
          root,
          scene,
        }
        runtimeRef.current = runtime

        function disposeObject(object: any) {
          object.traverse?.((node: any) => {
            node.geometry?.dispose?.()
            const materials = Array.isArray(node.material) ? node.material : [node.material]
            materials.forEach((material: any) => material?.dispose?.())
          })
        }

        function clearWorldObjects() {
          runtime.objectGroups.clear()
          runtime.labelElements.forEach((element: HTMLDivElement) => element.remove())
          runtime.labelElements.clear()
          while (root.children.length) {
            const child = root.children[0]
            root.remove(child)
            disposeObject(child)
          }
        }

        function placeholderFor(object: WorldObject) {
          const color = object.interactable ? 0x00e5ff : 0x7786ff
          const geometry = object.interactionType === 'activate'
            ? new THREE.CylinderGeometry(0.55, 0.55, 1.4, 24)
            : object.interactionType === 'collect'
              ? new THREE.SphereGeometry(0.72, 24, 16)
              : new THREE.BoxGeometry(1.2, 1.2, 1.2)
          const material = new THREE.MeshStandardMaterial({
            color,
            emissive: object.interactable ? 0x003a44 : 0x151a4f,
            metalness: 0.18,
            roughness: 0.42,
          })
          const mesh = new THREE.Mesh(geometry, material)
          mesh.position.y = 0.65
          return mesh
        }

        function markObject(group: any, object: WorldObject) {
          group.userData.worldObjectId = object.id
          group.userData.worldSelectable = true
          group.name = object.name
          group.traverse?.((node: any) => {
            node.userData.worldObjectId = object.id
          })
        }

        function addLabel(object: WorldObject) {
          const element = document.createElement('div')
          element.className = 'world-label'
          element.textContent = object.name
          element.dataset.objectId = object.id
          safeLabelContainer.appendChild(element)
          runtime.labelElements.set(object.id, element)
        }

        function applyWorldTransform(group: any, object: WorldObject) {
          applyVector(group.position, object.position)
          applyVector(group.rotation, object.rotation)
          multiplyVector(group.scale, object.scale)
        }

        function autoScaleModel(group: any) {
          const box = new THREE.Box3().setFromObject(group)
          const size = box.getSize(new THREE.Vector3())
          const maxAxis = Math.max(size.x, size.y, size.z)
          if (maxAxis > 0) group.scale.multiplyScalar(Math.min(2.5 / maxAxis, 4))
          const nextBox = new THREE.Box3().setFromObject(group)
          group.position.y -= nextBox.min.y
        }

        function addPlaceholder(object: WorldObject) {
          const group = new THREE.Group()
          group.add(placeholderFor(object))
          applyWorldTransform(group, object)
          markObject(group, object)
          root.add(group)
          runtime.objectGroups.set(object.id, group)
          addLabel(object)
        }

        function loadWorldObjects(objects: WorldObject[]) {
          clearWorldObjects()
          if (objects.length === 0) {
            setRenderStatus(config.emptyState)
            return
          }
          setRenderStatus(`Loading ${objects.length} world objects...`)

          objects.forEach((object) => {
            if (!object.modelUrl) {
              addPlaceholder(object)
              return
            }

            loader.load(
              object.modelUrl,
              (gltf: any) => {
                if (disposed) return
                const group = new THREE.Group()
                group.add(gltf.scene)
                autoScaleModel(group)
                applyWorldTransform(group, object)
                markObject(group, object)
                root.add(group)
                runtime.objectGroups.set(object.id, group)
                addLabel(object)
                setRenderStatus(`World loaded with ${objects.length} objects.`)
              },
              undefined,
              () => {
                if (disposed) return
                addPlaceholder(object)
                setRenderStatus(`${object.name} used a placeholder because its model URL failed.`)
              },
            )
          })
          setRenderStatus(`World loaded with ${objects.length} objects.`)
        }

        function setSelected(id: string | null) {
          runtime.objectGroups.forEach((group: any, objectId: string) => {
            group.traverse?.((node: any) => {
              const material = Array.isArray(node.material) ? node.material[0] : node.material
              if (material?.emissive) material.emissive.setHex(objectId === id ? 0x143d4b : node.userData.baseEmissive ?? 0x000000)
            })
          })
          runtime.labelElements.forEach((element: HTMLDivElement, objectId: string) => {
            element.dataset.active = objectId === id ? 'true' : 'false'
          })
          setSelectedObjectId(id)
        }

        function focusObject(id: string) {
          const object = runtime.objectGroups.get(id)
          if (!object) return
          const box = new THREE.Box3().setFromObject(object)
          const center = box.getCenter(new THREE.Vector3())
          controls.target.copy(center)
          camera.position.set(center.x + 4.5, center.y + 3.4, center.z + 5.4)
          controls.update()
        }

        function pickObject(event: PointerEvent) {
          const rect = renderer.domElement.getBoundingClientRect()
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(pointer, camera)
          const hits = raycaster.intersectObjects(root.children, true)
          const hit = hits.find((candidate: any) => candidate.object?.userData?.worldObjectId)
          setSelected(hit?.object?.userData?.worldObjectId ?? null)
        }

        function hoverObject(event: PointerEvent) {
          const rect = renderer.domElement.getBoundingClientRect()
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(pointer, camera)
          const hits = raycaster.intersectObjects(root.children, true)
          const hit = hits.find((candidate: any) => candidate.object?.userData?.worldObjectId)
          renderer.domElement.style.cursor = hit ? 'pointer' : 'grab'
          runtime.labelElements.forEach((element: HTMLDivElement, objectId: string) => {
            element.dataset.hover = objectId === hit?.object?.userData?.worldObjectId ? 'true' : 'false'
          })
        }

        function updateLabels() {
          const width = safeContainer.clientWidth
          const height = safeContainer.clientHeight
          runtime.objectGroups.forEach((group: any, id: string) => {
            const element = runtime.labelElements.get(id)
            if (!element) return
            const box = new THREE.Box3().setFromObject(group)
            const point = box.getCenter(new THREE.Vector3())
            point.y = box.max.y + 0.35
            point.project(camera)
            const x = (point.x * 0.5 + 0.5) * width
            const y = (-point.y * 0.5 + 0.5) * height
            element.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`
          })
        }

        function animate() {
          if (disposed) return
          controls.update()
          updateLabels()
          renderer.render(scene, camera)
          requestAnimationFrame(animate)
        }

        function resize() {
          if (!mountRef.current) return
          const width = mountRef.current.clientWidth
          const height = mountRef.current.clientHeight
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          renderer.setSize(width, height)
        }

        renderer.domElement.addEventListener('click', pickObject)
        renderer.domElement.addEventListener('pointermove', hoverObject)
        window.addEventListener('resize', resize)
        runtime.cleanup = () => {
          renderer.domElement.removeEventListener('click', pickObject)
          renderer.domElement.removeEventListener('pointermove', hoverObject)
          window.removeEventListener('resize', resize)
          clearWorldObjects()
        }
        runtime.focusObject = focusObject
        runtime.loadWorldObjects = loadWorldObjects
        runtime.setSelected = setSelected

        loadWorldObjects(state.objects)
        animate()
      } catch (caught) {
        setRenderStatus(caught instanceof Error ? caught.message : 'World renderer failed to start.')
      }
    }

    void initWorld()

    return () => {
      disposed = true
      const runtime = runtimeRef.current
      runtime?.cleanup?.()
      runtime?.renderer?.dispose?.()
      if (runtime?.renderer?.domElement?.parentElement) {
        runtime.renderer.domElement.parentElement.removeChild(runtime.renderer.domElement)
      }
      runtimeRef.current = null
    }
  }, [])

  useEffect(() => {
    runtimeRef.current?.loadWorldObjects?.(state.objects)
  }, [state.objects])

  useEffect(() => {
    runtimeRef.current?.setSelected?.(selectedObjectId)
  }, [selectedObjectId])

  useEffect(() => {
    if (!flashObjectId) return
    const group = runtimeRef.current?.objectGroups?.get(flashObjectId)
    if (!group) return
    group.traverse?.((node: any) => {
      const material = Array.isArray(node.material) ? node.material[0] : node.material
      if (material?.emissive) material.emissive.setHex(0x4bffef)
    })
  }, [flashObjectId])

  return (
    <div className="world-engine">
      <div className="world-viewport">
        <div className="world-canvas-wrap" ref={mountRef} />
        <div className="world-label-layer" ref={labelsRef} />
        <div className="world-hud">
          <strong>{selectedObject?.name ?? config.title}</strong>
          <span>{error ?? renderStatus}</span>
        </div>
      </div>

      <aside className="world-sidebar" aria-label="Persistent world controls">
        <section className="world-panel-section world-summary">
          <div>
            <strong>{config.title}</strong>
            <span>{formatVersion(state.worldVersion, state.lastModified)}</span>
          </div>
          <div className="world-actions">
            <button onClick={() => void refresh()} type="button">{isLoading ? 'Refreshing...' : 'Refresh'}</button>
            <button onClick={handleResetWorld} type="button">Reset World</button>
          </div>
        </section>

        <WorldObjectList
          objects={state.objects}
          onFocusObject={(id) => runtimeRef.current?.focusObject?.(id)}
          onSelectObject={setSelectedObjectId}
          selectedObjectId={selectedObjectId}
        />

        <WorldInteraction
          interactions={state.interactions}
          onInteract={handleInteract}
          selectedObject={selectedObject}
        />
      </aside>
    </div>
  )
}
