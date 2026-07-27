export type HealthState = 'online' | 'offline' | 'pending'

export type HealthResponse = {
  services?: Record<string, { ok?: boolean; status?: string; latencyMs?: number; error?: string }>
}

export type DashboardData = {
  clearbidVolume: string
  openEstimates: string
  ministryHours: string
  kimPendingTasks: string
  details: {
    clearbid: string
    ministry: string
    kim: string
  }
  health: Record<string, HealthState>
  error?: string
}

const proxyBaseUrl = import.meta.env.VITE_COMMAND_CENTER_PROXY_URL

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { currency: 'USD', maximumFractionDigits: 0, style: 'currency' }).format(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  for (const key of ['estimates', 'items', 'results', 'data']) {
    if (Array.isArray(record[key])) return record[key]
  }
  return []
}

function numberFrom(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.-]/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

function stringFrom(record: Record<string, unknown>, keys: string[], fallback: string) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

async function fetchJson(path: string) {
  if (!proxyBaseUrl) throw new Error('VITE_COMMAND_CENTER_PROXY_URL is not configured')

  const response = await fetch(`${proxyBaseUrl.replace(/\/$/, '')}${path}`)
  if (!response.ok) throw new Error(`${path} returned ${response.status}`)
  return response.json() as Promise<unknown>
}

function summarizeClearBid(payload: unknown) {
  const estimates = asArray(payload)
  const total = estimates.reduce<number>(
    (sum, item) => sum + numberFrom(asRecord(item), ['total', 'amount', 'price', 'value']),
    0,
  )
  const open = estimates.filter((item) => {
    const status = String(asRecord(item).status ?? '').toLowerCase()
    return !status || ['open', 'pending', 'draft', 'sent'].includes(status)
  }).length

  return {
    openEstimates: String(open || estimates.length),
    volume: formatCurrency(total),
    detail: estimates.length > 0 ? `${estimates.length} recent estimates loaded` : 'No recent estimates returned',
  }
}

function summarizeMinistry(payload: unknown) {
  const record = asRecord(payload)
  return {
    hours: stringFrom(record, ['serviceHours', 'hours', 'monthlyHours'], '0.0'),
    detail: `${stringFrom(record, ['returnVisits', 'visits'], '0')} return visits · ${stringFrom(record, ['studies', 'bibleStudies'], '0')} studies`,
  }
}

function summarizeKim(payload: unknown) {
  const record = asRecord(payload)
  const pending = record.pendingTasks ?? record.pending ?? record.tasks
  const pendingCount = Array.isArray(pending) ? pending.length : stringFrom(record, ['pendingTasks', 'pendingTaskCount', 'pending'], '0')
  return {
    pendingTasks: String(pendingCount),
    detail: stringFrom(record, ['status', 'state', 'message'], 'KIM status loaded'),
  }
}

function summarizeHealth(payload: unknown): Record<string, HealthState> {
  const services = asRecord(asRecord(payload).services)
  const next: Record<string, HealthState> = {}
  for (const [key, value] of Object.entries(services)) {
    const service = asRecord(value)
    next[key] = service.ok === true || service.status === 'online' ? 'online' : 'offline'
  }
  return next
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const [healthResult, estimatesResult, ministryResult, kimResult] = await Promise.allSettled([
    fetchJson('/api/health'),
    fetchJson('/api/clearbid/estimates'),
    fetchJson('/api/ministry/stats'),
    fetchJson('/api/kim/status'),
  ])

  const clearbid = estimatesResult.status === 'fulfilled'
    ? summarizeClearBid(estimatesResult.value)
    : { detail: estimatesResult.reason instanceof Error ? estimatesResult.reason.message : 'ClearBid failed', openEstimates: '0', volume: '$0' }
  const ministry = ministryResult.status === 'fulfilled'
    ? summarizeMinistry(ministryResult.value)
    : { detail: ministryResult.reason instanceof Error ? ministryResult.reason.message : 'Ministry failed', hours: '0.0' }
  const kim = kimResult.status === 'fulfilled'
    ? summarizeKim(kimResult.value)
    : { detail: kimResult.reason instanceof Error ? kimResult.reason.message : 'KIM failed', pendingTasks: '0' }

  return {
    clearbidVolume: clearbid.volume,
    openEstimates: clearbid.openEstimates,
    ministryHours: ministry.hours,
    kimPendingTasks: kim.pendingTasks,
    details: {
      clearbid: clearbid.detail,
      ministry: ministry.detail,
      kim: kim.detail,
    },
    health: healthResult.status === 'fulfilled' ? summarizeHealth(healthResult.value) : {},
    error: [healthResult, estimatesResult, ministryResult, kimResult].some((result) => result.status === 'rejected')
      ? 'One or more live data calls failed. Check proxy health and Replit secrets.'
      : undefined,
  }
}
