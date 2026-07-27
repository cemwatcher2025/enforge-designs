import { useEffect, useMemo, useState } from 'react'
import { fetchDashboardData, type DashboardData } from './utils/commandCenterApi'
import { logUsage, readUsageLog } from './utils/usageTracking'

type ServiceState = 'online' | 'pending' | 'offline'

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
  accent: 'cyan' | 'magenta' | 'lime' | 'orange'
}

type Message = {
  source: string
  subject: string
  status: string
  age: string
}

type UsageRow = {
  service: string
  calls: number
  cost: string
  successRate: string
}

type ProjectLink = {
  id: string
  name: string
  type: 'GitHub' | 'Replit' | 'Placeholder'
  href: string
  status: string
  detail: string
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

type DocumentLink = {
  id: string
  title: string
  href: string
  tags: string[]
  detail: string
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

const messages: Message[] = [
  { source: 'Email', subject: 'Unread inbox count', status: 'Waiting on Gmail connector', age: 'pending' },
  { source: 'Slack', subject: 'Message triage', status: 'Optional integration', age: 'pending' },
  { source: 'Lindy', subject: 'Recent actions', status: 'No public API; link out for now', age: 'manual' },
  { source: 'Calendar', subject: "Today's schedule", status: 'Waiting on Google Calendar connector', age: 'pending' },
]

const usageRows: UsageRow[] = [
  { service: 'ClearBid API', calls: 0, cost: '$0.00', successRate: '-' },
  { service: 'KIM Assistant API', calls: 0, cost: '$0.00', successRate: '-' },
  { service: 'Ministry Companion API', calls: 0, cost: '$0.00', successRate: '-' },
  { service: 'Google Sheets logging', calls: 0, cost: '$0.00', successRate: '-' },
]

const projectLinks: ProjectLink[] = [
  {
    id: 'clearbid',
    name: 'ClearBid',
    type: 'Replit',
    href: 'https://price-library.replit.app',
    status: 'Live app',
    detail: 'Estimating, price library, job volume',
  },
  {
    id: 'ministry',
    name: 'Ministry Companion',
    type: 'GitHub',
    href: 'https://github.com/cemwatcher2025/ministry-companion',
    status: 'Repo found',
    detail: 'Service records, visits, studies',
  },
  {
    id: 'kim',
    name: 'KIM Assistant',
    type: 'Replit',
    href: 'https://kim-assistant.replit.app',
    status: 'Live app',
    detail: 'Assistant events, briefings, task flow',
  },
  {
    id: 'enforge',
    name: 'Enforge Designs',
    type: 'GitHub',
    href: 'https://github.com/cemwatcher2025/enforge-designs',
    status: 'Active repo',
    detail: 'Command center frontend, proxy, deployment',
  },
  {
    id: 'roam',
    name: 'ROAM',
    type: 'Placeholder',
    href: 'https://github.com/cemwatcher2025',
    status: 'Repo TBD',
    detail: 'Unreal Engine project placeholder',
  },
]

const documentLinks: DocumentLink[] = [
  {
    id: 'command-center-spec',
    title: 'Enforge Command Center Build Spec',
    href: 'https://docs.google.com/document/d/1efJpHdlcvMcxxNw_jsYDWLPvrjSQFWZnzr7a1hq1kD8',
    tags: ['spec', 'command center', 'phase plan', 'dashboard'],
    detail: 'Primary build spec and panel roadmap',
  },
]

const futurePanels = [
  '3D Viewer',
  'Ministry Panel',
]

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

function App() {
  const [usageCount, setUsageCount] = useState(() => readUsageLog().length)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyStatus, setReplyStatus] = useState('No reply staged yet.')
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [liveDataStatus, setLiveDataStatus] = useState('Live data not loaded yet.')
  const [activeProject, setActiveProject] = useState('enforge')
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
  const visibleDocuments = useMemo(() => {
    const query = documentQuery.trim().toLowerCase()
    if (!query) return documentLinks

    return documentLinks.filter((document) => {
      const haystack = [document.title, document.detail, ...document.tags].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [documentQuery])

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

  return (
    <main className="command-shell">
      <header className="command-header">
        <div>
          <p className="eyebrow">Enforge Command Center</p>
          <h1>Logistics Dashboard + Communications Hub</h1>
          <p className="header-copy">
            Phase 1 and 2 command surface for ClearBid, Ministry Companion, KIM, docs, repositories, schedule, and action triage.
          </p>
        </div>
        <div className="launch-card">
          <span className="launch-label">Deployment</span>
          <strong>enforgedesigns.com</strong>
          <span>GitHub Pages · Custom domain · Phase 2</span>
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
        <article className="panel panel-large">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Panel 01</p>
              <h2>Logistics Dashboard</h2>
            </div>
            <span className="panel-badge">MVP</span>
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
                <code>{service.endpoint}</code>
              </div>
            ))}
          </div>
          <p className="panel-note">{liveDataStatus}</p>
        </article>

        <article className="panel panel-large">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Panel 02</p>
              <h2>Communications Hub</h2>
            </div>
            <span className="panel-badge">MVP</span>
          </div>

          <div className="message-stack">
            {messages.map((message) => (
              <div className="message-row" key={`${message.source}-${message.subject}`}>
                <span>{message.source}</span>
                <div>
                  <strong>{message.subject}</strong>
                  <p>{message.status}</p>
                </div>
                <em>{message.age}</em>
              </div>
            ))}
          </div>

          <form className="quick-reply">
            <label htmlFor="quick-reply">Quick reply draft</label>
            <textarea
              id="quick-reply"
              onChange={(event) => setReplyDraft(event.target.value)}
              placeholder="Draft a response or action note. Sending is disabled until connectors are configured."
              value={replyDraft}
            />
            <button onClick={stageReply} type="button">Stage reply</button>
            <p className="reply-status">{replyStatus}</p>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Utility</p>
              <h2>Usage Tracking</h2>
            </div>
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
          <p className="panel-note">
            Google Sheet logging is scaffolded as a connector target. A server-side proxy or Apps Script endpoint is required before live API calls are safe.
          </p>
        </article>

        <article className="panel">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Manifest</p>
              <h2>README Protocol</h2>
            </div>
          </div>
          <ul className="manifest-list">
            <li>Read README at task start.</li>
            <li>Keep secrets out of committed files.</li>
            <li>Track active phase, endpoints, changes, and next actions.</li>
            <li>Use manual updates until a secure backend writer exists.</li>
          </ul>
        </article>

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
            <select id="active-project" onChange={(event) => setActiveProject(event.target.value)} value={activeProject}>
              {projectLinks.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          <div className="project-grid">
            {projectLinks.map((project) => (
              <a
                className="project-card"
                data-active={project.id === activeProject}
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

        {futurePanels.map((panel) => (
          <article className="panel future-panel" key={panel}>
            <p className="eyebrow">Phase 3</p>
            <h2>{panel}</h2>
            <p>Reserved module slot. Built independently after Phase 2 stabilizes.</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
