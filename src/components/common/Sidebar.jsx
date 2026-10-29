import { BrandMark } from './BrandMark.jsx'
import { translateText as tr } from '../../i18n/translate.js'
import { NavLink } from 'react-router-dom'
import { House, LayoutDashboard, History, Settings, LogOut } from 'lucide-react'
import { useLanguage } from '../../context/language.js'
import { useAuth } from '../../context/auth.js'

export function Sidebar() {
  const { t } = useLanguage()
  const { logout } = useAuth()
  const navItems = [
    { label: t.analysis, path: '/', icon: House },
    { label: t.home, path: '/dashboard', icon: LayoutDashboard },
    { label: t.history, path: '/history', icon: History },
    { label: t.settings, path: '/settings', icon: Settings },
  ]

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <BrandMark />
        <div>
          <p className="brand-name">SpermAI</p>
        </div>
      </div>

      <nav className="side-nav" aria-label={t.mainNavigation}>
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={tr(label)}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <Icon className="nav-icon" size={20} strokeWidth={1.8} aria-hidden="true" />
            {tr(label)}
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
        <LogOut size={20} aria-hidden="true" />
        {t.logout}
      </button>
    </aside>
  )
}
