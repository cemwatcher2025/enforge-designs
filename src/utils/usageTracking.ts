export type UsageLogEntry = {
  timestamp: string
  service: string
  purpose: string
  cost?: string
  success: boolean
}

const storageKey = 'enforge-command-center-usage-v1'

export function readUsageLog(): UsageLogEntry[] {
  const stored = window.localStorage.getItem(storageKey)
  if (!stored) return []

  try {
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function logUsage(entry: Omit<UsageLogEntry, 'timestamp'>) {
  const usageEntry: UsageLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }
  const nextLog = [usageEntry, ...readUsageLog()].slice(0, 200)
  window.localStorage.setItem(storageKey, JSON.stringify(nextLog))

  const endpoint = import.meta.env.VITE_USAGE_LOG_ENDPOINT
  if (!endpoint) return usageEntry

  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(usageEntry),
  })

  return usageEntry
}
