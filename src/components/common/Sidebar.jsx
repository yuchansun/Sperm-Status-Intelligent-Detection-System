import { NavLink } from 'react-router-dom'
import { useLanguage } from '../../context/language.js'
import { useAuth } from '../../context/auth.js'

export function Sidebar() {
  const { t } = useLanguage()
  const { logout } = useAuth()
  const navItems = [
    { label: t.home, path: '/' },
    { label: t.analysis, path: '/analysis' },
    { label: t.history, path: '/history' },
    { label: t.settings, path: '/settings' },
  ]

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">AI</div>
        <div>
          <p className="brand-name">SpermAI</p>
          <span className="brand-subtitle">Clinic Intelligence</span>
        </div>
      </div>

      <nav className="side-nav" aria-label={t.mainNavigation}>
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
        <p className="status-label">{t.systemStatus}</p>
        <div className="status-row">
          <span className="status-pill success">{t.normal}</span>
          <span>{t.cloudModel}</span>
        </div>
        <small>{t.offlineReady}</small>
      </div>

      <button type="button" className="logout-btn" onClick={logout}>
        {t.logout}
      </button>
    </aside>
  )
}
