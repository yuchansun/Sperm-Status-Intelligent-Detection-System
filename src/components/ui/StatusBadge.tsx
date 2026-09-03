type StatusBadgeProps = {
  label: string
  tone: 'success' | 'warning' | 'danger'
}

function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>
}

export default StatusBadge