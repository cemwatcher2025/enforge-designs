import cors from 'cors'
import express from 'express'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const app = express()
const port = process.env.PORT || 3000
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, 'data')
const configPath = path.join(dataDir, 'config.json')
const worldPath = path.join(dataDir, 'world.json')

const defaultAllowedOrigins = [
  'https://enforgedesigns.com',
  'http://enforgedesigns.com',
  'https://www.enforgedesigns.com',
  'http://www.enforgedesigns.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

const allowedOrigins = [...defaultAllowedOrigins, ...(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)]

function env(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name]
  }
  return ''
}

const usageWebhookUrl = env('USAGE_LOG_WEBHOOK_URL', 'USAGELOGWEBHOOK_URL')

const defaultDashboardConfig = {
  activeProject: 'enforge',
  documentLinks: [
    {
      detail: 'Primary build spec and panel roadmap',
      href: 'https://docs.google.com/document/d/1efJpHdlcvMcxxNw_jsYDWLPvrjSQFWZnzr7a1hq1kD8',
      id: 'command-center-spec',
      tags: ['spec', 'command center', 'phase plan', 'dashboard'],
      title: 'Enforge Command Center Build Spec',
    },
  ],
  lastUpdatedAt: null,
  panels: [
    { id: 'logistics', label: 'Dashboard', visible: true },
    { id: 'communications', label: 'Comms Hub', visible: true },
    { id: 'coding', label: 'Coding Sandbox', visible: true },
    { id: 'documents', label: 'Documents', visible: true },
    { id: 'settings', label: 'Settings', visible: true },
    { id: 'sandbox3d', label: '3D Sandbox', visible: true },
    { id: 'ministry', label: 'Ministry', visible: true },
  ],
  projectCards: [
    {
      detail: 'Estimating, price library, job volume',
      href: 'https://price-library.replit.app',
      id: 'clearbid',
      name: 'ClearBid',
      status: 'Live app',
      type: 'Replit',
    },
    {
      detail: 'Service records, visits, studies',
      href: 'https://github.com/cemwatcher2025/ministry-companion',
      id: 'ministry',
      name: 'Ministry Companion',
      status: 'Repo found',
      type: 'GitHub',
    },
    {
      detail: 'Assistant events, briefings, task flow',
      href: 'https://kim-assistant.replit.app',
      id: 'kim',
      name: 'KIM Assistant',
      status: 'Live app',
      type: 'Replit',
    },
    {
      detail: 'Command center frontend, proxy, deployment',
      href: 'https://github.com/cemwatcher2025/enforge-designs',
      id: 'enforge',
      name: 'Enforge Designs',
      status: 'Active repo',
      type: 'GitHub',
    },
    {
      detail: 'Unreal Engine project placeholder',
      href: 'https://github.com/cemwatcher2025',
      id: 'roam',
      name: 'ROAM',
      status: 'Repo TBD',
      type: 'Placeholder',
    },
  ],
  theme: 'dark',
}

const defaultWorldState = {
  interactions: [],
  lastModified: null,
  objects: [],
  worldVersion: 1,
}

const upstreams = {
  clearbid: {
    baseUrl: process.env.CLEARBID_API_BASE || 'https://price-library.replit.app',
    token: env('CLEARBID_TOKEN', 'CLEARBIDTOKEN'),
    estimatesPath: process.env.CLEARBID_ESTIMATES_PATH || '/api/estimates',
    healthPath: process.env.CLEARBID_HEALTH_PATH || '/api/estimates',
  },
  ministry: {
    baseUrl: process.env.MINISTRY_API_BASE || 'https://ministry-companion.replit.app',
    token: env('MINISTRY_TOKEN', 'MINISTRYTOKEN'),
    hoursPath: process.env.MINISTRY_HOURS_PATH || '/api/hours',
    statsPath: process.env.MINISTRY_STATS_PATH || '/api/sync',
    healthPath: process.env.MINISTRY_HEALTH_PATH || '/api/sync',
  },
  kim: {
    baseUrl: process.env.KIM_API_BASE || 'https://kim-assistant.replit.app',
    token: env('KIM_TOKEN', 'KIMTOKEN'),
    statusPath: process.env.KIM_STATUS_PATH || '/api/events/briefing',
    healthPath: process.env.KIM_HEALTH_PATH || '/api/events',
  },
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(null, false)
  },
}))
app.use(express.json())

