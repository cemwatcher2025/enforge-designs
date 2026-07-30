const base = process.env.COMMAND_CENTER_PROXY_URL ?? 'https://enforge-command-center-proxy.replit.app'
const assetBase = 'https://enforgedesigns.com/world-assets/polyhaven'

function model(id, file = `${id}_1k.gltf`) {
  return `${assetBase}/${id}/${file}`
}

function primitive(name, kind, position, dimensions, material, options = {}) {
  const interactions = options.interactions ?? [options.interactionType ?? 'examine']
  return {
    description: options.description ?? '',
    interactable: options.interactable ?? false,
    interactions,
    interactionType: options.interactionType ?? 'examine',
    modelUrl: '',
    name,
    position,
    properties: {
      assetLicense: 'procedural',
      layoutZone: options.zone ?? 'Stage',
      primitive: {
        dimensions,
        kind,
        light: options.light,
        material,
      },
      role: options.role ?? 'set-dressing',
      stage: 'Signal Station One',
      ...(interactions.length > 1 ? { interactionChain: interactions } : {}),
    },
    rotation: options.rotation ?? { x: 0, y: 0, z: 0 },
    scale: options.scale ?? { x: 1, y: 1, z: 1 },
  }
}

function asset(name, assetId, file, position, options = {}) {
  const interactions = options.interactions ?? [options.interactionType ?? 'examine']
  return {
    description: options.description ?? '',
    interactable: options.interactable ?? false,
    interactions,
    interactionType: options.interactionType ?? 'examine',
    modelUrl: model(assetId, file),
    name,
    position,
    properties: {
      assetLicense: 'CC0',
      assetSource: `Poly Haven ${assetId}`,
      layoutZone: options.zone ?? 'Stage',
      role: options.role ?? 'set-dressing',
      stage: 'Signal Station One',
      ...(interactions.length > 1 ? { interactionChain: interactions } : {}),
    },
    rotation: options.rotation ?? { x: 0, y: 0, z: 0 },
    scale: options.scale ?? { x: 1, y: 1, z: 1 },
  }
}

const floorMat = { color: '#0b1724', emissive: '#001923', metalness: 0.18, roughness: 0.5 }
const trimMat = { color: '#063448', emissive: '#00384c', metalness: 0.25, roughness: 0.36 }
const wallMat = { color: '#111827', emissive: '#060b15', metalness: 0.16, roughness: 0.7 }
const magentaMat = { color: '#34152c', emissive: '#3e0f31', metalness: 0.2, roughness: 0.42 }
const cyanMat = { color: '#0b3446', emissive: '#005a72', metalness: 0.2, roughness: 0.38 }

