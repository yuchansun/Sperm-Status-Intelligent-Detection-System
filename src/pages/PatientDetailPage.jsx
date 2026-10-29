import { translateText as tr, displayRecordSummary } from '../i18n/translate.js'
import { RecordActions } from '../components/analysis/RecordActions.jsx'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PrivateExamMedia } from '../components/analysis/PrivateExamMedia.jsx'
import { useCloudHistory } from '../hooks/useCloudHistory.js'
import { useLanguage } from '../context/language.js'

export function PatientDetailPage() {
  const { recordId } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { records, loading, error, reload } = useCloudHistory()
  const record = records.find((historyRecord) => historyRecord.id === recordId)
  const [metric, setMetric] = useState('density')
  const patientKey = record?.patient?.id ?? record?.patient?.name
  const trendRecords = useMemo(
    () => records
      .filter((historyRecord) => (historyRecord.patient?.id ?? historyRecord.patient?.name) === patientKey)
      .sort((first, second) => first.date.localeCompare(second.date)),
    [records, patientKey],
  )
  const chartData = trendRecords.map((historyRecord) => ({
    date: historyRecord.date,
    value: Number.isFinite(Number.parseFloat(historyRecord[metric])) ? Number.parseFloat(historyRecord[metric]) : null,
  }))

  if (loading || error) return <div className="page-shell"><p role={error ? 'alert' : 'status'}>{error || tr("雲端紀錄載入中…")}</p>{error && <button onClick={reload}>{tr("重試")}</button>}</div>

  if (!record) {
    return (
      <div className="page-shell">
        <section className="detail-card">
          <button type="button" className="back-btn" onClick={() => navigate('/history')}>
            ← {t.previousPage}
          </button>
          <p>{t.noRecords}</p>
        </section>
      </div>
    )
  }

  const translateStatus = record.status === '正常' ? t.normal : record.status === '示範資料' ? tr("示範資料") : record.status === '未判讀' ? tr("未判讀") : record.status === '未分析' ? tr("未分析") : t.followUp
  const translateProcessingState = record.processingState === '已完成' ? t.completed : record.processingState === '待複核' ? t.reviewResult : record.processingState

  return (
    <div className="page-shell history-page detail-mode">
      <section className="detail-card">
        <div className="history-detail-header">
          <button type="button" className="back-btn" onClick={() => navigate('/history')}>
            ← {t.previousPage}
          </button>
          <div>
            <p className="eyebrow">{t.patientData} / {t.testInfo}</p>
            <h3>{record.patient.name}</h3>
          </div>
          <span className={`status-pill ${record.status === '正常' ? 'success' : 'warning'}`}>
            {tr(translateStatus)}
          </span>
        </div>

        <RecordActions key={record.id} record={record} onSaved={reload} onDeleted={() => navigate(`/patients/${record.patientId}/history`)} />
        <div className="patient-grid">
          <div className="profile-block">
            <h4>{t.patientData}</h4>
            <ul>

              <li><span>{t.sampleId}</span><strong>{record.sampleId}</strong></li>
              <li><span>{t.collectionTime}</span><strong>{record.date}</strong></li>
              <li><span>{tr("身分證字號")}</span><strong>{record.patient.nationalId || '—'}</strong></li>
              <li><span>{t.age}</span><strong>{record.patient.age}</strong></li>
              <li><span>{t.phone}</span><strong>{record.patient.phone}</strong></li>
              <li><span>{t.doctor}</span><strong>{record.patient.doctor}</strong></li>
            </ul>
          </div>

          <div className="profile-block">
            <h4>{t.analysisResult}</h4>
            <div className="mini-metrics">
              <div><span>{t.concentration}</span><strong>{record.density} million/mL</strong></div>
              <div><span>{t.motility}</span><strong>{record.motility}</strong></div>
              <div><span>{t.morphology}</span><strong>{record.morphology}</strong></div>
              <div><span>{t.processingStatus}</span><strong>{tr(translateProcessingState)}</strong></div>
            </div>
          </div>
        </div>

        <div className="detail-content-grid">
          <div className="detail-card-box">
            <h4>{t.imageYolo}</h4>
            <PrivateExamMedia record={record} />
          </div>

          <div className="detail-card-box">
            <h4>{t.testSummary}</h4>
            <p>{record.isDemo && <strong>{tr("【示範分析】")}</strong>}{displayRecordSummary(record)}</p>
            <ul className="summary-list compact-list">
              <li><span>{tr(t.precision)}</span><strong>{tr(record.aiResult.precision)}</strong></li>
              <li><span>{tr(t.confidence)}</span><strong>{tr(record.aiResult.confidence)}</strong></li>
              <li><span>{tr(t.processingTime)}</span><strong>{tr(record.aiResult.processingTime)}</strong></li>
            </ul>
          </div>
        </div>

        <div className="detail-card-box">
          <h4>{t.notes}</h4>
          <p>{record.patient.note}</p>
        </div>

        <div className="detail-card-box">
          <div className="panel-header">
            <h4>{t.trend}</h4>
            <span className="chip neutral">{tr(translateProcessingState)}</span>
          </div>
          <div className="history-trend-header">
            <div>
              <h4>{t.trendChartTitle}</h4>
              <p>{t.trendChartDescription}</p>
            </div>
            <label className="history-trend-select">
              <span>{t.trendMetric}</span>
              <select value={metric} onChange={(event) => setMetric(event.target.value)}>
                <option value="density">{t.concentration}</option>
                <option value="motility">{t.motility}</option>
                <option value="morphology">{t.morphology}</option>
              </select>
            </label>
          </div>
          <div className="history-trend-chart" aria-label={t.trendChartTitle}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#e5edf9" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#5b7290', fontSize: 11 }} />
                <YAxis tick={{ fill: '#5b7290', fontSize: 11 }} />
                <Tooltip formatter={(value) => [value, t[metric]]} />
                <Line type="monotone" dataKey="value" name={t[metric]} stroke="#3f82f6" strokeWidth={3} dot={{ r: 4, fill: '#3f82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  )
}
