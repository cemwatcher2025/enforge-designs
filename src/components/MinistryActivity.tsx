import type { BibleStudy, MinistryActivityEntry, ReturnVisit } from '../utils/ministryApi'

type MinistryActivityProps = {
  entries: MinistryActivityEntry[]
  returnVisits: ReturnVisit[]
  studies: BibleStudy[]
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(date)
}

function typeLabel(value: MinistryActivityEntry['type']) {
  if (value === 'bible-study') return 'Bible study'
  if (value === 'return-visit') return 'Return visit'
  return 'Field service'
}

function statusLabel(status: ReturnVisit['status']) {
  if (status === 'needs-follow-up') return 'Needs follow-up'
  if (status === 'paused') return 'Paused'
  return 'Active'
}

export function MinistryActivity({ entries, returnVisits, studies }: MinistryActivityProps) {
  return (
    <div className="ministry-detail-grid">
      <section className="ministry-section">
        <div className="ministry-section-title">
          <h3>Recent activity</h3>
          <span>{entries.length}</span>
        </div>
        <div className="ministry-feed">
          {entries.slice(0, 8).map((entry) => (
            <article className="ministry-feed-row" key={entry.id}>
              <time>{formatDate(entry.date)}</time>
              <div>
                <strong>{typeLabel(entry.type)}</strong>
                <p>{entry.notes || 'No notes'}</p>
              </div>
              <em>{entry.hours.toFixed(1)}h</em>
            </article>
          ))}
          {entries.length === 0 && <p className="panel-note">No ministry entries yet.</p>}
        </div>
      </section>

      <section className="ministry-section">
        <div className="ministry-section-title">
          <h3>Return visits</h3>
          <span>{returnVisits.length}</span>
        </div>
        <div className="ministry-list">
          {returnVisits.map((visit) => (
            <article className="ministry-list-row" data-status={visit.status} key={visit.id}>
              <div>
                <strong>{visit.name}</strong>
                <span>Last visit {formatDate(visit.lastVisitDate)}</span>
              </div>
              <em>{statusLabel(visit.status)}</em>
            </article>
          ))}
          {returnVisits.length === 0 && <p className="panel-note">No return visits yet.</p>}
        </div>
      </section>

      <section className="ministry-section">
        <div className="ministry-section-title">
          <h3>Bible studies</h3>
          <span>{studies.length}</span>
        </div>
        <div className="ministry-list">
          {studies.map((study) => (
            <article className="ministry-list-row" key={study.id}>
              <div>
                <strong>{study.name}</strong>
                <span>{study.progress}</span>
              </div>
              <em>{formatDate(study.lastStudyDate)}</em>
            </article>
          ))}
          {studies.length === 0 && <p className="panel-note">No studies logged yet.</p>}
        </div>
      </section>
    </div>
  )
}
