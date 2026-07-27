/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react'
import type { SandboxPresetId } from '../config'
import type { SceneObjectInfo, TransformMode } from './Sandbox3DControls'

export type ModelRequest = {
  id: number
  source: string
  type: 'url' | 'file'
}

type Sandbox3DSceneProps = {
  axesVisible: boolean
  modelRequest: ModelRequest | null
  preset: SandboxPresetId
  resetSignal: number
  saveSignal: number
  screenshotSignal: number
  selectedObjectId: string | null
  timeline: number
  transformMode: TransformMode
  wireframe: boolean
  isPlaying: boolean
  onAnimationState: (canAnimate: boolean, timeline: number) => void
  onObjectsChange: (objects: SceneObjectInfo[]) => void
  onSelectObject: (id: string | null) => void
  onStatus: (status: string, loading?: boolean) => void
}

const threeUrl = 'https://esm.sh/three@0.160.0'
const orbitUrl = 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js'
const transformUrl = 'https://esm.sh/three@0.160.0/examples/jsm/controls/TransformControls.js'
const gltfUrl = 'https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'

function isMesh(object: any) {
  return object?.isMesh === true
}

function setWireframe(object: any, enabled: boolean) {
  object.traverse?.((child: any) => {
    if (!isMesh(child)) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material: any) => {
      if (material) material.wireframe = enabled
    })
  })
}

function collectObjects(root: any): SceneObjectInfo[] {
  const objects: SceneObjectInfo[] = []
  root.traverse?.((child: any) => {
    if (!child.userData?.sandboxSelectable) return
    objects.push({
      id: child.userData.sandboxId,
      name: child.name || child.userData.sandboxId,
      type: child.type || 'Object3D',
    })
  })
  return objects
}

