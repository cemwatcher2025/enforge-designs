import { useCallback, useEffect, useState } from 'react'
import type { MinistryPanelConfig } from '../config'
import { fetchMinistryStats, type MinistryStatsData } from '../utils/ministryApi'
import { MinistryActivity } from './MinistryActivity'
import { MinistryLogHours } from './MinistryLogHours'
import { MinistryStats } from './MinistryStats'

type MinistryPanelProps = {
  config: MinistryPanelConfig
  logPrefill?: { hours: string; type: string }
}

export function MinistryPanel({ config, logPrefill }: MinistryPanelProps) {
  const [data, setData] = useState<MinistryStatsData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState('Not refreshed yet')

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const nextData = await fetchMinistryStats()
      setData(nextData)
      setLastRefresh(new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date()))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Ministry stats failed to load.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadStats()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadStats])

  return (
    <article className="panel panel-full ministry-panel">
      <div className="panel-heading compact ministry-heading">
        <div>
          <p className="eyebrow">Panel 07</p>
          <h2>{config.title}</h2>
        </div>
        <div className="ministry-heading-actions">
          {loading && <span className="ministry-spinner" aria-label="Loading ministry stats" />}
          <span className="panel-badge">Phase 5</span>
          <button onClick={() => void loadStats()} type="button">{config.refreshLabel}</button>
        </div>
      </div>

      <div className="ministry-layout" aria-busy={loading}>
        <section className="ministry-main">
          {error ? (
            <div className="ministry-error">
              <strong>Ministry data unavailable</strong>
              <p>{error}</p>
              <button onClick={() => void loadStats()} type="button">Retry</button>
            </div>
          ) : data ? (
            <>
              <MinistryStats data={data} />
              <MinistryActivity entries={data.entries} returnVisits={data.returnVisits} studies={data.studies} />
            </>
          ) : (
            <div className="ministry-loading-card">
              <span className="ministry-spinner" />
              <p>Loading Ministry Companion data...</p>
            </div>
          )}
        </section>

        <aside className="ministry-side">
          <MinistryLogHours onLogged={() => void loadStats()} prefill={logPrefill} />
          <div className="ministry-note-card">
            <strong>Last refresh</strong>
            <span>{lastRefresh}</span>
            <p>{config.emptyState}</p>
          </div>
        </aside>
      </div>
    </article>
  )
}
