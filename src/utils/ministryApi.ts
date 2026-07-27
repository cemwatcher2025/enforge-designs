export type MinistryEntryType = 'field-service' | 'return-visit' | 'bible-study'
export type VisitStatus = 'active' | 'needs-follow-up' | 'paused'

export type MinistryActivityEntry = {
  id: string
  date: string
  type: MinistryEntryType
  hours: number
  notes: string
}

export type ReturnVisit = {
  id: string
  name: string
  lastVisitDate: string
  status: VisitStatus
}

export type BibleStudy = {
  id: string
  name: string
  progress: string
  lastStudyDate: string
}

export type MinistryStatsData = {
  averageHoursPerMonth: number
  bibleStudiesCount: number
  currentMonthHours: number
  currentMonthReturnVisits: number
  currentMonthStudies: number
  entries: MinistryActivityEntry[]
  hoursComparisonPercent: number
  publishers?: number
  returnVisits: ReturnVisit[]
  studies: BibleStudy[]
  yearToDateHours: number
}

export type MinistryHoursPayload = {
  date: string
  hours: number
  notes?: string
  type: MinistryEntryType
}

const proxyBaseUrl = import.meta.env.VITE_COMMAND_CENTER_PROXY_URL

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  for (const key of ['serviceLogs', 'entries', 'activity', 'logs', 'data', 'results']) {
    if (Array.isArray(record[key])) return record[key]
  }
  return []
}

function nestedArray(payload: unknown, keys: string[]) {
  const record = asRecord(payload)
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key]
  }
  const raw = asRecord(record.raw)
  for (const key of keys) {
    if (Array.isArray(raw[key])) return raw[key]
  }
  return []
}

function numberFrom(record: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.-]/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return fallback
}

function stringFrom(record: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

function normalizeDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10)
}

function normalizeType(value: string): MinistryEntryType {
  const lowered = value.toLowerCase()
  if (lowered.includes('study')) return 'bible-study'
  if (lowered.includes('return') || lowered.includes('visit')) return 'return-visit'
  return 'field-service'
}

function normalizeStatus(value: string): VisitStatus {
  const lowered = value.toLowerCase()
  if (lowered.includes('pause')) return 'paused'
  if (lowered.includes('follow') || lowered.includes('due') || lowered.includes('need')) return 'needs-follow-up'
  return 'active'
}

function monthKey(dateValue: string) {
  return normalizeDate(dateValue).slice(0, 7)
}

function previousMonthKey(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth() - 1, 1).toISOString().slice(0, 7)
}

function currentMonthKey(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth(), 1).toISOString().slice(0, 7)
}

function normalizeEntries(payload: unknown): MinistryActivityEntry[] {
  return asArray({ serviceLogs: nestedArray(payload, ['serviceLogs', 'entries', 'activity', 'logs']) }).map((item, index) => {
    const record = asRecord(item)
    const date = normalizeDate(stringFrom(record, ['date', 'serviceDate', 'createdAt', 'loggedAt'], new Date().toISOString()))
    return {
      date,
      hours: numberFrom(record, ['hours', 'durationHours', 'serviceHours'], 0),
      id: stringFrom(record, ['id', '_id'], `entry-${index}-${date}`),
      notes: stringFrom(record, ['notes', 'note', 'description', 'summary'], ''),
      type: normalizeType(stringFrom(record, ['type', 'activityType', 'category'], 'field-service')),
    }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

function normalizeReturnVisits(payload: unknown): ReturnVisit[] {
  return nestedArray(payload, ['returnVisitList', 'returnVisits', 'visits']).map((item, index) => {
    const record = asRecord(item)
    const name = stringFrom(record, ['name', 'contactName', 'person', 'householder'], `Contact ${index + 1}`)
    return {
      id: stringFrom(record, ['id', '_id'], `return-visit-${index}-${name}`),
      lastVisitDate: normalizeDate(stringFrom(record, ['lastVisitDate', 'lastVisit', 'date', 'updatedAt'], new Date().toISOString())),
      name,
      status: normalizeStatus(stringFrom(record, ['status', 'followUpStatus'], 'active')),
    }
  })
}

function normalizeStudies(payload: unknown): BibleStudy[] {
  return nestedArray(payload, ['studyList', 'studies', 'bibleStudies']).map((item, index) => {
    const record = asRecord(item)
    const name = stringFrom(record, ['name', 'contactName', 'student', 'person'], `Study ${index + 1}`)
    return {
      id: stringFrom(record, ['id', '_id'], `study-${index}-${name}`),
      lastStudyDate: normalizeDate(stringFrom(record, ['lastStudyDate', 'lastStudy', 'date', 'updatedAt'], new Date().toISOString())),
      name,
      progress: stringFrom(record, ['progress', 'lesson', 'lessonNumber', 'topic'], 'Progress not set'),
    }
  })
}

function normalizeMinistryStats(payload: unknown): MinistryStatsData {
  const record = asRecord(payload)
  const entries = normalizeEntries(payload)
  const returnVisits = normalizeReturnVisits(payload)
  const studies = normalizeStudies(payload)
  const thisMonth = currentMonthKey()
  const lastMonth = previousMonthKey()
  const currentEntries = entries.filter((entry) => monthKey(entry.date) === thisMonth)
  const previousHours = entries
    .filter((entry) => monthKey(entry.date) === lastMonth)
    .reduce((sum, entry) => sum + entry.hours, 0)
  const currentMonthHours = currentEntries.reduce((sum, entry) => sum + entry.hours, 0)
  const ytdEntries = entries.filter((entry) => normalizeDate(entry.date).startsWith(String(new Date().getFullYear())))
  const yearToDateHours = ytdEntries.reduce((sum, entry) => sum + entry.hours, 0)
  const fallbackHours = numberFrom(record, ['serviceHours', 'hours', 'monthlyHours'], currentMonthHours)

  return {
    averageHoursPerMonth: yearToDateHours > 0 ? yearToDateHours / (new Date().getMonth() + 1) : 0,
    bibleStudiesCount: numberFrom(record, ['studies', 'bibleStudies'], studies.length),
    currentMonthHours: currentMonthHours || fallbackHours,
    currentMonthReturnVisits: currentEntries.filter((entry) => entry.type === 'return-visit').length || numberFrom(record, ['returnVisits', 'visits'], returnVisits.length),
    currentMonthStudies: currentEntries.filter((entry) => entry.type === 'bible-study').length || numberFrom(record, ['studies', 'bibleStudies'], studies.length),
    entries,
    hoursComparisonPercent: previousHours > 0 ? ((currentMonthHours - previousHours) / previousHours) * 100 : 0,
    publishers: numberFrom(record, ['publishers', 'publisherCount', 'groupPublishers'], 0) || undefined,
    returnVisits,
    studies,
    yearToDateHours,
  }
}

async function fetchProxy(path: string, init?: RequestInit) {
  if (!proxyBaseUrl) throw new Error('VITE_COMMAND_CENTER_PROXY_URL is not configured')
  const response = await fetch(`${proxyBaseUrl.replace(/\/$/, '')}${path}`, init)
  const payload = await response.json().catch(() => ({})) as unknown
  if (!response.ok) throw new Error(stringFrom(asRecord(payload), ['error', 'message'], `${path} returned ${response.status}`))
  return payload
}

export async function fetchMinistryStats() {
  return normalizeMinistryStats(await fetchProxy('/api/ministry/stats'))
}

export async function logMinistryHours(payload: MinistryHoursPayload) {
  return fetchProxy('/api/ministry/hours', {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
}
