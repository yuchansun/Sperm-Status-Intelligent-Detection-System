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

function referenceStatus(metric, rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '' || rawValue === '—') return 'unknown'
  const value = Number.parseFloat(rawValue)
  if (!Number.isFinite(value)) return 'unknown'
  if (metric === 'concentration') return value > 20 && value < 120 ? 'within' : 'outside'
  if (metric === 'motility') return value > 50 ? 'within' : 'outside'
  if (metric === 'morphology') return value > 15 ? 'within' : 'outside'
  return 'unknown'
}

function formatPercent(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '' || rawValue === '—') return '—'
  const value = String(rawValue)
  return value.includes('%') ? value : `${value}%`
}

function referenceText(metric) {
  if (metric === 'concentration') return tr("Excel 參考：20–120 ×10⁶/mL（等於界線視為未達）")
  if (metric === 'motility') return tr("Excel 參考：>50%")
  if (metric === 'morphology') return tr("Excel 參考：>15%")
  return ''
}

function ReferenceStatus({ status }) {
  const label = status === 'within'
    ? tr("符合 Excel 參考範圍")
    : status === 'outside'
      ? tr("未達 Excel 參考範圍")
      : tr("未判讀")
  return <div className={`status-inline ${status === 'within' ? 'success' : status === 'outside' ? 'danger' : 'neutral'}`}>{label}</div>
}

export function AnalysisResultPage() {
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
  const morphologyValue = Number.parseFloat(record?.morphology)
  const chartData = Number.isFinite(morphologyValue) && morphologyValue >= 0 && morphologyValue <= 100 ? [
    { name: tr("正常型態"), value: morphologyValue, color: '#35b779' },
    { name: tr("異常型態"), value: 100 - morphologyValue, color: '#f59e0b' },
  ] : []

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
        <span className="status-pill neutral-badge">{record.isDemo ? tr("示範資料") : tr("未判讀")}</span>
        <div>
          <h3>{record.isDemo ? tr("示範分析結果") : t.testSummary}</h3>
          <p>{record.isDemo
            ? tr("此頁數值與影像標記為模擬資料，未經實際分析；判讀僅依老師 Excel 規則示範。")
            : record.summary || tr("目前只依老師 Excel 顯示參考範圍，未提供其他臨床判讀。")}</p>
        </div>
      </section>

      <RecordActions key={record.id} record={record} onSaved={reload} onDeleted={() => navigate(`/patients/${record.patientId}/history`)} />
      <section className="result-overview">
        <div className="result-card highlight">
          <span className="metric-label">{t.concentration}</span>
          <div className="value-line">
            <strong>{record.density ?? '—'}</strong>
            <span>×10⁶/mL</span>
          </div>
          <small className="reference-range-note">{referenceText('concentration')}</small>
          <ReferenceStatus status={referenceStatus('concentration', record.density)} />
        </div>

        <div className="result-card">
          <span className="metric-label">{t.normalMorphology}</span>
          <div className="value-line">
            <strong>{formatPercent(record.morphology)}</strong>
          </div>
          <small className="reference-range-note">{referenceText('morphology')}</small>
          <ReferenceStatus status={referenceStatus('morphology', record.morphology)} />
        </div>

        <div className="result-card">
          <span className="metric-label">{t.motility}</span>
          <div className="value-line">
            <strong>{formatPercent(record.motility)}</strong>
          </div>
          <small className="reference-range-note">{referenceText('motility')}</small>
          <ReferenceStatus status={referenceStatus('motility', record.motility)} />
        </div>
      </section>

      <section className="analysis-content">
        <div className="analysis-panel image-panel">
          <div className="panel-header">
            <h3>{t.imageYolo}</h3>
          </div>

          <div className="image-comparison-grid">
            <section className="comparison-image">
              <h4>{t.originalImage}</h4>
              {record.media?.media_kind === 'video'
                ? <PrivateExamMedia record={record} />
                : <div className="visual-box"><PrivateImage path={record.imagePath} isDemo={record.isDemo} /></div>}
            </section>
            <section className="comparison-image">
              <h4>{record.analyzedImagePath ? t.yoloView : tr("示範標記（疊加於原圖）")}</h4>
              <div className="visual-box">
                {record.analyzedImagePath
                  ? <PrivateImage path={record.analyzedImagePath} />
                  : <>
                    <PrivateImage path={record.imagePath} isDemo={record.isDemo} />
                    <div className="result-box-overlay" aria-label={t.yoloView}>
                      {result.boxes.map((box) => <span key={box.id} className="result-bounding-box" style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.width}%`, height: `${box.height}%` }} />)}
                    </div>
                  </>}
              </div>
              {!record.analyzedImagePath && <p className="demo-image-note">{tr("框線為介面示範，非本次影像的實際辨識結果。")}</p>}
            </section>
          </div>

          {!record.isDemo && <div className="evidence-row">
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
          </div>}
        </div>

        <div className="analysis-panel info-panel">
          <div className="info-block">
            <div className="panel-header">
              <h3>{t.testSummary}</h3>
            </div>
            <ul className="summary-list">
              <li><span>{t.concentration}</span><strong>{record.density ?? '—'} ×10⁶/mL</strong></li>
              <li><span>{t.normalMorphology}</span><strong>{formatPercent(record.morphology)}</strong></li>
              <li><span>{t.motility}</span><strong>{formatPercent(record.motility)}</strong></li>
            </ul>
          </div>

          <div className="info-block chart-block">
            <div className="panel-header">
              <h3>{t.morphologyAnalysis}</h3>
              <span className="chart-percent">{tr("正常率")}{record.morphology}</span>
            </div>
            {chartData.length ? <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={190}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={4}>
                    {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div> : <p>{tr("型態比例沒有資料，暫不顯示圖表或判讀。")}</p>}
            <div className="chart-legend">
              {chartData.map((entry) => <span key={entry.name}><i style={{ background: entry.color }} />{entry.name} {entry.value}%</span>)}
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
