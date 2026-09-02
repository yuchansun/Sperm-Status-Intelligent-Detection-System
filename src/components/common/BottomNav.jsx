import { NavLink } from 'react-router-dom'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Analysis', path: '/analysis' },
  { label: 'History', path: '/history' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {navItems.map(({ label, path }) => (
        <NavLink
          key={label}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'bottom-nav-item-active' : ''}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
