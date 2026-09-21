import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Analysis', path: '/analysis' },
  { label: 'History', path: '/history' },
]

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
          <h1>精蟲 AI 智慧輔助檢驗平台</h1>
        </div>
        <button
          type="button"
          className="menu-toggle"
          aria-label="開啟導覽選單"
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
            <p className="eyebrow">Navigation</p>
            <h2>快速導覽</h2>
          </div>
          <button
            type="button"
            className="drawer-close"
            aria-label="關閉導覽選單"
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
