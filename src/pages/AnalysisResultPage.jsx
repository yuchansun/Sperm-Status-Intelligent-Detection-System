import { translateText as tr } from '../i18n/translate.js'
import { ResultEmail } from '../components/analysis/ResultEmail.jsx'
import { RecordActions } from '../components/analysis/RecordActions.jsx'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useCloudHistory } from '../hooks/useCloudHistory.js'
import { PrivateExamMedia } from '../components/analysis/PrivateExamMedia.jsx'
import { PrivateImage } from '../components/analysis/PrivateImage.jsx'
import { useExaminationSession } from '../context/examinationSession.js'
import { useLanguage } from '../context/language.js'
import { ReportPreview } from '../components/analysis/ReportPreview.jsx'
import { CORE_MEASUREMENT_STANDARDS, evaluateMeasurement, formatMeasurement, statusClass } from '../utils/measurementStandards.js'
import { completeCloudRecord } from '../services/cloudApi.js'

export function AnalysisResultPage() {
  const [reviewing, setReviewing] = useState(false)
  const [reviewNotice, setReviewNotice] = useState('')
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { activeExamination } = useExaminationSession()
  const [params] = useSearchParams()
  const { records, loading, error, reload } = useCloudHistory()
  const recordId = params.get('record') || activeExamination?.historyRecordId
  const record = records.find(r => r.id === recordId)
  const result = { boxes: record?.boxes || [], summary: record?.aiResult || {} }
  const sampleId = record?.sampleId ?? '—'
  const morphologyValue = Number.parseFloat(record?.measurements?.morphology ?? record?.morphology)
  const chartData = Number.isFinite(morphologyValue) && morphologyValue >= 0 && morphologyValue <= 100 ? [
    { name: tr("正常型態"), value: morphologyValue, color: '#35b779' },
    { name: tr("異常型態"), value: 100 - morphologyValue, color: '#f59e0b' },
  ] : []

  const confirmReview = async () => {
    if (!record || reviewing) return
    setReviewing(true)
    setReviewNotice('')
    try {
      await completeCloudRecord(record.id)
      setReviewNotice(tr('複核完成，紀錄已更新。'))
      await reload()
    } catch (reviewError) {
      setReviewNotice(tr(reviewError.message || '複核失敗，請重新整理後再試。'))
    } finally {
      setReviewing(false)
    }
  }

  if (loading || error) return <div className="page-shell"><p role={error ? 'alert' : 'status'}>{error || tr("雲端紀錄載入中…")}</p>{error && <button onClick={reload}>{tr("重試")}</button>}</div>
  if (!record) return <div className="page-shell"><p>{tr("找不到此分析紀錄。")}</p><button onClick={() => navigate('/history')}>{tr("查看紀錄")}</button></div>

  return (
    <div className="page-shell result-page">
      {record.isDemo && <span className="chip neutral">{tr('模擬資料')}</span>}
      <header className="page-header">
        <div>
          <p className="eyebrow">{t.analysisResult}</p>
          <h2>{tr("檢體編號 #")}{sampleId}</h2>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-btn" onClick={() => navigate('/analysis')}>{t.retest}</button>
          {record.processingState === '待複核' && <button type="button" className="secondary-btn" onClick={confirmReview} disabled={reviewing}>{reviewing ? tr('複核中…') : t.confirmReview}</button>}
          <button type="button" className="primary-btn" onClick={() => window.print()}>{tr('列印／另存 PDF')}</button>
        </div>
      </header>

      <section className="summary-banner result-summary">
        <span className="status-pill neutral-badge">{record.processingState ? tr(record.processingState) : tr('待複核')}</span>
        <div>
          <h3>{t.testSummary}</h3>
          <p>{record.isDemo ? tr('本筆為模擬資料，未進行實際影像分析。') : tr('各項指標依系統參考範圍呈現，請由檢驗人員複核。')}</p>
        </div>
      </section>
      {reviewNotice && <p className="form-banner" role="status">{reviewNotice}</p>}

      <RecordActions key={record.id} record={record} onSaved={reload} onDeleted={() => navigate(`/patients/${record.patientId}/history`)} />
      <section className="result-overview standards-metric-grid">
        {CORE_MEASUREMENT_STANDARDS.map(item => {
          const result = evaluateMeasurement(record, item.key)
          return <div className="result-card" key={item.key}><span className="metric-label">{tr(item.label)}</span><div className="value-line"><strong>{formatMeasurement(result, tr('未判定'))}</strong></div><small>{tr('系統參考範圍')}：{tr(item.range)}</small><span className={`status-pill ${statusClass(result.state)}`}>{result.state === 'normal' ? tr('正常') : result.state === 'abnormal' ? tr('異常') : tr('未判定')}</span></div>
        })}
      </section>

      <section className="analysis-content">
        <div className="analysis-panel image-panel">
          <div className="panel-header">
            <h3>{t.imageYolo}</h3>
          </div>

          <div className="visual-box comparison-images">
            <div><h4>{tr(record.media?.media_kind === 'video' ? '原始影片' : '原始影像')}</h4>{record.media?.media_kind === 'video' ? <PrivateExamMedia record={record} /> : <PrivateImage path={record.imagePath} isDemo={record.isDemo} />}</div>
            <div><h4>{tr(record.media?.media_kind === 'video' ? '影片分析影像' : '分析後影像')}</h4>{record.analyzedImagePath ? <PrivateImage path={record.analyzedImagePath} /> : <p className="muted-preview">{tr(record.media?.media_kind === 'video' ? '目前沒有影片分析後影像。' : '目前沒有分析後影像。')}</p>}</div>
          </div>

          {!record.isDemo && ['detected', 'precision', 'confidence'].some(key => result.summary[key] !== null && result.summary[key] !== undefined) && <div className="evidence-row">
            <div>
              <span>{t.detected}</span>
              <strong>{result.summary.detected ?? tr('未提供')}</strong>
            </div>
            <div>
              <span>{t.precision}</span>
              <strong>{tr(result.summary.precision)}</strong>
            </div>
            <div>
              <span>{t.confidence}</span>
              <strong>{tr(result.summary.confidence)}</strong>
            </div>
          </div>}
        </div>

        <div className="analysis-panel info-panel">
          <div className="info-block">
            <div className="panel-header">
              <h3>{t.testSummary}</h3>
            </div>
            <ul className="summary-list">
          {CORE_MEASUREMENT_STANDARDS.map(item => <li key={item.key}><span>{tr(item.label)}</span><strong>{formatMeasurement(evaluateMeasurement(record, item.key), tr('未判定'))}</strong></li>)}
            </ul>
          </div>

          <div className="info-block chart-block">
            <div className="panel-header">
              <h3>{t.morphologyAnalysis}</h3>
              <span className="chart-percent">{tr("正常率")}{Number.isFinite(morphologyValue) ? `${morphologyValue}%` : tr('未判定')}</span>
            </div>
            <div className="chart-wrap">
              {chartData.length ? <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={4}>
                    {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer> : <p className="muted-preview">{tr('目前沒有型態比例資料，暫不顯示圖表。')}</p>}
            </div>
            <div className="chart-legend">
              {chartData.map((entry) => <span key={entry.name}><i style={{ background: entry.color }} />{entry.name} {entry.value}%</span>)}
            </div>
          </div>

          <div className="info-block signal-block">
            <div className="panel-header"><h3>{t.healthSignal}</h3></div>
            <div className="signal-list">{CORE_MEASUREMENT_STANDARDS.map(item => {
              const result = evaluateMeasurement(record, item.key)
              return <div key={item.key}><span className={`signal-dot ${result.state === 'normal' ? 'signal-green' : result.state === 'abnormal' ? 'signal-red' : 'signal-yellow'}`} />{tr(item.label)}<strong>{formatMeasurement(result, tr('未判定'))}</strong></div>
            })}</div>
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
        </div>
      </section>
      <ReportPreview record={record} />
    </div>
  )
}
