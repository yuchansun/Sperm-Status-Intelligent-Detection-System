import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/common/Sidebar.jsx'
import { BottomNav } from './components/common/BottomNav.jsx'
import { Navbar } from './components/common/Navbar.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { AnalysisPage } from './pages/AnalysisPage.jsx'
import { HistoryPage } from './pages/HistoryPage.jsx'
import { PatientDetailPage } from './pages/PatientDetailPage.jsx'
import './App.css'

function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-panel">
        <Navbar />
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/patient/:id" element={<PatientDetailPage />} />
        </Routes>
        <BottomNav />
      </main>
    </div>
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