function downloadCanvas(canvas: HTMLCanvasElement) {
  const link = document.createElement('a')
  link.download = `enforge-3d-sandbox-${Date.now()}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export function Sandbox3DScene({
  axesVisible,
  isPlaying,
  modelRequest,
  preset,
  resetSignal,
  saveSignal,
  screenshotSignal,
  selectedObjectId,
  timeline,
  transformMode,
  wireframe,
  onAnimationState,
  onObjectsChange,
  onSelectObject,
  onStatus,
}: Sandbox3DSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const runtimeRef = useRef<Record<string, any> | null>(null)
  const lastResetSignalRef = useRef(resetSignal)
  const lastSaveSignalRef = useRef(saveSignal)
  const lastScreenshotSignalRef = useRef(screenshotSignal)
  const timelineFromSceneRef = useRef(false)

  useEffect(() => {
    let disposed = false
    const mount = mountRef.current
    if (!mount) return undefined

    async function initScene() {
      onStatus('Loading Three.js...', true)

      try {
        const [THREE, orbitModule, transformModule, gltfModule] = await Promise.all([
          import(/* @vite-ignore */ threeUrl),
          import(/* @vite-ignore */ orbitUrl),
          import(/* @vite-ignore */ transformUrl),
          import(/* @vite-ignore */ gltfUrl),
        ])

        const container = mountRef.current
        if (disposed || !container) return

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0x05070d)
        scene.fog = new THREE.Fog(0x05070d, 18, 48)

        const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(container.clientWidth, container.clientHeight)
        renderer.shadowMap.enabled = true
        container.appendChild(renderer.domElement)

        const camera = new THREE.PerspectiveCamera(48, container.clientWidth / container.clientHeight, 0.1, 1000)
        camera.position.set(7, 5, 8)

        const controls = new orbitModule.OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.target.set(0, 1, 0)

        const transformControls = new transformModule.TransformControls(camera, renderer.domElement)
        transformControls.addEventListener('dragging-changed', (event: { value: boolean }) => {
          controls.enabled = !event.value
        })
        scene.add(transformControls)

        const root = new THREE.Group()
        root.name = 'Sandbox Objects'
        scene.add(root)

        const axesHelper = new THREE.AxesHelper(4)
        axesHelper.visible = axesVisible
        scene.add(axesHelper)

        const grid = new THREE.GridHelper(24, 24, 0x00e5ff, 0x17324b)
        scene.add(grid)

        const hemi = new THREE.HemisphereLight(0xb6efff, 0x0b1020, 1.6)
        scene.add(hemi)

        const key = new THREE.DirectionalLight(0xffffff, 2.1)
        key.position.set(6, 8, 5)
        key.castShadow = true
        scene.add(key)

        const raycaster = new THREE.Raycaster()
        const pointer = new THREE.Vector2()
        const clock = new THREE.Clock()
        const loader = new gltfModule.GLTFLoader()

        const runtime: Record<string, any> = {
          THREE,
          animationDuration: 0,
          animationMixer: null,
          animationAction: null,
          axesHelper,
          camera,
          controls,
          currentModelUrl: null,
          grid,
          loader,
          mount,
          raycaster,
          renderer,
          root,
          scene,
          selectedObject: null,
          transformControls,
        }
        runtimeRef.current = runtime

        function resetCamera() {
          camera.position.set(7, 5, 8)
          controls.target.set(0, 1, 0)
          controls.update()
        }

        function markSelectable(object: any, id: string, name: string) {
          object.userData.sandboxSelectable = true
          object.userData.sandboxId = id
          object.name = name
        }

        function clearRoot() {
          transformControls.detach()
          runtime.selectedObject = null
          while (root.children.length) {
            const child = root.children[0]
            root.remove(child)
            child.traverse?.((node: any) => {
              node.geometry?.dispose?.()
              const materials = Array.isArray(node.material) ? node.material : [node.material]
              materials.forEach((material: any) => material?.dispose?.())
            })
          }
          runtime.animationMixer = null
          runtime.animationAction = null
          runtime.animationDuration = 0
          onAnimationState(false, 0)
        }

        function refreshObjects() {
          onObjectsChange(collectObjects(root))
        }

        function serializeScene() {
          const objects: unknown[] = []
          root.traverse?.((child: any) => {
            if (!child.userData?.sandboxSelectable) return
            const material = Array.isArray(child.material) ? child.material[0] : child.material
            objects.push({
              color: material?.color?.getHexString?.() ?? null,
              id: child.userData.sandboxId,
              name: child.name,
              position: child.position?.toArray?.() ?? [0, 0, 0],
              rotation: child.rotation ? [child.rotation.x, child.rotation.y, child.rotation.z] : [0, 0, 0],
              scale: child.scale?.toArray?.() ?? [1, 1, 1],
              type: child.type,
            })
          })
          window.localStorage.setItem('enforge-3d-sandbox-scene', JSON.stringify({
            modelSource: runtime.currentModelSource ?? null,
            objects,
            preset: runtime.currentPreset ?? 'empty-grid',
            savedAt: new Date().toISOString(),
            wireframe: runtime.currentWireframe ?? false,
          }))
          onStatus(`Saved ${objects.length} scene objects locally.`)
        }

        function buildPrimitiveScene() {
          clearRoot()
          const materialA = new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.38, metalness: 0.15 })
          const materialB = new THREE.MeshStandardMaterial({ color: 0xff2fb3, roughness: 0.5 })
          const materialC = new THREE.MeshStandardMaterial({ color: 0x40ff6a, roughness: 0.46 })
          const materialD = new THREE.MeshStandardMaterial({ color: 0xffb000, roughness: 0.42 })
          const shapes = [
            { geometry: new THREE.BoxGeometry(1.4, 1.4, 1.4), id: 'cube', material: materialA, name: 'Cube', x: -3 },
            { geometry: new THREE.SphereGeometry(0.9, 32, 18), id: 'sphere', material: materialB, name: 'Sphere', x: -1 },
            { geometry: new THREE.CylinderGeometry(0.7, 0.7, 1.8, 24), id: 'cylinder', material: materialC, name: 'Cylinder', x: 1.1 },
            { geometry: new THREE.TorusGeometry(0.8, 0.22, 16, 40), id: 'torus', material: materialD, name: 'Torus', x: 3.2 },
          ]

          shapes.forEach((shape) => {
            const mesh = new THREE.Mesh(shape.geometry, shape.material)
            mesh.position.set(shape.x, 0.9, 0)
            mesh.castShadow = true
            markSelectable(mesh, shape.id, shape.name)
            root.add(mesh)
          })

          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0xff7a1a }))
          trunk.position.set(-3.2, 0.75, -3)
          markSelectable(trunk, 'tree-trunk', 'Low-poly tree trunk')
          root.add(trunk)
          const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.7, 7), new THREE.MeshStandardMaterial({ color: 0x40ff6a }))
          canopy.position.set(-3.2, 2.1, -3)
          markSelectable(canopy, 'tree-canopy', 'Low-poly tree canopy')
          root.add(canopy)

          const building = new THREE.Group()
          building.position.set(3, 0, -3)
          const base = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.6, 1.5), new THREE.MeshStandardMaterial({ color: 0x354cff, roughness: 0.5 }))
          base.position.y = 0.8
          const roof = new THREE.Mesh(new THREE.ConeGeometry(1.35, 0.8, 4), new THREE.MeshStandardMaterial({ color: 0xff2fb3, roughness: 0.48 }))
          roof.position.y = 2
          roof.rotation.y = Math.PI / 4
          building.add(base, roof)
          markSelectable(building, 'simple-building', 'Simple building')
          root.add(building)
          setWireframe(root, wireframe)
          refreshObjects()
          onStatus('Primitives scene loaded.')
        }

        function buildTerrainScene() {
          clearRoot()
          const geometry = new THREE.PlaneGeometry(12, 12, 48, 48)
          const position = geometry.attributes.position
          for (let index = 0; index < position.count; index += 1) {
            const x = position.getX(index)
            const y = position.getY(index)
            const height = Math.sin(x * 1.25) * 0.35 + Math.cos(y * 1.4) * 0.28
            position.setZ(index, height)
          }
          geometry.computeVertexNormals()
          const material = new THREE.MeshStandardMaterial({ color: 0x1fd1ff, roughness: 0.72, metalness: 0.02 })
          const terrain = new THREE.Mesh(geometry, material)
          terrain.rotation.x = -Math.PI / 2
          terrain.position.y = 0.02
          markSelectable(terrain, 'terrain', 'Heightmap terrain')
          root.add(terrain)
          setWireframe(root, wireframe)
          refreshObjects()
          onStatus('Terrain test loaded.')
        }

        function buildEmptyScene() {
          clearRoot()
          runtime.currentModelSource = null
          refreshObjects()
          onStatus('Empty grid loaded.')
        }

        function applyPreset(nextPreset: SandboxPresetId) {
          runtime.currentPreset = nextPreset
          runtime.currentModelSource = null
          if (nextPreset === 'primitives') buildPrimitiveScene()
          else if (nextPreset === 'terrain-test') buildTerrainScene()
          else buildEmptyScene()
          resetCamera()
        }

        function autoFrame(object: any) {
          const box = new THREE.Box3().setFromObject(object)
          const size = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())
          const maxAxis = Math.max(size.x, size.y, size.z) || 1
          const scale = Math.min(4 / maxAxis, 6)
          object.scale.multiplyScalar(scale)
          const scaledBox = new THREE.Box3().setFromObject(object)
          const scaledCenter = scaledBox.getCenter(new THREE.Vector3())
          object.position.sub(scaledCenter)
          object.position.y -= scaledBox.min.y
          controls.target.copy(center.set(0, 1, 0))
          resetCamera()
        }

        async function loadModel(request: ModelRequest) {
          clearRoot()
          runtime.currentModelSource = request.type === 'url' ? request.source : 'local-file'
          onObjectsChange([])
          onStatus(`Loading ${request.type === 'file' ? 'local model' : 'model URL'}...`, true)
          loader.load(
            request.source,
            (gltf: any) => {
              const model = gltf.scene
              markSelectable(model, 'loaded-model', request.type === 'file' ? 'Local model' : 'Loaded model')
              root.add(model)
              autoFrame(model)
              setWireframe(root, wireframe)
              if (gltf.animations?.length) {
                const mixer = new THREE.AnimationMixer(model)
                const action = mixer.clipAction(gltf.animations[0])
                runtime.animationMixer = mixer
                runtime.animationAction = action
                runtime.animationDuration = gltf.animations[0].duration || 0
                action.play()
                action.paused = !isPlaying
                onAnimationState(true, 0)
              }
              refreshObjects()
              onStatus('Model loaded.')
            },
            undefined,
            (error: unknown) => {
              onStatus(error instanceof Error ? error.message : 'Model failed to load.', false)
              refreshObjects()
            },
          )
        }

        function selectFromPointer(event: PointerEvent) {
          const rect = renderer.domElement.getBoundingClientRect()
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
          raycaster.setFromCamera(pointer, camera)
          const hits = raycaster.intersectObjects(root.children, true)
          const target = hits.find((hit: any) => {
            let cursor = hit.object
            while (cursor) {
              if (cursor.userData?.sandboxSelectable) return true
              cursor = cursor.parent
            }
            return false
          })
          if (!target) {
            onSelectObject(null)
            return
          }
          let cursor = target.object
          while (cursor && !cursor.userData?.sandboxSelectable) cursor = cursor.parent
          onSelectObject(cursor?.userData?.sandboxId ?? null)
        }

        function animate() {
          if (disposed) return
          const delta = clock.getDelta()
          controls.update()
          if (runtime.animationMixer && runtime.animationAction && isPlaying) {
            runtime.animationMixer.update(delta)
            if (runtime.animationDuration > 0) {
              timelineFromSceneRef.current = true
              onAnimationState(true, runtime.animationAction.time / runtime.animationDuration)
            }
          }
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

        renderer.domElement.addEventListener('dblclick', selectFromPointer)
        window.addEventListener('resize', resize)
        runtime.applyPreset = applyPreset
        runtime.loadModel = loadModel
        runtime.resetCamera = resetCamera
        runtime.refreshObjects = refreshObjects
        runtime.serializeScene = serializeScene
        runtime.cleanup = () => {
          renderer.domElement.removeEventListener('dblclick', selectFromPointer)
          window.removeEventListener('resize', resize)
        }

        applyPreset(preset)
        animate()
      } catch (error) {
        onStatus(error instanceof Error ? error.message : 'Three.js failed to load.', false)
      }
    }

    void initScene()

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
    runtimeRef.current?.applyPreset?.(preset)
  }, [preset])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime || !modelRequest) return
    runtime.loadModel?.(modelRequest)
  }, [modelRequest])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.axesHelper.visible = axesVisible
  }, [axesVisible])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.currentWireframe = wireframe
    setWireframe(runtime.root, wireframe)
  }, [wireframe])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    runtime.transformControls.setMode(transformMode)
  }, [transformMode])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    if (runtime.animationAction) runtime.animationAction.paused = !isPlaying
  }, [isPlaying])

  useEffect(() => {
    if (timelineFromSceneRef.current) {
      timelineFromSceneRef.current = false
      return
    }
    const runtime = runtimeRef.current
    if (!runtime?.animationAction || !runtime.animationDuration) return
    runtime.animationAction.time = runtime.animationDuration * timeline
    runtime.animationMixer?.setTime?.(runtime.animationAction.time)
  }, [timeline])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    if (lastResetSignalRef.current === resetSignal) return
    lastResetSignalRef.current = resetSignal
    runtime.resetCamera?.()
  }, [resetSignal])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    if (lastSaveSignalRef.current === saveSignal) return
    lastSaveSignalRef.current = saveSignal
    runtime.serializeScene?.()
  }, [saveSignal])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    if (lastScreenshotSignalRef.current === screenshotSignal) return
    lastScreenshotSignalRef.current = screenshotSignal
    runtime.renderer.render(runtime.scene, runtime.camera)
    downloadCanvas(runtime.renderer.domElement)
    onStatus('Screenshot downloaded.')
  }, [onStatus, screenshotSignal])

  useEffect(() => {
    const runtime = runtimeRef.current
    if (!runtime) return
    let selected: any = null
    runtime.root.traverse?.((child: any) => {
      if (child.userData?.sandboxId === selectedObjectId) selected = child
    })
    runtime.selectedObject = selected
    if (selected) runtime.transformControls.attach(selected)
    else runtime.transformControls.detach()
  }, [selectedObjectId])

  return (
    <div
      className="sandbox-canvas-wrap"
      onDragOver={(event) => event.preventDefault()}
      ref={mountRef}
    />
  )
}
