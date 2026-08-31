import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { useLanguage } from '../../app/LanguageContext'
import {
  headerContentByLanguage,
  navigationByLanguage,
  pageTitlesByLanguage,
  sidebarContentByLanguage,
} from '../../data/content/ui.content'
import Header from './Header'
import Sidebar from './Sidebar'

function getPageMeta(pathname: string, language: 'zh-TW' | 'en') {
  const pageTitles = pageTitlesByLanguage[language]
  return pageTitles[pathname] ?? pageTitles['/']
}

function ResponsiveLayout() {
  const location = useLocation()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { language } = useLanguage()

  const pageMeta = getPageMeta(location.pathname, language)
  const headerContent = headerContentByLanguage[language]
  const sidebarContent = sidebarContentByLanguage[language]
  const navigationItems = navigationByLanguage[language]

  return (
    <div className="app-shell">
      <div
        className={`app-shell__backdrop ${isSidebarOpen ? 'app-shell__backdrop--visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onNavigate={() => setIsSidebarOpen(false)}
        navigationItems={navigationItems}
        navAriaLabel={sidebarContent.navAriaLabel}
        footerTitle={sidebarContent.footerTitle}
        footerDetail={sidebarContent.footerDetail}
      />

      <div className="app-shell__content">
        <Header
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
          onMenuClick={() => setIsSidebarOpen((currentValue) => !currentValue)}
          menuAriaLabel={headerContent.menuAriaLabel}
          statusText={headerContent.statusText}
        />

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ResponsiveLayout