type HeaderProps = {
  title: string
  subtitle: string
  onMenuClick: () => void
  menuAriaLabel: string
  statusText: string
}

function Header({ title, subtitle, onMenuClick, menuAriaLabel, statusText }: HeaderProps) {
  return (
    <header className="app-header">
      <button
        type="button"
        className="menu-button"
        onClick={onMenuClick}
        aria-label={menuAriaLabel}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="app-header__titles">
        <p className="app-header__eyebrow">SpermVision</p>
        <div>
          <h1 className="app-header__title">{title}</h1>
          <p className="app-header__subtitle">{subtitle}</p>
        </div>
      </div>

      <div className="app-header__status-pill">
        <span className="status-dot status-dot--success" />
        {statusText}
      </div>
    </header>
  )
}

export default Header