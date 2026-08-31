import StatusBadge from './StatusBadge'

type StatCardProps = {
  label: string
  value: string
  detail: string
  tone: 'success' | 'warning' | 'danger'
}

function StatCard({ label, value, detail, tone }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card__header">
        <p className="stat-card__label">{label}</p>
        <StatusBadge label={tone} tone={tone} />
      </div>
      <p className="stat-card__value">{value}</p>
      <p className="stat-card__detail">{detail}</p>
    </article>
  )
}

export default StatCard