const navItems = ['Dashboard', 'Analysis', 'History']

export function Navbar() {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">SpermAI Platform</p>
        <h1>精蟲 AI 智慧輔助檢驗平台</h1>
      </div>
      {/* <div className="topbar-actions">
        <button type="button" className="secondary-btn">
          生成報告
        </button>
        <button type="button" className="primary-btn">
          新檢驗
        </button>
      </div> */}
      <div className="mobile-only">
        <nav className="mini-tabs" aria-label="Quick navigation">
          {navItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </nav>
      </div>
    </header>
  )
}
