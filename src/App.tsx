import { Navigate, Route, Routes } from 'react-router-dom'

import ResponsiveLayout from './components/layout/ResponsiveLayout'
import AnalysisHistoryPage from './pages/AnalysisHistoryPage'
import DashboardPage from './pages/DashboardPage'
import NewAnalysisPage from './pages/NewAnalysisPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <Routes>
      <Route element={<ResponsiveLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="new-analysis" element={<NewAnalysisPage />} />
        <Route path="analysis-history" element={<AnalysisHistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App