import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { AnalysisResultPage } from './AnalysisResultPage.jsx'
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate, useSearchParams: () => [new URLSearchParams('record=video-record')] }))
vi.mock('../context/language.js', () => ({ useLanguage: () => ({ t: { viewPatientHistory: '查看病患歷史', imageYolo: '影像與標記', originalImage: '原始影像' } }) }))
vi.mock('../context/examinationSession.js', () => ({ useExaminationSession: () => ({}) }))
vi.mock('../hooks/useCloudHistory.js', () => ({ useCloudHistory: () => ({ records: [{ id: 'video-record', patientId: 'patient-123', sampleId: 'SMP-00000001', density: 48, morphology: '4%', motility: '32%', isDemo: true, boxes: [], aiResult: {}, patient: { name: '測試病患', nationalId: 'TEST-001' }, media: { media_kind: 'video', upload_status: 'ready' } }] }) }))
vi.mock('../components/analysis/PrivateExamMedia.jsx', () => ({ PrivateExamMedia: () => React.createElement('video', { controls: true }) }))
vi.mock('recharts', () => ({ PieChart: () => null, Pie: () => null, Cell: () => null, ResponsiveContainer: () => null, Tooltip: () => null }))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
it('shows the full analysis result and private player after video upload', () => {
 const container=document.createElement('div'); const root=createRoot(container)
 try {
  act(()=>root.render(React.createElement(AnalysisResultPage)))
  expect(container.textContent).toContain('SMP-00000001')
  expect(container.textContent).toContain('身分證字號')
  expect(container.textContent).toContain('TEST-001')
  expect(container.textContent).not.toContain('性別')
  expect(container.textContent).toContain('Demo')
  expect(container.querySelectorAll('.result-card')).toHaveLength(3)
  expect(container.querySelector('video')).not.toBeNull()
  expect(container.textContent).not.toContain('僅保存')
  expect(container.textContent).not.toContain('尚未分析')
  act(()=>[...container.querySelectorAll('button')].find(b=>b.textContent==='查看病患歷史').click())
  expect(navigate).toHaveBeenCalledWith('/patients/patient-123/history')
 } finally { act(()=>root.unmount()) }
})
