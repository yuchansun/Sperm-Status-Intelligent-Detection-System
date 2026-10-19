import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/common/Sidebar.jsx'
import { Navbar } from './components/common/Navbar.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { AnalysisUploadPage } from './pages/AnalysisUploadPage.jsx'
import { AnalysisResultPage } from './pages/AnalysisResultPage.jsx'
import { HistoryPage } from './pages/HistoryPage.jsx'
import { PatientDetailPage } from './pages/PatientDetailPage.jsx'
import { PatientHistoryPage } from './pages/PatientHistoryPage.jsx'
import { SettingsPage } from './pages/SettingsPage.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { ExaminationSessionProvider } from './context/ExaminationSessionContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/auth.js'
import { LoginPage } from './pages/LoginPage.jsx'
import './App.css'

function AppLayout() {
  const { isAuthenticated, isLoading, authError } = useAuth()

  if (isLoading) return <p role="status">正在確認登入狀態…</p>

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-panel">
        {authError && <p role="alert" className="form-banner error">{authError}</p>}
        <Navbar />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analysis" element={<AnalysisUploadPage />} />
          <Route path="/analysis/result" element={<AnalysisResultPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/patients/:patientId/history" element={<PatientHistoryPage />} />
          <Route path="/history/:recordId" element={<PatientDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function SessionRoutes() {
  const { user } = useAuth()
  return <ExaminationSessionProvider key={user?.id ?? 'signed-out'}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<AppLayout />} />
    </Routes>
  </ExaminationSessionProvider>
}

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <SessionRoutes />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  )
}

export default App
