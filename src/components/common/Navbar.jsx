import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useLanguage } from '../../context/language.js'

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { t } = useLanguage()

  const navItems = [
    { label: t.home, path: '/' },
    { label: t.analysis, path: '/analysis' },
    { label: t.history, path: '/history' },
    { label: t.settings, path: '/settings' },
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
          <p className="eyebrow">SpermAI Platform</p>
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
        aria-label="Mobile navigation"
        aria-hidden={!isMenuOpen}
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
          {navItems.map(({ label, path }) => (
            <NavLink
              key={label}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `drawer-nav-item ${isActive ? 'drawer-nav-item-active' : ''}`
              }
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="drawer-nav-dot" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
