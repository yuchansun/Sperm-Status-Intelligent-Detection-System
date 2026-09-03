import { NavLink } from 'react-router-dom'

import type { NavigationItem } from '../../types/analysis'

type SidebarProps = {
  isOpen: boolean
  onNavigate: () => void
  navigationItems: NavigationItem[]
  navAriaLabel: string
  footerTitle: string
  footerDetail: string
}

function Sidebar({
  isOpen,
  onNavigate,
  navigationItems,
  navAriaLabel,
  footerTitle,
  footerDetail,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">SV</div>
        <div>
          <p className="sidebar__brand-title">SpermVision</p>
          <p className="sidebar__brand-subtitle">精蟲狀態智能判斷系統</p>
        </div>
      </div>

      <nav className="sidebar__nav" aria-label={navAriaLabel}>
        {navigationItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
            onClick={onNavigate}
          >
            <span className="sidebar__link-indicator" />
            <span className="sidebar__link-text">
              <span className="sidebar__link-title">{item.label}</span>
              <span className="sidebar__link-description">{item.description}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <p>{footerTitle}</p>
        <span>{footerDetail}</span>
      </div>
    </aside>
  )
}

export default Sidebar