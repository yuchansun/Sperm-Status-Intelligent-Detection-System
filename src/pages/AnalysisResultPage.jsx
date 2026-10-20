import { translateText as tr } from '../i18n/translate.js'
import { ResultEmail } from '../components/analysis/ResultEmail.jsx'
import { RecordActions } from '../components/analysis/RecordActions.jsx'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { mockResult } from '../services/mockData.js'
import { useCloudHistory } from '../hooks/useCloudHistory.js'
import { PrivateExamMedia } from '../components/analysis/PrivateExamMedia.jsx'
import { PrivateImage } from '../components/analysis/PrivateImage.jsx'
import { useExaminationSession } from '../context/examinationSession.js'
import { useLanguage } from '../context/language.js'

export function AnalysisResultPage() {
  const [viewMode, setViewMode] = useState('original')
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
    { name: tr("正常型態"), value: Number.parseFloat(record?.morphology) || 0, color: '#35b779' },
    { name: tr("異常型態"), value: 100 - (Number.parseFloat(record?.morphology) || 0), color: '#f59e0b' },
  ]

  if (loading || error) return <div className="page-shell"><p role={error ? 'alert' : 'status'}>{error || tr("雲端紀錄載入中…")}</p>{error && <button onClick={reload}>{tr("重試")}</button>}</div>
  if (!record) return <div className="page-shell"><p>{tr("找不到此分析紀錄。")}</p><button onClick={() => navigate('/history')}>{tr("查看紀錄")}</button></div>

  return (
    <div className="page-shell result-page">
      {record.isDemo && <span className="chip neutral">Demo</span>}
      <header className="page-header">
        <div>
          <p className="eyebrow">{t.analysisResult}</p>
          <h2>{tr("檢體編號 #")}{sampleId}</h2>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate('/analysis')}>{t.retest}</button>
          <button type="button" className="primary-btn" onClick={() => setMailStatus(tr("PDF 模擬報告已準備下載"))}>{t.downloadPdf}</button>
        </div>
      </header>

      <section className="summary-banner result-summary">
        <span className="status-pill danger">{t.followUp}</span>
        <div>
          <h3>{t.aiResult}</h3>
          <p>{t.resultSummary}</p>
        </div>
      </section>

      <RecordActions key={record.id} record={record} onSaved={reload} onDeleted={() => navigate(`/patients/${record.patientId}/history`)} />
      <section className="result-overview">
        <div className="result-card highlight">
          <span className="metric-label">{t.spermCountLabel}</span>
          <div className="value-line">
            <strong>{record.density}</strong>
            <span>million/mL</span>
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
            {record.media?.media_kind === 'video' && !(viewMode === 'yolo' && record.analyzedImagePath) ? <PrivateExamMedia record={record} /> : <PrivateImage path={viewMode === 'yolo' && record.analyzedImagePath ? record.analyzedImagePath : record.imagePath} isDemo={record.isDemo} />}
            {viewMode === 'yolo' && !record.analyzedImagePath ? (
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
              <span>{t.precision}</span>
              <strong>{tr(result.summary.precision)}</strong>
            </div>
            <div>
              <span>{t.confidence}</span>
              <strong>{tr(result.summary.confidence)}</strong>
            </div>
          </div>
        </div>

        <div className="analysis-panel info-panel">
          <div className="info-block">
            <div className="panel-header">
              <h3>{t.testSummary}</h3>
            </div>
            <ul className="summary-list">
              <li><span>{t.concentration}</span><strong>{record.density} million/mL</strong></li>
              <li><span>{t.normalMorphology}</span><strong>{record.morphology}</strong></li>
              <li><span>{t.motility}</span><strong>{record.motility}</strong></li>
            </ul>
          </div>

          <div className="info-block chart-block">
            <div className="panel-header">
              <h3>{t.morphologyAnalysis}</h3>
              <span className="chart-percent">{tr("正常率")}{record.morphology}</span>
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
              <div><span className="signal-dot signal-green" />{t.spermCountLabel}<strong>{record.density} million/mL</strong></div>
              <div><span className="signal-dot signal-yellow" />{t.normalMorphology}<strong>{record.morphology}</strong></div>
              <div><span className="signal-dot signal-yellow" />{t.motility}<strong>{record.motility}</strong></div>
            </div>
          </div>

          <div className="info-block">
            <div className="panel-header">
              <h3>{t.testInfo}</h3>
            </div>
            <ul className="summary-list compact-list">
              <li><span>{tr("姓名")}</span><strong>{record.patient?.name || '—'}</strong></li>
              <li><span>{tr("身分證字號")}</span><strong>{record.patient?.nationalId || '—'}</strong></li>
              <li><span>{tr("檢體編號")}</span><strong>{sampleId}</strong></li>
              <li><span>{t.collectionTime}</span><strong>{record.date}</strong></li>
            </ul>
          </div>

          <div className="action-block">
            <button type="button" className="primary-btn" onClick={() => navigate('/analysis')}>{t.retest}</button>
            <button type="button" className="secondary-btn" onClick={() => navigate(`/patients/${encodeURIComponent(record.patientId || record.patient.id)}/history`)}>{t.viewPatientHistory}</button>
          </div>
          <ResultEmail key={`${record.id}-${record.patient?.email || ''}`} record={record} />
          {mailStatus ? <p className="form-banner success">{tr(mailStatus)}</p> : null}
        </div>
      </section>
    </div>
  )
}
