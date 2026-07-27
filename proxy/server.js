import cors from 'cors'
import express from 'express'

const app = express()
const port = process.env.PORT || 3000

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://enforgedesigns.com,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

function env(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name]
  }
  return ''
}

const usageWebhookUrl = env('USAGE_LOG_WEBHOOK_URL', 'USAGELOGWEBHOOK_URL')

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
    callback(new Error(`Origin not allowed: ${origin}`))
  },
}))
app.use(express.json())

function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`
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
    endpoints: ['/api/health', '/api/clearbid/estimates', '/api/ministry/stats', '/api/ministry/hours', '/api/kim/status'],
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
  const checks = await Promise.all([
    callUpstream(upstreams.clearbid, upstreams.clearbid.healthPath, 'ClearBid API', 'Health check'),
    callUpstream(upstreams.ministry, upstreams.ministry.healthPath, 'Ministry Companion API', 'Health check'),
    callUpstream(upstreams.kim, upstreams.kim.healthPath, 'KIM Assistant API', 'Health check'),
  ])

  response.json({
    ok: checks.every((check) => check.ok),
    services: {
      clearbid: { ok: checks[0].ok, status: checks[0].ok ? 'online' : 'offline', latencyMs: checks[0].latencyMs, upstreamStatus: checks[0].status },
      ministry: { ok: checks[1].ok, status: checks[1].ok ? 'online' : 'offline', latencyMs: checks[1].latencyMs, upstreamStatus: checks[1].status },
      kim: { ok: checks[2].ok, status: checks[2].ok ? 'online' : 'offline', latencyMs: checks[2].latencyMs, upstreamStatus: checks[2].status },
    },
  })
})

app.use((error, _request, response, _next) => {
  response.status(500).json({ error: error.message })
})

app.listen(port, () => {
  console.log(`Enforge proxy listening on port ${port}`)
})
