export function MetricCard({ label, value, detail, status, tone = 'blue', onClick }) {
  const content = (
      <div className="metric-header">
        <span>{label}</span>
        {status && <span className="metric-status">{status}</span>}
      </div>
  )

  if (onClick) {
    return (
      <button type="button" className={`metric-card metric-${tone} metric-card-interactive`} onClick={onClick}>
        {content}
        <div className="metric-value">{value}</div>
        <p className="metric-detail">{detail}</p>
      </button>
    )
  }

  return (
    <div className={`metric-card metric-${tone}`}>
      {content}
      <div className="metric-value">{value}</div>
      <p className="metric-detail">{detail}</p>
    </div>
  )
}
