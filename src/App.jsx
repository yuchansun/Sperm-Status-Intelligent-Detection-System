import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/common/Sidebar.jsx'
import { Navbar } from './components/common/Navbar.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { AnalysisUploadPage } from './pages/AnalysisUploadPage.jsx'
import { AnalysisResultPage } from './pages/AnalysisResultPage.jsx'
import { HistoryPage } from './pages/HistoryPage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/auth.js'
import { LoginPage } from './pages/LoginPage.jsx'
import './App.css'

function AppLayout() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<AppLayout />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}

export default App
