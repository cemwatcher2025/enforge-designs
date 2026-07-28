import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { AdminPanel } from './components/AdminPanel'
import { CommsHub } from './components/CommsHub'
import { KIMSystem } from './components/KIMSystem'
import { MinistryPanel } from './components/MinistryPanel'
import { Sandbox3D } from './components/Sandbox3D'
import { defaultAdminConfig, normalizeAdminConfig, type Accent, type AdminConfig, type PanelId, type ServiceState } from './config'
import { connectedStatus, disconnectedStatus, fetchRemoteAdminConfig, saveRemoteAdminConfig, type AdminApiStatus } from './utils/adminConfigApi'
import { fetchDashboardData, type DashboardData } from './utils/commandCenterApi'
import { logUsage, readUsageLog } from './utils/usageTracking'

const configStorageKey = 'enforge-admin-config'

type Service = {
  id: string
  name: string
  endpoint: string
  state: ServiceState
  purpose: string
}

type LogisticsMetric = {
  label: string
  value: string
  detail: string
  accent: Accent
}

type UsageRow = {
  service: string
  calls: number
  cost: string
  successRate: string
}

type ActionRun = {
  id: number
  name?: string
  event?: string
  status?: string
  conclusion?: string | null
  html_url?: string
  updated_at?: string
}

type ActionsResponse = {
  workflow_runs?: ActionRun[]
}

const services: Service[] = [
  {
    id: 'clearbid',
    name: 'ClearBid',
    endpoint: '/api/clearbid/estimates',
    state: 'pending',
    purpose: 'Estimates, job volume, pricing status',
  },
  {
    id: 'ministry',
    name: 'Ministry Companion',
    endpoint: '/api/ministry/stats',
    state: 'pending',
    purpose: 'Hours, return visits, studies',
  },
  {
    id: 'kim',
    name: 'KIM Assistant',
    endpoint: '/api/kim/status',
    state: 'pending',
    purpose: 'Task status, recent actions, assistant health',
  },
  {
    id: 'usage',
    name: 'Google Workspace',
    endpoint: 'Usage webhook / Google Sheet',
    state: 'pending',
    purpose: 'Usage tracking, comms, schedule',
  },
]

const logisticsMetrics: LogisticsMetric[] = [
  { label: 'ClearBid volume', value: '$0', detail: 'Awaiting API proxy connection', accent: 'cyan' },
  { label: 'Open estimates', value: '0', detail: 'No live feed connected yet', accent: 'magenta' },
  { label: 'Ministry hours', value: '0.0', detail: 'Current month placeholder', accent: 'lime' },
  { label: 'KIM pending tasks', value: '0', detail: 'Assistant feed not connected', accent: 'orange' },
]

function metricsFromDashboard(data: DashboardData | null): LogisticsMetric[] {
  if (!data) return logisticsMetrics

  return [
    { label: 'ClearBid volume', value: data.clearbidVolume, detail: data.details.clearbid, accent: 'cyan' },
    { label: 'Open estimates', value: data.openEstimates, detail: 'Recent estimates from proxy', accent: 'magenta' },
    { label: 'Ministry hours', value: data.ministryHours, detail: data.details.ministry, accent: 'lime' },
    { label: 'KIM pending tasks', value: data.kimPendingTasks, detail: data.details.kim, accent: 'orange' },
  ]
}

const usageRows: UsageRow[] = [
  { service: 'ClearBid API', calls: 0, cost: '$0.00', successRate: '-' },
  { service: 'KIM Assistant API', calls: 0, cost: '$0.00', successRate: '-' },
  { service: 'Ministry Companion API', calls: 0, cost: '$0.00', successRate: '-' },
  { service: 'Google Sheets logging', calls: 0, cost: '$0.00', successRate: '-' },
]

const fallbackConfig: AdminConfig = defaultAdminConfig

function statusLabel(state: ServiceState) {
  if (state === 'online') return 'Online'
  if (state === 'offline') return 'Offline'
  return 'Needs connection'
}

function formatRunTime(value?: string) {
  if (!value) return 'No timestamp'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No timestamp'
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(date)
}

function runLabel(run: ActionRun) {
  if (run.status === 'completed') return run.conclusion ?? 'completed'
  return run.status ?? 'unknown'
}

function readAdminConfig(): AdminConfig {
  try {
    const saved = window.localStorage.getItem(configStorageKey)
    if (!saved) return fallbackConfig
    return normalizeAdminConfig(JSON.parse(saved) as Partial<AdminConfig>)
  } catch {
    return fallbackConfig
  }
}

