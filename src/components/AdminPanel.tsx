import type { AdminConfig, ApiEndpointConfig, DocumentLink, PanelConfig, ProjectLink, ServiceState, ThemeMode } from '../config'
import { defaultAdminConfig } from '../config'

type AdminPanelProps = {
  config: AdminConfig
  health: Record<string, ServiceState>
  onBack: () => void
  onReset: () => void
  onUpdate: (config: AdminConfig) => void
}

function createId(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `item-${Date.now()}`
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= items.length) return items
  const next = [...items]
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  return next
}

function statusText(state?: ServiceState) {
  if (state === 'online') return 'Online'
  if (state === 'offline') return 'Offline'
  return 'Pending'
}

export function AdminPanel({ config, health, onBack, onReset, onUpdate }: AdminPanelProps) {
  function updateTheme(theme: ThemeMode) {
    onUpdate({ ...config, theme })
  }

  function updatePanels(panels: PanelConfig[]) {
    onUpdate({ ...config, panels })
  }

  function updateProjects(projects: ProjectLink[]) {
    onUpdate({ ...config, projects })
  }

  function updateDocuments(documents: DocumentLink[]) {
    onUpdate({ ...config, documents })
  }

  function updateApiEndpoints(apiEndpoints: ApiEndpointConfig[]) {
    onUpdate({ ...config, apiEndpoints })
  }

  return (
    <main className="command-shell admin-shell">
      <header className="command-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Command Center Controls</h1>
          <p className="header-copy">
            Local controls for panel layout, links, endpoint labels, and theme. Changes save to this browser.
          </p>
        </div>
        <div className="launch-card admin-actions-card">
          <span className="launch-label">Local Config</span>
          <strong>Admin Panel</strong>
          <div className="admin-top-actions">
            <button onClick={onBack} type="button">Back to Dashboard</button>
            <button onClick={onReset} type="button">Reset Defaults</button>
          </div>
        </div>
      </header>

      <section className="admin-grid">
        <article className="panel admin-panel-card">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Site Config</p>
              <h2>Panels</h2>
            </div>
          </div>
          <div className="admin-list">
            {config.panels.map((panel, index) => (
              <div className="admin-row" key={panel.id}>
                <label className="toggle-row">
                  <input
                    checked={panel.visible}
                    onChange={(event) => {
                      updatePanels(config.panels.map((item) => (
                        item.id === panel.id ? { ...item, visible: event.target.checked } : item
                      )))
                    }}
                    type="checkbox"
                  />
                  <span>{panel.label}</span>
                </label>
                <div className="row-actions">
                  <button disabled={index === 0} onClick={() => updatePanels(moveItem(config.panels, index, -1))} type="button">Up</button>
                  <button disabled={index === config.panels.length - 1} onClick={() => updatePanels(moveItem(config.panels, index, 1))} type="button">Down</button>
                </div>
              </div>
            ))}
          </div>
          <div className="theme-toggle" role="group" aria-label="Theme">
            <button data-active={config.theme === 'dark'} onClick={() => updateTheme('dark')} type="button">Dark</button>
            <button data-active={config.theme === 'light'} onClick={() => updateTheme('light')} type="button">Light</button>
          </div>
        </article>

        <article className="panel admin-panel-card">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">API Keys</p>
              <h2>Endpoint Status</h2>
            </div>
          </div>
          <div className="admin-list">
            {config.apiEndpoints.map((endpoint) => (
              <div className="endpoint-row" key={endpoint.id}>
                <div className="mini-status" data-state={health[endpoint.id] ?? 'pending'}>
                  <span className="status-dot" />
                  <div>
                    <strong>{endpoint.name}</strong>
                    <span>{statusText(health[endpoint.id])}</span>
                  </div>
                </div>
                <input
                  aria-label={`${endpoint.name} endpoint`}
                  onChange={(event) => {
                    updateApiEndpoints(config.apiEndpoints.map((item) => (
                      item.id === endpoint.id ? { ...item, endpoint: event.target.value } : item
                    )))
                  }}
                  value={endpoint.endpoint}
                />
              </div>
            ))}
          </div>
          <p className="panel-note">Tokens stay in the Replit proxy. These fields only update frontend endpoint labels for now.</p>
        </article>

        <article className="panel admin-panel-card">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Content</p>
              <h2>Project Cards</h2>
            </div>
            <button
              className="small-action"
              onClick={() => {
                updateProjects([
                  ...config.projects,
                  {
                    detail: 'New project link',
                    href: 'https://github.com/cemwatcher2025',
                    id: `project-${Date.now()}`,
                    name: 'New Project',
                    status: 'Draft',
                    type: 'Placeholder',
                  },
                ])
              }}
              type="button"
            >
              Add
            </button>
          </div>
          <div className="editable-list">
            {config.projects.map((project) => (
              <div className="editable-card" key={project.id}>
                <input
                  aria-label="Project name"
                  onChange={(event) => {
                    updateProjects(config.projects.map((item) => (
                      item.id === project.id ? { ...item, id: createId(event.target.value), name: event.target.value } : item
                    )))
                  }}
                  value={project.name}
                />
                <input
                  aria-label="Project URL"
                  onChange={(event) => {
                    updateProjects(config.projects.map((item) => (
                      item.id === project.id ? { ...item, href: event.target.value } : item
                    )))
                  }}
                  value={project.href}
                />
                <textarea
                  aria-label="Project detail"
                  onChange={(event) => {
                    updateProjects(config.projects.map((item) => (
                      item.id === project.id ? { ...item, detail: event.target.value } : item
                    )))
                  }}
                  value={project.detail}
                />
                <button onClick={() => updateProjects(config.projects.filter((item) => item.id !== project.id))} type="button">Remove</button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel admin-panel-card">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Content</p>
              <h2>Documents</h2>
            </div>
            <button
              className="small-action"
              onClick={() => {
                updateDocuments([
                  ...config.documents,
                  {
                    detail: 'New document link',
                    href: 'https://docs.google.com',
                    id: `document-${Date.now()}`,
                    tags: ['draft'],
                    title: 'New Document',
                  },
                ])
              }}
              type="button"
            >
              Add
            </button>
          </div>
          <div className="editable-list">
            {config.documents.map((document) => (
              <div className="editable-card" key={document.id}>
                <input
                  aria-label="Document title"
                  onChange={(event) => {
                    updateDocuments(config.documents.map((item) => (
                      item.id === document.id ? { ...item, id: createId(event.target.value), title: event.target.value } : item
                    )))
                  }}
                  value={document.title}
                />
                <input
                  aria-label="Document URL"
                  onChange={(event) => {
                    updateDocuments(config.documents.map((item) => (
                      item.id === document.id ? { ...item, href: event.target.value } : item
                    )))
                  }}
                  value={document.href}
                />
                <input
                  aria-label="Document tags"
                  onChange={(event) => {
                    updateDocuments(config.documents.map((item) => (
                      item.id === document.id ? { ...item, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) } : item
                    )))
                  }}
                  value={document.tags.join(', ')}
                />
                <button onClick={() => updateDocuments(config.documents.filter((item) => item.id !== document.id))} type="button">Remove</button>
              </div>
            ))}
          </div>
        </article>

        <article className="panel admin-panel-card">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Comms</p>
              <h2>Google Links</h2>
            </div>
          </div>
          <div className="editable-list">
            <label className="toggle-row">
              <input
                checked={config.comms.gmailConnected}
                onChange={(event) => onUpdate({ ...config, comms: { ...config.comms, gmailConnected: event.target.checked } })}
                type="checkbox"
              />
              <span>Gmail connected</span>
            </label>
            <label className="toggle-row">
              <input
                checked={config.comms.calendarConnected}
                onChange={(event) => onUpdate({ ...config, comms: { ...config.comms, calendarConnected: event.target.checked } })}
                type="checkbox"
              />
              <span>Calendar connected</span>
            </label>
            <input
              aria-label="Gmail inbox URL"
              onChange={(event) => onUpdate({ ...config, comms: { ...config.comms, gmailInboxUrl: event.target.value } })}
              value={config.comms.gmailInboxUrl}
            />
            <input
              aria-label="Gmail compose URL"
              onChange={(event) => onUpdate({ ...config, comms: { ...config.comms, gmailComposeUrl: event.target.value } })}
              value={config.comms.gmailComposeUrl}
            />
            <input
              aria-label="Google Calendar URL"
              onChange={(event) => onUpdate({ ...config, comms: { ...config.comms, calendarUrl: event.target.value } })}
              value={config.comms.calendarUrl}
            />
          </div>
        </article>

        <article className="panel admin-panel-card">
          <div className="panel-heading compact">
            <div>
              <p className="eyebrow">Defaults</p>
              <h2>Reference</h2>
            </div>
          </div>
          <p className="panel-note">
            Default config currently includes {defaultAdminConfig.projects.length} projects, {defaultAdminConfig.documents.length} document, and {defaultAdminConfig.panels.length} panel definitions.
          </p>
        </article>
      </section>
    </main>
  )
}
