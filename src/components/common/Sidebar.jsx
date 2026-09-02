import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Analysis', path: '/analysis' },
  { label: 'History', path: '/history' },
  { label: 'Patient Detail', path: '/patient/PS-2026-001' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">AI</div>
        <div>
          <p className="brand-name">SpermAI</p>
          <span className="brand-subtitle">Clinic Intelligence</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="Main navigation">
        {navItems.map(({ label, path }) => (
          <NavLink
            key={label}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <span className="nav-dot" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-card">
        <p className="status-label">系統狀態</p>
        <div className="status-row">
          <span className="status-pill success">正常</span>
          <span>雲端 YOLO 模型</span>
        </div>
        <small>離線備援模式：已準備</small>
      </div>
    </aside>
  )
}
