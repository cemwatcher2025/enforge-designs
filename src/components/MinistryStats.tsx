import type { MinistryStatsData } from '../utils/ministryApi'

type MinistryStatsProps = {
  data: MinistryStatsData
}

function formatHours(value: number) {
  return value.toFixed(1)
}

export function MinistryStats({ data }: MinistryStatsProps) {
  const comparison = data.hoursComparisonPercent
  const comparisonLabel = comparison === 0 ? 'No previous-month change' : `${comparison > 0 ? 'Up' : 'Down'} ${Math.abs(comparison).toFixed(0)}% from last month`

  return (
    <>
      <div className="ministry-hero-stat">
        <span>Current month hours</span>
        <strong>{formatHours(data.currentMonthHours)}</strong>
        <em data-trend={comparison >= 0 ? 'up' : 'down'}>{comparison >= 0 ? '↑' : '↓'} {comparisonLabel}</em>
      </div>

      <div className="ministry-stat-grid">
        <div className="ministry-stat-card">
          <span>Return visits</span>
          <strong>{data.currentMonthReturnVisits}</strong>
        </div>
        <div className="ministry-stat-card">
          <span>Bible studies</span>
          <strong>{data.currentMonthStudies}</strong>
        </div>
        <div className="ministry-stat-card">
          <span>YTD hours</span>
          <strong>{formatHours(data.yearToDateHours)}</strong>
        </div>
        <div className="ministry-stat-card">
          <span>Avg / month</span>
          <strong>{formatHours(data.averageHoursPerMonth)}</strong>
        </div>
        <div className="ministry-stat-card">
          <span>Publishers</span>
          <strong>{data.publishers ?? '-'}</strong>
        </div>
      </div>
    </>
  )
}
