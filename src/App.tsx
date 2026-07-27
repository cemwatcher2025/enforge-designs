import { useMemo, useState } from 'react'
import { logUsage, readUsageLog } from './utils/usageTracking'

type ServiceState = 'online' | 'pending' | 'offline'

type Service = {
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

const services: Service[] = [
  {
    name: 'ClearBid',
    endpoint: 'https://price-library.replit.app',
    state: 'pending',
    purpose: 'Estimates, job volume, pricing status',
  },
  {
    name: 'Ministry Companion',
    endpoint: 'https://ministry-companion.replit.app',
    state: 'pending',
    purpose: 'Hours, return visits, studies',
  },
  {
    name: 'KIM Assistant',
    endpoint: 'https://kim-assistant.replit.app',
    state: 'pending',
    purpose: 'Task status, recent actions, assistant health',
  },
  {
    name: 'Google Workspace',
    endpoint: 'Google Sheets / Gmail / Calendar',
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

const futurePanels = [
  'Coding Sandbox',
  'Documents',
  '3D Viewer',
  'Ministry Panel',
]

function statusLabel(state: ServiceState) {
  if (state === 'online') return 'Online'
  if (state === 'offline') return 'Offline'
  return 'Needs connection'
}

function App() {
  const [usageCount, setUsageCount] = useState(() => readUsageLog().length)
  const [replyDraft, setReplyDraft] = useState('')
  const [replyStatus, setReplyStatus] = useState('No reply staged yet.')
  const currentUsageRows = useMemo(
    () =>
      usageRows.map((row) =>
        row.service === 'Google Sheets logging'
          ? { ...row, calls: usageCount, successRate: usageCount > 0 ? 'local' : '-' }
          : row,
      ),
    [usageCount],
  )

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
            Phase 1 command surface for ClearBid, Ministry Companion, KIM, schedule, email, and action triage.
          </p>
        </div>
        <div className="launch-card">
          <span className="launch-label">Deployment</span>
          <strong>enforgedesigns.com</strong>
          <span>GitHub Pages · Custom domain · Phase 1</span>
        </div>
      </header>

      <section className="status-strip" aria-label="Service connection status">
        {services.map((service) => (
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
            {logisticsMetrics.map((metric) => (
              <div className="metric-card" data-accent={metric.accent} key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <p>{metric.detail}</p>
              </div>
            ))}
          </div>

          <div className="service-list">
            {services.slice(0, 3).map((service) => (
              <div className="service-row" key={service.name}>
                <div>
                  <strong>{service.name}</strong>
                  <span>{service.purpose}</span>
                </div>
                <code>{service.endpoint}</code>
              </div>
            ))}
          </div>
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

        {futurePanels.map((panel, index) => (
          <article className="panel future-panel" key={panel}>
            <p className="eyebrow">Phase {index < 2 ? '2' : '3'}</p>
            <h2>{panel}</h2>
            <p>Reserved module slot. Built independently after Phase 1 stabilizes.</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