function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizeDashboardConfig(config) {
  const source = asObject(config)
  return {
    ...defaultDashboardConfig,
    ...source,
    documentLinks: Array.isArray(source.documentLinks)
      ? source.documentLinks
      : Array.isArray(source.documents)
        ? source.documents
        : defaultDashboardConfig.documentLinks,
    panels: Array.isArray(source.panels) ? source.panels : defaultDashboardConfig.panels,
    projectCards: Array.isArray(source.projectCards)
      ? source.projectCards
      : Array.isArray(source.projects)
        ? source.projects
        : defaultDashboardConfig.projectCards,
    theme: source.theme === 'light' ? 'light' : 'dark',
  }
}

function vectorFrom(value, fallback) {
  const source = asObject(value)
  return {
    x: Number.isFinite(Number(source.x)) ? Number(source.x) : fallback.x,
    y: Number.isFinite(Number(source.y)) ? Number(source.y) : fallback.y,
    z: Number.isFinite(Number(source.z)) ? Number(source.z) : fallback.z,
  }
}

function normalizeWorldObject(object, fallbackId = '') {
  const source = asObject(object)
  const id = String(source.id || fallbackId || `world-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const interactionType = ['examine', 'repair', 'collect', 'activate'].includes(source.interactionType)
    ? source.interactionType
    : 'examine'

  return {
    description: typeof source.description === 'string' ? source.description : '',
    id,
    interactable: source.interactable !== false,
    interactionType,
    modelUrl: typeof source.modelUrl === 'string' ? source.modelUrl : '',
    name: typeof source.name === 'string' && source.name.trim() ? source.name.trim() : 'World Object',
    position: vectorFrom(source.position, { x: 0, y: 0, z: 0 }),
    properties: asObject(source.properties),
    rotation: vectorFrom(source.rotation, { x: 0, y: 0, z: 0 }),
    scale: vectorFrom(source.scale, { x: 1, y: 1, z: 1 }),
  }
}

function normalizeInteraction(interaction) {
  const source = asObject(interaction)
  return {
    duration: Number.isFinite(Number(source.duration)) ? Number(source.duration) : 0,
    objectId: typeof source.objectId === 'string' ? source.objectId : '',
    timestamp: typeof source.timestamp === 'string' ? source.timestamp : new Date().toISOString(),
    type: typeof source.type === 'string' ? source.type : 'examine',
  }
}

function normalizeWorldState(state) {
  const source = asObject(state)
  return {
    interactions: Array.isArray(source.interactions) ? source.interactions.map(normalizeInteraction).slice(-500) : [],
    lastModified: typeof source.lastModified === 'string' ? source.lastModified : null,
    objects: Array.isArray(source.objects) ? source.objects.map((object) => normalizeWorldObject(object)) : [],
    worldVersion: Number.isFinite(Number(source.worldVersion)) ? Number(source.worldVersion) : 1,
  }
}

async function readDashboardConfig() {
  try {
    const text = await readFile(configPath, 'utf8')
    return normalizeDashboardConfig(JSON.parse(text))
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('Config read failed:', error.message)
    return normalizeDashboardConfig(defaultDashboardConfig)
  }
}

async function writeDashboardConfig(config) {
  await mkdir(dataDir, { recursive: true })
  const normalized = normalizeDashboardConfig({
    ...config,
    lastUpdatedAt: new Date().toISOString(),
  })
  const tempPath = `${configPath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  await rename(tempPath, configPath)
  return normalized
}

async function readWorldState() {
  try {
    const text = await readFile(worldPath, 'utf8')
    return normalizeWorldState(JSON.parse(text))
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn('World read failed:', error.message)
    return normalizeWorldState(defaultWorldState)
  }
}

async function writeWorldState(state) {
  await mkdir(dataDir, { recursive: true })
  const normalized = normalizeWorldState({
    ...state,
    lastModified: new Date().toISOString(),
    worldVersion: Number(state.worldVersion || 1),
  })
  const tempPath = `${worldPath}.${process.pid}.${Date.now()}.tmp`
  await writeFile(tempPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  await rename(tempPath, worldPath)
  return normalized
}

function toApiConfig(config) {
  return {
    ...config,
    documentLinks: config.documentLinks,
    projectCards: config.projectCards,
  }
}

async function getHealthSummary() {
  const checks = await Promise.all([
    callUpstream(upstreams.clearbid, upstreams.clearbid.healthPath, 'ClearBid API', 'Health check'),
    callUpstream(upstreams.ministry, upstreams.ministry.healthPath, 'Ministry Companion API', 'Health check'),
    callUpstream(upstreams.kim, upstreams.kim.healthPath, 'KIM Assistant API', 'Health check'),
  ])

  return {
    ok: checks.every((check) => check.ok),
    services: {
      clearbid: { ok: checks[0].ok, status: checks[0].ok ? 'online' : 'offline', latencyMs: checks[0].latencyMs, upstreamStatus: checks[0].status },
      ministry: { ok: checks[1].ok, status: checks[1].ok ? 'online' : 'offline', latencyMs: checks[1].latencyMs, upstreamStatus: checks[1].status },
      kim: { ok: checks[2].ok, status: checks[2].ok ? 'online' : 'offline', latencyMs: checks[2].latencyMs, upstreamStatus: checks[2].status },
    },
  }
}

async function logUsage(service, purpose, success, cost = '$0.00') {
  if (!usageWebhookUrl) return

  const payload = {
    timestamp: new Date().toISOString(),
    service,
    purpose,
    cost,
    success,
  }

  try {
    await fetch(usageWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    console.warn(`Usage log failed for ${service}:`, error.message)
  }
}

async function callUpstream({ baseUrl, token }, path, service, purpose, options = {}) {
  if (!token) {
    await logUsage(service, purpose, false)
    return {
      body: { error: `${service} token is not configured` },
      ok: false,
      status: 500,
    }
  }

  const startedAt = Date.now()
  try {
    const response = await fetch(joinUrl(baseUrl, path), {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      method: options.method || 'GET',
    })
    const text = await response.text()
    let body
    try {
      body = text ? JSON.parse(text) : {}
    } catch {
      body = { raw: text }
    }

    await logUsage(service, purpose, response.ok)
    return {
      body,
      latencyMs: Date.now() - startedAt,
      ok: response.ok,
      status: response.status,
    }
  } catch (error) {
    await logUsage(service, purpose, false)
    return {
      body: { error: error.message },
      latencyMs: Date.now() - startedAt,
      ok: false,
      status: 502,
    }
  }
}

function sendUpstreamResult(response, result) {
  response.status(result.status).json(result.body)
}

function countItems(value) {
  return Array.isArray(value) ? value.length : 0
}

function totalServiceHours(logs) {
  if (!Array.isArray(logs)) return 0
  return logs.reduce((sum, log) => {
    const hours = Number(log.hours ?? log.durationHours ?? log.serviceHours ?? 0)
    return Number.isFinite(hours) ? sum + hours : sum
  }, 0)
}

function normalizeMinistryStats(payload) {
  return {
    serviceHours: totalServiceHours(payload.serviceLogs).toFixed(1),
    returnVisits: countItems(payload.returnVisits),
    studies: countItems(payload.studies),
    visits: countItems(payload.visits),
    households: countItems(payload.households),
    serviceLogs: Array.isArray(payload.serviceLogs) ? payload.serviceLogs : [],
    returnVisitList: Array.isArray(payload.returnVisits) ? payload.returnVisits : [],
    studyList: Array.isArray(payload.studies) ? payload.studies : [],
    raw: payload,
  }
}

function normalizeKimStatus(payload) {
  const groups = [payload.overdue, payload.today, payload.upcoming, payload.unscheduled]
  const pendingTasks = groups.flatMap((group) => Array.isArray(group) ? group : [])

  return {
    status: pendingTasks.length > 0 ? 'active' : 'clear',
    pendingTasks,
    pendingTaskCount: pendingTasks.length,
    briefing: payload,
  }
}

app.get('/', (_request, response) => {
  response.json({
    name: 'Enforge Command Center Proxy',
    endpoints: [
      '/api/health',
      '/api/admin/config',
      '/api/admin/status',
      '/api/clearbid/estimates',
      '/api/ministry/stats',
      '/api/ministry/hours',
      '/api/kim/status',
      '/api/world/state',
      '/api/world/objects',
      '/api/world/interactions',
      '/api/world/reset',
    ],
  })
})

app.get('/api/admin/config', async (_request, response) => {
  const config = await readDashboardConfig()
  response.json(toApiConfig(config))
})

app.post('/api/admin/config', async (request, response) => {
  const current = await readDashboardConfig()
  const body = asObject(request.body)
  const next = await writeDashboardConfig({
    ...current,
    ...body,
    documentLinks: Array.isArray(body.documentLinks) ? body.documentLinks : Array.isArray(body.documents) ? body.documents : current.documentLinks,
    panels: Array.isArray(body.panels) ? body.panels : current.panels,
    projectCards: Array.isArray(body.projectCards) ? body.projectCards : Array.isArray(body.projects) ? body.projects : current.projectCards,
  })
  await logUsage('Admin API', 'Update dashboard config', true)
  response.json({ config: toApiConfig(next), ok: true })
})

app.get('/api/admin/status', async (_request, response) => {
  const [config, health] = await Promise.all([
    readDashboardConfig(),
    getHealthSummary(),
  ])

  response.json({
    documentLinkCount: config.documentLinks.length,
    health,
    lastConfigUpdateTime: config.lastUpdatedAt,
    panels: config.panels.map((panel) => ({ id: panel.id, label: panel.label, visible: panel.visible })),
    projectCardCount: config.projectCards.length,
    theme: config.theme,
  })
})

app.get('/api/clearbid/estimates', async (_request, response) => {
  const result = await callUpstream(upstreams.clearbid, upstreams.clearbid.estimatesPath, 'ClearBid API', 'Fetch recent estimates')
  sendUpstreamResult(response, result)
})

app.get('/api/ministry/stats', async (_request, response) => {
  const result = await callUpstream(upstreams.ministry, upstreams.ministry.statsPath, 'Ministry Companion API', 'Fetch ministry stats')
  response.status(result.status).json(result.ok ? normalizeMinistryStats(result.body) : result.body)
})

app.post('/api/ministry/hours', async (request, response) => {
  const result = await callUpstream(
    upstreams.ministry,
    upstreams.ministry.hoursPath,
    'Ministry Companion API',
    'Log ministry hours',
    { body: request.body, method: 'POST' },
  )
  response.status(result.status).json(result.body)
})

app.get('/api/kim/status', async (_request, response) => {
  const result = await callUpstream(upstreams.kim, upstreams.kim.statusPath, 'KIM Assistant API', 'Fetch KIM status')
  response.status(result.status).json(result.ok ? normalizeKimStatus(result.body) : result.body)
})

app.get('/api/health', async (_request, response) => {
  response.json(await getHealthSummary())
})

app.get('/api/world/state', async (_request, response) => {
  response.json(await readWorldState())
})

app.post('/api/world/objects', async (request, response) => {
  const world = await readWorldState()
  const object = normalizeWorldObject(request.body)
  const next = await writeWorldState({
    ...world,
    objects: [...world.objects, object],
    worldVersion: world.worldVersion + 1,
  })
  await logUsage('World Engine API', `Add world object: ${object.name}`, true)
  response.status(201).json({ objectId: object.id, ok: true, worldVersion: next.worldVersion })
})

app.patch('/api/world/objects/:id', async (request, response) => {
  const world = await readWorldState()
  const id = request.params.id
  const index = world.objects.findIndex((object) => object.id === id)
  if (index === -1) {
    response.status(404).json({ error: `World object not found: ${id}` })
    return
  }

  const nextObjects = [...world.objects]
  nextObjects[index] = normalizeWorldObject({ ...nextObjects[index], ...asObject(request.body), id })
  const next = await writeWorldState({
    ...world,
    objects: nextObjects,
    worldVersion: world.worldVersion + 1,
  })
  await logUsage('World Engine API', `Update world object: ${id}`, true)
  response.json({ object: nextObjects[index], ok: true, worldVersion: next.worldVersion })
})

app.delete('/api/world/objects/:id', async (request, response) => {
  const world = await readWorldState()
  const id = request.params.id
  const nextObjects = world.objects.filter((object) => object.id !== id)
  if (nextObjects.length === world.objects.length) {
    response.status(404).json({ error: `World object not found: ${id}` })
    return
  }

  const next = await writeWorldState({
    ...world,
    objects: nextObjects,
    worldVersion: world.worldVersion + 1,
  })
  await logUsage('World Engine API', `Remove world object: ${id}`, true)
  response.json({ ok: true, worldVersion: next.worldVersion })
})

app.post('/api/world/reset', async (_request, response) => {
  const next = await writeWorldState({
    ...defaultWorldState,
    worldVersion: 1,
  })
  await logUsage('World Engine API', 'Reset persistent world', true)
  response.json({ ok: true, state: next })
})

app.get('/api/world/interactions', async (_request, response) => {
  const world = await readWorldState()
  response.json({ interactions: world.interactions })
})

app.post('/api/world/interactions', async (request, response) => {
  const world = await readWorldState()
  const interaction = normalizeInteraction({
    ...asObject(request.body),
    timestamp: new Date().toISOString(),
  })
  if (!interaction.objectId) {
    response.status(400).json({ error: 'objectId is required' })
    return
  }

  const next = await writeWorldState({
    ...world,
    interactions: [...world.interactions, interaction].slice(-500),
  })
  await logUsage('World Engine API', `Log world interaction: ${interaction.type}`, true)
  response.status(201).json({ interaction, ok: true, worldVersion: next.worldVersion })
})

app.use((error, _request, response, _next) => {
  response.status(500).json({ error: error.message })
})

await mkdir(dataDir, { recursive: true })

app.listen(port, () => {
  console.log(`Enforge proxy listening on port ${port}`)
})
