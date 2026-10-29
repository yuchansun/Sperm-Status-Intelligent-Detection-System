import { translateText as tr } from '../../i18n/translate.js'
import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { House, LayoutDashboard, History, Settings, LogOut } from 'lucide-react'
import { useLanguage } from '../../context/language.js'
import { useAuth } from '../../context/auth.js'

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()
  const { logout } = useAuth()

  const navItems = [
    { label: t.analysis, path: '/', icon: House },
    { label: t.home, path: '/dashboard', icon: LayoutDashboard },
    { label: t.history, path: '/history', icon: History },
    { label: t.settings, path: '/settings', icon: Settings },
  ]

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <header className="topbar">
        <div>
          <h1>{t.platform}</h1>
        </div>
        <button
          type="button"
          className="menu-toggle"
          aria-label={t.openMenu}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(true)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div
        className={`drawer-backdrop ${isMenuOpen ? 'drawer-backdrop-open' : ''}`}
        aria-hidden={!isMenuOpen}
        onClick={() => setIsMenuOpen(false)}
      />
      <aside
        className={`mobile-drawer ${isMenuOpen ? 'mobile-drawer-open' : ''}`}
        aria-label={t.mainNavigation}
        aria-hidden={!isMenuOpen}
        inert={!isMenuOpen}
      >
        <div className="drawer-header">
          <div>
            <p className="eyebrow">{t.mainNavigation}</p>
            <h2>{t.navigation}</h2>
          </div>
          <button
            type="button"
            className="drawer-close"
            aria-label={t.closeMenu}
            onClick={() => setIsMenuOpen(false)}
          >
            ×
          </button>
        </div>
        <nav className="drawer-nav">
          {navItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={tr(label)}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `drawer-nav-item ${isActive ? 'drawer-nav-item-active' : ''}`
              }
              onClick={() => setIsMenuOpen(false)}
            >
              <Icon size={20} aria-hidden="true" />
              {tr(label)}
            </NavLink>
          ))}
          <button
            type="button"
            className="drawer-nav-item drawer-logout"
            onClick={logout}
          >
            <LogOut size={20} aria-hidden="true" />
            {t.logout}
          </button>
        </nav>
      </aside>
    </>
  )
}