const objects = [
  primitive('Entry Yard Platform', 'box', { x: 0, y: -0.08, z: 8.5 }, { x: 11, y: 0.16, z: 8 }, floorMat, { zone: 'Entry Yard', role: 'floor' }),
  primitive('Receiving Yard Platform', 'box', { x: 0, y: -0.08, z: 1.6 }, { x: 12, y: 0.16, z: 6 }, floorMat, { zone: 'Receiving Yard', role: 'floor' }),
  primitive('Workshop Floor', 'box', { x: 0, y: -0.08, z: -5.4 }, { x: 13, y: 0.16, z: 8 }, { ...floorMat, color: '#101823' }, { zone: 'Workshop Bay', role: 'floor' }),
  primitive('Service Walk Deck A', 'box', { x: 0, y: -0.06, z: -12 }, { x: 5.2, y: 0.12, z: 7.5 }, { color: '#0d1d2a', emissive: '#001923', metalness: 0.22, roughness: 0.44 }, { zone: 'Service Walk', role: 'floor' }),
  primitive('Signal Overlook Platform', 'box', { x: 0, y: -0.08, z: -19.2 }, { x: 11, y: 0.16, z: 7.5 }, floorMat, { zone: 'Signal Overlook', role: 'floor' }),

  primitive('Route Glow Entry', 'box', { x: 0, y: 0.02, z: 6.2 }, { x: 0.22, y: 0.06, z: 12 }, cyanMat, { zone: 'Route', role: 'path-light' }),
  primitive('Route Glow Workshop', 'box', { x: 0, y: 0.02, z: -7.6 }, { x: 0.22, y: 0.06, z: 11 }, cyanMat, { zone: 'Route', role: 'path-light' }),
  primitive('Route Glow Overlook', 'box', { x: 0, y: 0.02, z: -17.3 }, { x: 0.22, y: 0.06, z: 7 }, magentaMat, { zone: 'Route', role: 'path-light' }),

  primitive('Left Entry Wall', 'box', { x: -6.1, y: 0, z: 6.4 }, { x: 0.28, y: 1.2, z: 7.2 }, wallMat, { zone: 'Entry Yard', role: 'wall' }),
  primitive('Right Entry Wall', 'box', { x: 6.1, y: 0, z: 6.4 }, { x: 0.28, y: 1.2, z: 7.2 }, wallMat, { zone: 'Entry Yard', role: 'wall' }),
  primitive('Workshop Left Wall', 'box', { x: -6.8, y: 0, z: -5.4 }, { x: 0.35, y: 2.4, z: 8.4 }, wallMat, { zone: 'Workshop Bay', role: 'wall' }),
  primitive('Workshop Right Pipe Wall', 'box', { x: 6.8, y: 0, z: -5.4 }, { x: 0.35, y: 2, z: 8.4 }, wallMat, { zone: 'Workshop Bay', role: 'wall' }),
  primitive('Overlook Back Wall', 'box', { x: 0, y: 0, z: -23.1 }, { x: 11.5, y: 1.5, z: 0.35 }, wallMat, { zone: 'Signal Overlook', role: 'wall' }),

  primitive('Entry Lamp Glow', 'cylinder', { x: 2.8, y: 0, z: 10.9 }, { x: 0.32, y: 0.12, z: 0.32 }, { color: '#00e5ff', emissive: '#00e5ff', opacity: 0.68 }, {
    light: { color: '#00e5ff', distance: 12, enabled: true, intensity: 5, y: 1.8 },
    role: 'light-volume',
    zone: 'Entry Yard',
  }),
  primitive('Workshop Lamp Glow', 'cylinder', { x: 0, y: 0, z: -5.8 }, { x: 0.44, y: 0.12, z: 0.44 }, { color: '#ff2fb3', emissive: '#ff2fb3', opacity: 0.6 }, {
    light: { color: '#ff2fb3', distance: 14, enabled: true, intensity: 4.5, y: 2.2 },
    role: 'light-volume',
    zone: 'Workshop Bay',
  }),
  primitive('Beacon Pool', 'cylinder', { x: 0, y: 0, z: -20.2 }, { x: 1.25, y: 0.08, z: 1.25 }, { color: '#39ff88', emissive: '#0d8a45', opacity: 0.82 }, {
    light: { color: '#40ff6a', distance: 16, enabled: true, intensity: 5.5, y: 1.8 },
    role: 'goal-light',
    zone: 'Signal Overlook',
  }),

  asset('Arrival Gate', 'large_iron_gate', 'large_iron_gate_1k.gltf', { x: 0, y: 0, z: 11.2 }, {
    description: 'The first threshold of Signal Station One. Inspect the gate and you can read the station as a restored route, not a random object field.',
    interactable: true,
    interactionType: 'inspect',
    interactions: ['inspect', 'activate', 'open'],
    role: 'start-gate',
    scale: { x: 1.28, y: 1.28, z: 1.28 },
    zone: 'Entry Yard',
  }),
  asset('Gate Latch', 'gate_latch_01', 'gate_latch_01_1k.gltf', { x: -2.25, y: 0.15, z: 10.8 }, {
    description: 'The latch is intact, but the hinge is dry and slightly misaligned. Diagnose it first; the fix should feel physical.',
    interactable: true,
    interactionType: 'diagnose',
    interactions: ['examine', 'diagnose', 'lubricate', 'repair'],
    role: 'gate-mechanism',
    scale: { x: 0.62, y: 0.62, z: 0.62 },
    zone: 'Entry Yard',
  }),
  asset('Entry Lantern', 'Lantern_01', 'Lantern_01_1k.gltf', { x: 2.9, y: 0, z: 10.6 }, { role: 'decor-light', scale: { x: 0.72, y: 0.72, z: 0.72 }, zone: 'Entry Yard' }),
  asset('Left Yard Fence', 'modular_chainlink_fence', 'modular_chainlink_fence_1k.gltf', { x: -5.7, y: 0, z: 2.8 }, { role: 'boundary', rotation: { x: 0, y: 1.57, z: 0 }, scale: { x: 1.05, y: 1.05, z: 1.05 }, zone: 'Receiving Yard' }),
  asset('Right Yard Fence', 'modular_chainlink_fence', 'modular_chainlink_fence_1k.gltf', { x: 5.7, y: 0, z: 2.8 }, { role: 'boundary', rotation: { x: 0, y: 1.57, z: 0 }, scale: { x: 1.05, y: 1.05, z: 1.05 }, zone: 'Receiving Yard' }),
  asset('Receiving Ledger', 'book_encyclopedia_set_01', 'book_encyclopedia_set_01_1k.gltf', { x: -3.3, y: 0, z: 1.2 }, {
    description: 'A weathered receiving ledger. The entries imply the station used signal tones as work orders for whoever arrived next.',
    interactable: true,
    interactionType: 'read',
    interactions: ['read', 'decode', 'catalog'],
    role: 'lore',
    rotation: { x: 0, y: 0.5, z: 0 },
    scale: { x: 0.62, y: 0.62, z: 0.62 },
    zone: 'Receiving Yard',
  }),
  asset('Receiving Table', 'WoodenTable_01', 'WoodenTable_01_1k.gltf', { x: -3.25, y: 0, z: 0.9 }, { role: 'furniture', rotation: { x: 0, y: 0.45, z: 0 }, scale: { x: 0.92, y: 0.92, z: 0.92 }, zone: 'Receiving Yard' }),
  asset('Crate Stack', 'CheeseBox_01', 'CheeseBox_01_1k.gltf', { x: -4.9, y: 0, z: 0.2 }, { role: 'storage', rotation: { x: 0, y: 0.2, z: 0 }, scale: { x: 0.84, y: 0.84, z: 0.84 }, zone: 'Receiving Yard' }),
  asset('Box Stack', 'cardboard_box_01', 'cardboard_box_01_1k.gltf', { x: -4.4, y: 0, z: 2.5 }, { role: 'storage', rotation: { x: 0, y: -0.3, z: 0 }, scale: { x: 0.86, y: 0.86, z: 0.86 }, zone: 'Receiving Yard' }),
  asset('Old Yard Radio', 'boombox', 'boombox_1k.gltf', { x: 3.45, y: 0, z: 1.6 }, {
    description: 'A portable radio faces the entrance. The useful clue is not the device itself, but where its signal seems to point.',
    interactable: true,
    interactionType: 'listen',
    interactions: ['listen', 'calibrate', 'activate', 'trace'],
    role: 'signal-device',
    rotation: { x: 0, y: -0.4, z: 0 },
    scale: { x: 0.64, y: 0.64, z: 0.64 },
    zone: 'Receiving Yard',
  }),
  asset('Tool Chest', 'metal_tool_chest', 'metal_tool_chest_1k.gltf', { x: 4.5, y: 0, z: -0.4 }, { role: 'storage', rotation: { x: 0, y: -0.5, z: 0 }, scale: { x: 0.76, y: 0.76, z: 0.76 }, zone: 'Receiving Yard' }),

  asset('Workshop Door', 'large_castle_door', 'large_castle_door_1k.gltf', { x: 0, y: 0, z: -2.1 }, {
    description: 'The heavy door into the maintenance bay. It should not simply open; it should feel like access has been earned.',
    interactable: true,
    interactionType: 'unlock',
    interactions: ['unlock', 'open'],
    role: 'threshold',
    scale: { x: 1, y: 1, z: 1 },
    zone: 'Workshop Bay',
  }),
  asset('Work Table', 'WoodenTable_01', 'WoodenTable_01_1k.gltf', { x: -3.7, y: 0, z: -5.2 }, { role: 'furniture', rotation: { x: 0, y: 0.35, z: 0 }, scale: { x: 0.96, y: 0.96, z: 0.96 }, zone: 'Workshop Bay' }),
  asset('Work Chair', 'WoodenChair_01', 'WoodenChair_01_1k.gltf', { x: -5, y: 0, z: -5.8 }, { role: 'furniture', rotation: { x: 0, y: -0.4, z: 0 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, zone: 'Workshop Bay' }),
  asset('Bench Vice', 'bench_vice_01', 'bench_vice_01_1k.gltf', { x: -2.55, y: 0, z: -5.15 }, {
    description: 'A mounted vice with bite marks and worn jaws. Inspect it to understand how the workshop held parts steady for repair.',
    interactable: true,
    interactionType: 'inspect',
    interactions: ['inspect', 'repair', 'upgrade'],
    role: 'workshop-mechanic',
    rotation: { x: 0, y: 0.4, z: 0 },
    scale: { x: 0.64, y: 0.64, z: 0.64 },
    zone: 'Workshop Bay',
  }),
  asset('Desk Lamp', 'desk_lamp_arm_01', 'desk_lamp_arm_01_1k.gltf', { x: -3.6, y: 0, z: -4.3 }, { role: 'decor-light', rotation: { x: 0, y: -0.7, z: 0 }, scale: { x: 0.62, y: 0.62, z: 0.62 }, zone: 'Workshop Bay' }),
  asset('Old Drill Press', 'old_drill_press', 'old_drill_press_1k.gltf', { x: 3.75, y: 0, z: -5.2 }, {
    description: 'The workshop heart. Diagnose the press, repair the drive, then test whether the bay feels like a real work space.',
    interactable: true,
    interactionType: 'diagnose',
    interactions: ['diagnose', 'repair', 'test', 'operate'],
    role: 'machine',
    rotation: { x: 0, y: -0.55, z: 0 },
    scale: { x: 0.88, y: 0.88, z: 0.88 },
    zone: 'Workshop Bay',
  }),
  asset('Pipe Run A', 'modular_industrial_pipes_01', 'modular_industrial_pipes_01_1k.gltf', { x: 5.8, y: 0, z: -4.2 }, { role: 'infrastructure', rotation: { x: 0, y: 1.57, z: 0 }, scale: { x: 0.82, y: 0.82, z: 0.82 }, zone: 'Workshop Bay' }),
  asset('Pipe Run B', 'modular_industrial_pipes_01', 'modular_industrial_pipes_01_1k.gltf', { x: 5.8, y: 0, z: -8.1 }, { role: 'infrastructure', rotation: { x: 0, y: 1.57, z: 0 }, scale: { x: 0.82, y: 0.82, z: 0.82 }, zone: 'Workshop Bay' }),
  asset('Parts Shelf', 'Shelf_01', 'Shelf_01_1k.gltf', { x: -5.5, y: 0, z: -8.2 }, { role: 'storage', rotation: { x: 0, y: 1.57, z: 0 }, scale: { x: 0.82, y: 0.82, z: 0.82 }, zone: 'Workshop Bay' }),
  asset('Signal Laptop', 'classic_laptop', 'classic_laptop_1k.gltf', { x: -2.7, y: 0, z: -8.3 }, {
    description: 'A rugged laptop with a station map and a weak route overlay. Read it, scan the map, then trace the station spine.',
    interactable: true,
    interactionType: 'read',
    interactions: ['read', 'scan', 'trace'],
    role: 'map-terminal',
    rotation: { x: 0, y: 0.25, z: 0 },
    scale: { x: 0.62, y: 0.62, z: 0.62 },
    zone: 'Workshop Bay',
  }),
  asset('Cassette Recorder', 'cassette_player', 'cassette_player_1k.gltf', { x: 2.55, y: 0, z: -8.5 }, {
    description: 'A recorder loaded with a tape labeled FIRST PASS. Collect it, listen later, and catalog what the first route taught you.',
    interactable: true,
    interactionType: 'collect',
    interactions: ['collect', 'listen', 'catalog'],
    role: 'memory-item',
    rotation: { x: 0, y: -0.35, z: 0 },
    scale: { x: 0.62, y: 0.62, z: 0.62 },
    zone: 'Workshop Bay',
  }),
  asset('Hanging Bay Lamp', 'hanging_industrial_lamp', 'hanging_industrial_lamp_1k.gltf', { x: 0, y: 0, z: -5.8 }, { role: 'decor-light', scale: { x: 0.72, y: 0.72, z: 0.72 }, zone: 'Workshop Bay' }),

  asset('Left Rock Mass', 'coast_rocks_01', 'coast_rocks_01_1k.gltf', { x: -4.7, y: 0, z: -13.8 }, { role: 'nature-edge', rotation: { x: 0, y: 0.45, z: 0 }, scale: { x: 0.94, y: 0.94, z: 0.94 }, zone: 'Service Walk' }),
  asset('Right Boulder', 'boulder_01', 'boulder_01_1k.gltf', { x: 4.2, y: 0, z: -15.4 }, { role: 'nature-edge', rotation: { x: 0, y: -0.3, z: 0 }, scale: { x: 0.82, y: 0.82, z: 0.82 }, zone: 'Service Walk' }),
  asset('Grass Patch A', 'grass_medium_01', 'grass_medium_01_1k.gltf', { x: -2.3, y: 0, z: -12.7 }, { role: 'nature-edge', rotation: { x: 0, y: 0.2, z: 0 }, scale: { x: 0.72, y: 0.72, z: 0.72 }, zone: 'Service Walk' }),
  asset('Grass Patch B', 'grass_medium_01', 'grass_medium_01_1k.gltf', { x: 2.8, y: 0, z: -17 }, { role: 'nature-edge', rotation: { x: 0, y: -0.6, z: 0 }, scale: { x: 0.76, y: 0.76, z: 0.76 }, zone: 'Service Walk' }),
  asset('Fern Cluster', 'fern_02', 'fern_02_1k.gltf', { x: -3.2, y: 0, z: -17.6 }, { role: 'nature-edge', rotation: { x: 0, y: 0.8, z: 0 }, scale: { x: 0.72, y: 0.72, z: 0.72 }, zone: 'Service Walk' }),
  asset('Moss Plate', 'moss_01', 'moss_01_1k.gltf', { x: 1.4, y: 0, z: -16.6 }, { role: 'nature-edge', scale: { x: 0.75, y: 0.75, z: 0.75 }, zone: 'Service Walk' }),
  asset('Signal Flashlight', 'signal_flashlight', 'signal_flashlight_1k.gltf', { x: -1.6, y: 0, z: -14.2 }, { role: 'small-light', rotation: { x: 0, y: -0.4, z: 0 }, scale: { x: 0.48, y: 0.48, z: 0.48 }, zone: 'Service Walk' }),

  asset('Overlook Gate', 'large_iron_gate', 'large_iron_gate_1k.gltf', { x: 0, y: 0, z: -18.1 }, {
    description: 'The last iron gate. Unlocking this threshold should feel like the station accepting the work you completed behind you.',
    interactable: true,
    interactionType: 'unlock',
    interactions: ['unlock', 'activate', 'open'],
    role: 'threshold',
    rotation: { x: 0, y: 3.14, z: 0 },
    scale: { x: 1.08, y: 1.08, z: 1.08 },
    zone: 'Signal Overlook',
  }),
  asset('Signal Console', 'Camera_01', 'Camera_01_1k.gltf', { x: 0, y: 0, z: -21.2 }, {
    description: 'The console watches the whole route backward. Operate it to redirect the restored signal toward the quiet beacon.',
    interactable: true,
    interactionType: 'operate',
    interactions: ['examine', 'operate', 'redirect'],
    role: 'final-console',
    rotation: { x: 0, y: 3.14, z: 0 },
    scale: { x: 0.8, y: 0.8, z: 0.8 },
    zone: 'Signal Overlook',
  }),
  asset('Beacon Lamp', 'wooden_lantern_01', 'wooden_lantern_01_1k.gltf', { x: 0, y: 0, z: -22.7 }, {
    description: 'The quiet beacon at the end of the level. Illuminate it, activate it, then observe the station as a place with a beginning, middle, and end.',
    interactable: true,
    interactionType: 'illuminate',
    interactions: ['illuminate', 'activate', 'observe'],
    role: 'level-goal',
    scale: { x: 0.92, y: 0.92, z: 0.92 },
    zone: 'Signal Overlook',
  }),
  asset('Left Overlook Lamp', 'industrial_wall_lamp', 'industrial_wall_lamp_1k.gltf', { x: -3.1, y: 0, z: -21 }, { role: 'decor-light', rotation: { x: 0, y: 0.4, z: 0 }, scale: { x: 0.64, y: 0.64, z: 0.64 }, zone: 'Signal Overlook' }),
  asset('Right Overlook Lamp', 'industrial_wall_lamp', 'industrial_wall_lamp_1k.gltf', { x: 3.1, y: 0, z: -21 }, { role: 'decor-light', rotation: { x: 0, y: -0.4, z: 0 }, scale: { x: 0.64, y: 0.64, z: 0.64 }, zone: 'Signal Overlook' }),
  asset('Final Rock Left', 'boulder_01', 'boulder_01_1k.gltf', { x: -4.6, y: 0, z: -22.2 }, { role: 'nature-edge', rotation: { x: 0, y: 0.9, z: 0 }, scale: { x: 0.68, y: 0.68, z: 0.68 }, zone: 'Signal Overlook' }),
  asset('Final Rock Right', 'coast_rocks_01', 'coast_rocks_01_1k.gltf', { x: 4.7, y: 0, z: -22.4 }, { role: 'nature-edge', rotation: { x: 0, y: -0.8, z: 0 }, scale: { x: 0.68, y: 0.68, z: 0.68 }, zone: 'Signal Overlook' }),
]

async function post(path, body) {
  const response = await fetch(`${base}${path}`, {
    body: body == null ? undefined : JSON.stringify(body),
    headers: body == null ? undefined : { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(payload)}`)
  return payload
}

await post('/api/world/reset')
for (const object of objects) {
  await post('/api/world/objects', object)
}

const state = await fetch(`${base}/api/world/state`).then((response) => response.json())
const interactable = state.objects.filter((object) => object.interactable).length
console.log(JSON.stringify({
  decor: state.objects.length - interactable,
  interactions: state.interactions.length,
  interactable,
  objects: state.objects.length,
  worldVersion: state.worldVersion,
}, null, 2))
