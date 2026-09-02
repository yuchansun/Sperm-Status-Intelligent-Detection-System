export function MetricCard({ label, value, detail, status, tone = 'blue' }) {
  return (
    <div className={`metric-card metric-${tone}`}>
      <div className="metric-header">
        <span>{label}</span>
        {status && <span className="metric-status">{status}</span>}
      </div>
      <div className="metric-value">{value}</div>
      <p className="metric-detail">{detail}</p>
    </div>
  )
}