function writeAdminConfig(config: AdminConfig) {
  window.localStorage.setItem(configStorageKey, JSON.stringify(config))
}

function routeFromLocation() {
  return window.location.pathname === '/admin' ? 'admin' : 'dashboard'
}

function App() {
  const [adminConfig, setAdminConfig] = useState(readAdminConfig)
  const [adminApiStatus, setAdminApiStatus] = useState<AdminApiStatus>(() => disconnectedStatus('Admin API not checked yet.'))
  const adminApiWritable = useRef(false)
  const [route, setRoute] = useState(routeFromLocation)
  const [usageCount, setUsageCount] = useState(() => readUsageLog().length)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyStatus, setReplyStatus] = useState('No reply staged yet.')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [liveDataStatus, setLiveDataStatus] = useState('Live data not loaded yet.')
  const [ministryLogPrefill, setMinistryLogPrefill] = useState<{ hours: string; type: string } | undefined>()
  const [documentQuery, setDocumentQuery] = useState('')
  const [actionRuns, setActionRuns] = useState<ActionRun[]>([])
  const [actionsStatus, setActionsStatus] = useState('Loading GitHub Actions status...')
  const currentUsageRows = useMemo(
    () =>
      usageRows.map((row) =>
        row.service === 'Google Sheets logging'
          ? { ...row, calls: usageCount, successRate: usageCount > 0 ? 'local' : '-' }
          : row,
      ),
    [usageCount],
  )
  const currentMetrics = useMemo(() => metricsFromDashboard(dashboardData), [dashboardData])
  const currentServices = useMemo(
    () =>
      services.map((service) => ({
        ...service,
        state: service.id === 'usage' && usageCount > 0 ? 'online' : dashboardData?.health[service.id] ?? service.state,
      })),
    [dashboardData, usageCount],
  )
  const health = useMemo(
    () => Object.fromEntries(currentServices.map((service) => [service.id, service.state])),
    [currentServices],
  )
  const visiblePanelIds = useMemo(
    () => adminConfig.panels.filter((panel) => panel.visible).map((panel) => panel.id),
    [adminConfig.panels],
  )
  const visibleDocuments = useMemo(() => {
    const query = documentQuery.trim().toLowerCase()
    if (!query) return adminConfig.documents

    return adminConfig.documents.filter((document) => {
      const haystack = [document.title, document.detail, ...document.tags].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [adminConfig.documents, documentQuery])
  const dashboardSummary = useMemo(() => ({
    ministryHours: dashboardData?.ministryHours ?? '0.0',
    nextMeeting: 'Calendar live events need a Google Calendar connector before I can read the next meeting.',
    todayMeetings: 0,
    unreadEmails: null,
  }), [dashboardData])

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      try {
        const data = await fetchDashboardData()
        if (cancelled) return
        setDashboardData(data)
        setLiveDataStatus(data.error ?? 'Live data loaded from proxy.')
      } catch (error) {
        if (cancelled) return
        setLiveDataStatus(error instanceof Error ? error.message : 'Live data unavailable.')
      }
    }

    void loadDashboard()
    const interval = window.setInterval(loadDashboard, 60000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    writeAdminConfig(adminConfig)
    document.body.dataset.theme = adminConfig.theme
  }, [adminConfig])

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      fetchRemoteAdminConfig()
        .then((remoteConfig) => {
          if (cancelled) return
          adminApiWritable.current = true
          setAdminConfig((currentConfig) => ({
            ...remoteConfig,
            kim: {
              ...remoteConfig.kim,
              elevenLabsApiKey: currentConfig.kim.elevenLabsApiKey,
            },
          }))
          setAdminApiStatus(connectedStatus('Remote config loaded.'))
        })
        .catch((error) => {
          if (cancelled) return
          adminApiWritable.current = false
          setAdminApiStatus(disconnectedStatus(error instanceof Error ? error.message : 'Admin API unavailable. Using local config.'))
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (!adminApiWritable.current) return undefined
    const timeout = window.setTimeout(() => {
      saveRemoteAdminConfig(adminConfig)
        .then(() => setAdminApiStatus(connectedStatus('Config synced to proxy.')))
        .catch((error) => {
          adminApiWritable.current = false
          setAdminApiStatus(disconnectedStatus(error instanceof Error ? error.message : 'Admin API sync failed. Saved locally.'))
        })
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [adminConfig])

  useEffect(() => {
    function syncRoute() {
      setRoute(routeFromLocation())
    }

    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadActionsStatus() {
      try {
        const response = await fetch('https://api.github.com/repos/cemwatcher2025/enforge-designs/actions/runs?per_page=3')
        if (!response.ok) throw new Error(`GitHub Actions returned ${response.status}`)
        const data = await response.json() as ActionsResponse
        if (cancelled) return
        setActionRuns(data.workflow_runs ?? [])
        setActionsStatus('GitHub Actions status loaded.')
      } catch (error) {
        if (cancelled) return
        setActionsStatus(error instanceof Error ? error.message : 'GitHub Actions status unavailable.')
      }
    }

    void loadActionsStatus()
    const interval = window.setInterval(loadActionsStatus, 120000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [])

  async function stageReply() {
    const purpose = replyDraft.trim() ? 'Stage communications reply draft' : 'Stage empty communications check'
    try {
      await logUsage({ service: 'Communications Hub', purpose, cost: '$0.00', success: true })
      setUsageCount(readUsageLog().length)
      setReplyStatus('Reply activity logged locally. Google Sheet sync activates when VITE_USAGE_LOG_ENDPOINT is configured.')
    } catch {
      setReplyStatus('Local log saved, but remote usage sync failed.')
    }
  }

  function updateAdminConfig(nextConfig: AdminConfig) {
    setAdminConfig(nextConfig)
  }

  function resetAdminConfig() {
    setAdminConfig(fallbackConfig)
  }

  function openAdmin() {
    window.history.pushState({}, '', '/admin')
    setRoute('admin')
  }

  function openDashboard() {
    window.history.pushState({}, '', '/')
    setRoute('dashboard')
  }

  function setActiveProject(activeProject: string) {
    updateAdminConfig({ ...adminConfig, activeProject })
  }

  function shouldShowPanel(id: PanelId) {
    return visiblePanelIds.includes(id)
  }

  function endpointFor(id: string, fallback: string) {
    return adminConfig.apiEndpoints.find((endpoint) => endpoint.id === id)?.endpoint ?? fallback
  }

  function renderPanel(id: PanelId) {
    if (!shouldShowPanel(id)) return null

    if (id === 'logistics') {
      return (
        <article className="panel panel-large">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Panel 01</p>
              <h2>Logistics Dashboard</h2>
            </div>
            <span className="panel-badge">Live</span>
          </div>

          <div className="metric-grid">
            {currentMetrics.map((metric) => (
              <div className="metric-card" data-accent={metric.accent} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.detail}</p>
              </div>
            ))}
          </div>

          <div className="service-list">
            {currentServices.slice(0, 3).map((service) => (
              <div className="service-row" key={service.name}>
                <div>
                  <strong>{service.name}</strong>
                  <span>{service.purpose}</span>
                </div>
                <code>{endpointFor(service.id, service.endpoint)}</code>
              </div>
            ))}
          </div>
          <p className="panel-note">{liveDataStatus}</p>
        </article>
      )
    }

    if (id === 'communications') {
      return (
        <CommsHub
          config={adminConfig.comms}
          onStageReply={stageReply}
          replyDraft={replyDraft}
          replyStatus={replyStatus}
          setReplyDraft={setReplyDraft}
        />
      )
    }

    if (id === 'coding') {
      return (
        <article className="panel panel-wide coding-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Panel 03</p>
              <h2>Coding Sandbox</h2>
            </div>
            <span className="panel-badge">Phase 2</span>
          </div>

          <div className="active-project">
            <label htmlFor="active-project">Active project</label>
            <select id="active-project" onChange={(event) => setActiveProject(event.target.value)} value={adminConfig.activeProject}>
              {adminConfig.projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div className="project-grid">
            {adminConfig.projects.map((project) => (
              <a
                className="project-card"
                data-active={project.id === adminConfig.activeProject}
                href={project.href}
                key={project.id}
                rel="noreferrer"
                target="_blank"
              >
                <span>{project.type}</span>
                <strong>{project.name}</strong>
                <p>{project.detail}</p>
                <em>{project.status}</em>
              </a>
            ))}
          </div>

          <div className="terminal-feed" aria-label="Recent Enforge Designs GitHub Actions status">
            <div className="terminal-title">
              <strong>enforge-designs/actions</strong>
              <span>{actionsStatus}</span>
            </div>
            {actionRuns.length > 0 ? (
              actionRuns.map((run) => (
                <a href={run.html_url} key={run.id} rel="noreferrer" target="_blank">
                  <code>{run.event ?? 'workflow'}</code>
                  <span>{run.name ?? 'GitHub Pages'}</span>
                  <strong data-result={run.conclusion ?? run.status ?? 'unknown'}>{runLabel(run)}</strong>
                  <em>{formatRunTime(run.updated_at)}</em>
                </a>
              ))
            ) : (
              <p>No workflow runs loaded yet.</p>
            )}
          </div>
        </article>
      )
    }

    if (id === 'documents') {
      return (
        <article className="panel panel-wide documents-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Panel 04</p>
              <h2>Documents</h2>
            </div>
            <span className="panel-badge">Phase 2</span>
          </div>

          <label className="document-search" htmlFor="document-search">
            <span>Search docs</span>
            <input
              id="document-search"
              onChange={(event) => setDocumentQuery(event.target.value)}
              placeholder="Filter by title or tag"
              type="search"
              value={documentQuery}
            />
          </label>

          <div className="document-list">
            {visibleDocuments.map((document) => (
              <a className="document-card" href={document.href} key={document.id} rel="noreferrer" target="_blank">
                <strong>{document.title}</strong>
                <p>{document.detail}</p>
                <span>{document.tags.join(' · ')}</span>
              </a>
            ))}
            {visibleDocuments.length === 0 && <p className="panel-note">No docs match that filter.</p>}
          </div>
        </article>
      )
    }

    if (id === 'settings') {
      return (
        <article className="panel settings-panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Settings</p>
              <h2>Usage + Manifest</h2>
            </div>
            <button className="small-action" onClick={openAdmin} type="button">Admin</button>
          </div>
          <div className="usage-table">
            {currentUsageRows.map((row) => (
              <div className="usage-row" key={row.service}>
                <span>{row.service}</span>
                <strong>{row.calls}</strong>
                <em>{row.cost}</em>
                <small>{row.successRate}</small>
              </div>
            ))}
          </div>
          <ul className="manifest-list">
            <li>Read README at task start.</li>
            <li>Keep secrets out of committed files.</li>
            <li>Panel settings save locally.</li>
            <li>Use the Replit proxy for live service status.</li>
          </ul>
        </article>
      )
    }

    if (id === 'sandbox3d') {
      return <Sandbox3D sandboxConfig={adminConfig.sandbox3d} />
    }

    return <MinistryPanel config={adminConfig.ministry} logPrefill={ministryLogPrefill} />
  }

  if (route === 'admin') {
    return (
      <>
        <AdminPanel
          adminApiStatus={adminApiStatus}
          config={adminConfig}
          health={health}
          onBack={openDashboard}
          onReset={resetAdminConfig}
          onUpdate={updateAdminConfig}
        />
        <KIMSystem
          config={adminConfig}
          dashboardSummary={dashboardSummary}
          onConfigChange={updateAdminConfig}
          onPrefillMinistryHours={(hours, type) => setMinistryLogPrefill({ hours, type })}
        />
      </>
    )
  }

  return (
    <main className="command-shell">
      <header className="command-header">
        <div>
          <p className="eyebrow">Enforge Command Center</p>
          <h1>Logistics Dashboard + Communications Hub</h1>
          <p className="header-copy">
            Phase 5 command surface for ClearBid, Ministry Companion, KIM, docs, repositories, schedule, ministry tracking, local admin controls, and 3D experiments.
          </p>
        </div>
        <div className="launch-card">
          <span className="launch-label">Deployment</span>
          <strong>enforgedesigns.com</strong>
          <span>GitHub Pages · Custom domain · Phase 5</span>
          <button className="gear-button" aria-label="Open admin panel" onClick={openAdmin} type="button">⚙</button>
        </div>
      </header>

      <section className="status-strip" aria-label="Service connection status">
        {currentServices.map((service) => (
          <article className="status-pill" data-state={service.state} key={service.name}>
            <span className="status-dot" />
            <div>
              <strong>{service.name}</strong>
              <span>{statusLabel(service.state)}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        {adminConfig.panels.map((panel) => (
          <Fragment key={panel.id}>{renderPanel(panel.id)}</Fragment>
        ))}
      </section>
      <KIMSystem
        config={adminConfig}
        dashboardSummary={dashboardSummary}
        onConfigChange={updateAdminConfig}
        onPrefillMinistryHours={(hours, type) => setMinistryLogPrefill({ hours, type })}
      />
    </main>
  )
}

export default App
