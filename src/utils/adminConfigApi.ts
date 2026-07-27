import { normalizeAdminConfig, type AdminConfig } from '../config'

export type AdminApiStatus = {
  connected: boolean
  lastSync: string
  message: string
}

type RemoteAdminConfig = Partial<AdminConfig> & {
  documentLinks?: AdminConfig['documents']
  projectCards?: AdminConfig['projects']
}

const proxyBaseUrl = import.meta.env.VITE_COMMAND_CENTER_PROXY_URL

function proxyUrl(path: string) {
  if (!proxyBaseUrl) throw new Error('VITE_COMMAND_CENTER_PROXY_URL is not configured')
  return `${proxyBaseUrl.replace(/\/$/, '')}${path}`
}

function nowLabel() {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date())
}

function remotePayload(config: AdminConfig) {
  return {
    activeProject: config.activeProject,
    apiEndpoints: config.apiEndpoints,
    comms: config.comms,
    documentLinks: config.documents,
    ministry: config.ministry,
    panels: config.panels,
    projectCards: config.projects,
    sandbox3d: config.sandbox3d,
    theme: config.theme,
  }
}

export async function fetchRemoteAdminConfig() {
  const response = await fetch(proxyUrl('/api/admin/config'))
  const payload = await response.json().catch(() => ({})) as RemoteAdminConfig
  if (!response.ok) throw new Error(`Admin config returned ${response.status}`)
  return normalizeAdminConfig(payload)
}

export async function saveRemoteAdminConfig(config: AdminConfig) {
  const response = await fetch(proxyUrl('/api/admin/config'), {
    body: JSON.stringify(remotePayload(config)),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = await response.json().catch(() => ({})) as { config?: RemoteAdminConfig; ok?: boolean }
  if (!response.ok || payload.ok === false) throw new Error(`Admin config save returned ${response.status}`)
  return normalizeAdminConfig(payload.config ?? remotePayload(config))
}

export function connectedStatus(message = 'Admin API connected.'): AdminApiStatus {
  return { connected: true, lastSync: nowLabel(), message }
}

export function disconnectedStatus(message: string): AdminApiStatus {
  return { connected: false, lastSync: nowLabel(), message }
}
