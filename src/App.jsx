import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/common/Sidebar.jsx'
import { Navbar } from './components/common/Navbar.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { AnalysisUploadPage } from './pages/AnalysisUploadPage.jsx'
import { AnalysisResultPage } from './pages/AnalysisResultPage.jsx'
import { HistoryPage } from './pages/HistoryPage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import './App.css'

function AppLayout() {
  return (
    <LanguageProvider>
      <div className="app-shell">
        <Sidebar />
        <main className="main-panel">
          <Navbar />
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/analysis" element={<AnalysisUploadPage />} />
            <Route path="/analysis/result" element={<AnalysisResultPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </LanguageProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

export default App
