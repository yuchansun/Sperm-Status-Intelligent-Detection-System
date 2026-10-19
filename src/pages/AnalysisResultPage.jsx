import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { mockResult } from '../services/mockData.js'
import { useCloudHistory } from '../hooks/useCloudHistory.js'
import { PrivateImage } from '../components/analysis/PrivateImage.jsx'
import { useExaminationSession } from '../context/examinationSession.js'
import { useLanguage } from '../context/language.js'

export function AnalysisResultPage() {
  const [viewMode, setViewMode] = useState('original')
  const [email, setEmail] = useState('patient@example.com')
  const [mailStatus, setMailStatus] = useState('')
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { activeExamination } = useExaminationSession()
  const [params] = useSearchParams()
  const { records, loading, error, reload } = useCloudHistory()
  const recordId = params.get('record') || activeExamination?.historyRecordId
  const record = records.find(r => r.id === recordId)
  const result = { ...mockResult, boxes: record?.boxes || [], summary: record?.aiResult || {} }
  const sampleId = record?.sampleId ?? '—'
  const chartData = [
    { name: '正常型態', value: Number.parseFloat(record?.morphology) || 0, color: '#35b779' },
    { name: '異常型態', value: 100 - (Number.parseFloat(record?.morphology) || 0), color: '#f59e0b' },
  ]

  const handleSendEducation = () => {
    if (!email.trim()) return
    setMailStatus('示範功能：尚未寄出任何郵件。')
  }

  if (loading || error) return <div className="page-shell"><p role={error ? 'alert' : 'status'}>{error || '雲端紀錄載入中…'}</p>{error && <button onClick={reload}>重試</button>}</div>
  if (!record) return <div className="page-shell"><p>找不到此分析紀錄。</p><button onClick={() => navigate('/history')}>查看紀錄</button></div>

  return (
    <div className="page-shell result-page">
      <p className="form-banner" role="note">示範分析：目前使用固定範例數值與標註，並非實際影像分析，不可作為臨床判讀依據。病患與紀錄已儲存於雲端。</p>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t.analysisResult}</p>
          <h2>檢體編號 #{sampleId}</h2>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate('/analysis')}>{t.retest}</button>
          <button type="button" className="primary-btn" onClick={() => setMailStatus('PDF 模擬報告已準備下載')}>{t.downloadPdf}</button>
        </div>
      </header>

      <section className="summary-banner result-summary">
        <span className="status-pill danger">{t.followUp}</span>
        <div>
          <h3>{t.aiResult}</h3>
          <p>{t.resultSummary}</p>
        </div>
      </section>

      <section className="result-overview">
        <div className="result-card highlight">
          <span className="metric-label">{t.spermCountLabel}</span>
          <div className="value-line">
            <strong>{record.density}</strong>
            <span>Million/mL</span>
          </div>
          <div className="status-inline success">{t.whoPass}</div>
        </div>

        <div className="result-card">
          <span className="metric-label">{t.headBodyRatio}</span>
          <div className="value-line">
            <strong>{record.morphology}</strong>
            <span>{t.normalMorphology}</span>
          </div>
          <div className="status-inline warning">{t.lowFollowUp}</div>
        </div>

        <div className="result-card">
          <span className="metric-label">{t.motilityEstimateLabel}</span>
          <div className="value-line">
            <strong>{record.motility}</strong>
            <span>{t.progressive}</span>
          </div>
          <div className="status-inline neutral">{t.moderateMotility}</div>
        </div>
      </section>

      <section className="analysis-content">
        <div className="analysis-panel image-panel">
          <div className="panel-header">
            <h3>{t.imageYolo}</h3>
            <div className="toggle-group">
              <button
                type="button"
                className={viewMode === 'original' ? 'chip success' : 'chip neutral'}
                onClick={() => setViewMode('original')}
              >
                {t.originalImage}
              </button>
              <button
                type="button"
                className={viewMode === 'yolo' ? 'chip success' : 'chip neutral'}
                onClick={() => setViewMode('yolo')}
              >
                {t.yoloView}
              </button>
            </div>
          </div>

          <div className="visual-box">
            <PrivateImage path={record.imagePath} isDemo={record.isDemo} />
            {viewMode === 'yolo' ? (
              <div className="result-box-overlay" aria-label={t.yoloView}>
                {result.boxes.map((box) => (
                  <span
                    key={box.id}
                    className="result-bounding-box"
                    style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%` }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="evidence-row">
            <div>
              <span>{t.detected}</span>
              <strong>{result.summary.detected}</strong>
            </div>
            <div>
              <span>Precision</span>
              <strong>{result.summary.precision}</strong>
            </div>
            <div>
              <span>Confidence</span>
              <strong>{result.summary.confidence}</strong>
            </div>
          </div>
        </div>

        <div className="analysis-panel info-panel">
          <div className="info-block">
            <div className="panel-header">
              <h3>{t.testSummary}</h3>
            </div>
            <ul className="summary-list">
              <li><span>{t.concentration}</span><strong>{record.density} M/mL</strong></li>
              <li><span>{t.normalMorphology}</span><strong>{record.morphology}</strong></li>
              <li><span>{t.motility}</span><strong>{record.motility}</strong></li>
            </ul>
          </div>

          <div className="info-block chart-block">
            <div className="panel-header">
              <h3>{t.morphologyAnalysis}</h3>
              <span className="chart-percent">正常率 {record.morphology}</span>
            </div>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={4}>
                    {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              {chartData.map((entry) => <span key={entry.name}><i style={{ background: entry.color }} />{entry.name} {entry.value}%</span>)}
            </div>
          </div>

          <div className="info-block signal-block">
            <div className="panel-header"><h3>{t.healthSignal}</h3></div>
            <div className="signal-list">
              <div><span className="signal-dot signal-green" />{t.spermCountLabel}<strong>{record.density} M/mL</strong></div>
              <div><span className="signal-dot signal-yellow" />{t.normalMorphology}<strong>{record.morphology}</strong></div>
              <div><span className="signal-dot signal-yellow" />{t.motility}<strong>{record.motility}</strong></div>
            </div>
          </div>

          <div className="info-block">
            <div className="panel-header">
              <h3>{t.medicalBenefit}</h3>
            </div>
            <p>{t.benefitText}</p>
          </div>

          <div className="info-block">
            <div className="panel-header">
              <h3>{t.testInfo}</h3>
            </div>
            <ul className="summary-list compact-list">
              <li><span>{t.patientCode}</span><strong>{sampleId}</strong></li>
              <li><span>{t.testItems}</span><strong>{t.spermCountLabel} + {t.morphology}</strong></li>
              <li><span>{t.collectionTime}</span><strong>{record.date}</strong></li>
            </ul>
          </div>

          <div className="action-block">
            <button type="button" className="primary-btn" onClick={() => navigate('/analysis')}>{t.retest}</button>
            <button type="button" className="secondary-btn" onClick={() => navigate('/history')}>{t.viewPatientHistory}</button>
          </div>
          <div className="education-block">
            <div className="panel-header"><h3>{t.sendEducation}</h3></div>
            <p>{t.educationText}</p>
            <div className="email-row">
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-label={t.emailAddress} />
              <button type="button" className="primary-btn small" onClick={handleSendEducation}>{t.sendEmail}</button>
            </div>
            {mailStatus ? <p className="form-banner success">{mailStatus}</p> : null}
          </div>
        </div>
      </section>
    </div>
  )
}
