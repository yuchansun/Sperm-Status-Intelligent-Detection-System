import { translateText as tr, displayRecordSummary } from '../i18n/translate.js'
import { buildHistoryEmail } from '../i18n/reportText.js'
import { PatientActions } from '../components/analysis/PatientActions.jsx'
import { RecordActions } from '../components/analysis/RecordActions.jsx'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PrivateExamMedia } from '../components/analysis/PrivateExamMedia.jsx'
import { useCloudHistory } from '../hooks/useCloudHistory.js'
import { saveCloudNote, completeCloudRecord } from '../services/cloudApi.js'
import { isEmailJsConfigured, sendHistoryEmail } from '../services/emailService.js'
import { useLanguage } from '../context/language.js'
import { ReportPreview } from '../components/analysis/ReportPreview.jsx'
import { ResultEmail } from '../components/analysis/ResultEmail.jsx'
import { MorphologyBreakdown } from '../components/analysis/MorphologyBreakdown.jsx'
import { CORE_MEASUREMENT_STANDARDS, evaluateMeasurement, formatMeasurement, statusClass } from '../utils/measurementStandards.js'

const trendMetrics = {
  count: { key: 'countOfSpermatozoa', averageKey: 'density', label: '精蟲濃度', unit: '×10⁶/mL' },
  motilityValue: { key: 'motility', averageKey: 'motility', label: '活動力', unit: '%' },
  morphologyValue: { key: 'morphology', averageKey: 'morphology', label: '正常型態比例', unit: '%' },
}

const averageNumber = new Intl.NumberFormat('en', { maximumFractionDigits: 2, useGrouping: false })

function PatientTrendTooltip({ active, payload, label, averages, t }) {
  if (!active || !payload?.length) return null
  const record = payload[0]?.payload?.record
  return <div className="history-trend-tooltip">
    <strong>{label}</strong>
    {payload.filter(item => Number.isFinite(Number(item.value))).map(item => {
      const metric = trendMetrics[item.dataKey]
      if (!metric) return null
      const value = Number(item.value)
      const average = averages[metric.averageKey]
      const evaluation = record ? evaluateMeasurement(record, metric.key) : { state: 'unknown' }
      const stateLabel = evaluation.state === 'normal' ? t.normal : evaluation.state === 'abnormal' ? tr('異常') : tr('未判定')
      const difference = Number.isFinite(average) ? value - average : null
      const comparison = difference === null ? '' : Math.abs(difference) < 0.005
        ? tr('等於平均')
        : `${tr(difference > 0 ? '高於平均' : '低於平均')} ${averageNumber.format(Math.abs(difference))} ${metric.unit}`
      return <div className="history-trend-tooltip-row" key={item.dataKey}>
        <span><i style={{ backgroundColor: item.color }} />{tr(metric.label)}</span>
        <strong>{value.toFixed(1)} {metric.unit}</strong>
        <small>{tr('{{0}}：{{1}}', [tr('歷史平均'), Number.isFinite(average) ? `${averageNumber.format(average)} ${metric.unit}` : '—'])}
          {comparison ? ` · ${comparison}` : ''}</small>
        <em className={`status-pill ${statusClass(evaluation.state)}`}>{stateLabel}</em>
      </div>
    })}
    <p className="history-tooltip-note">{tr('狀態依系統參考範圍判定；平均值僅供個人趨勢比較。')}</p>
  </div>
}

export function PatientHistoryPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [expandedRecordId, setExpandedRecordId] = useState(null)
  const [doctorComment, setDoctorComment] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isCommentSaved, setIsCommentSaved] = useState(false)
  const { records, loading, error, reload } = useCloudHistory()
  const [email, setEmail] = useState('')
  const [emailNotice, setEmailNotice] = useState('')
  const patientRecords = useMemo(
    () => records
      .filter((record) => record.patient?.id === patientId)
      .sort((first, second) => first.date.localeCompare(second.date)),
    [records, patientId],
  )
  const patient = patientRecords[0]?.patient
  const latestRecord = patientRecords.at(-1)
  const defaultEmailContent = patient ? buildHistoryEmail(patient, patientRecords) : { subject: '', body: '' }
  const [emailDraft, setEmailDraft] = useState(null)
  let savedEmailDraft = null
  try { savedEmailDraft = JSON.parse(window.localStorage.getItem(`sperm-ai-history-email-${patientId}`) || 'null') } catch { /* Use generated content when no valid draft exists. */ }
  const currentEmailDraft = emailDraft?.patientId === patientId ? emailDraft : savedEmailDraft
  const emailSubject = currentEmailDraft?.subject ?? defaultEmailContent.subject
  const emailBody = currentEmailDraft?.body ?? defaultEmailContent.body
  const setEmailSubject = subject => setEmailDraft({ patientId, subject, body: emailBody })
  const setEmailBody = body => setEmailDraft({ patientId, subject: emailSubject, body })
  const [emailEditing, setEmailEditing] = useState(false)
  const averages = useMemo(() => {
    const average = (field) => {
      if (!patientRecords.length) return null
      const values = patientRecords.map(record => Number.parseFloat(field === 'density' ? record.measurements?.density ?? record.density : record.measurements?.[field] ?? record[field])).filter(Number.isFinite)
      if (!values.length) return null
      return values.reduce((sum, value) => sum + value, 0) / values.length
    }

    return {
      density: average('density'),
      motility: average('motility'),
      morphology: average('morphology'),
    }
  }, [patientRecords])
  const chartData = patientRecords.map((record) => ({
    record,
    date: record.date,
    count: Number.isFinite(Number.parseFloat(record.measurements?.density ?? record.density)) ? Number.parseFloat(record.measurements?.density ?? record.density) : null,
    motilityValue: Number.isFinite(Number.parseFloat(record.measurements?.motility ?? record.motility)) ? Number.parseFloat(record.measurements?.motility ?? record.motility) : null,
    morphologyValue: Number.isFinite(Number.parseFloat(record.measurements?.morphology ?? record.morphology)) ? Number.parseFloat(record.measurements?.morphology ?? record.morphology) : null,
  }))
  const averageAssessments = CORE_MEASUREMENT_STANDARDS.map(item => {
    const field = item.key === 'countOfSpermatozoa' ? 'density' : item.key
    const evaluation = evaluateMeasurement({ measurements: { [field]: averages[field] } }, item.key)
    const displayValue = evaluation.state === 'unknown' ? tr('未判定') : `${averageNumber.format(evaluation.value)} ${evaluation.unit}`
    return { ...item, evaluation, displayValue }
  })

  const handleSendHistoryEmail = async () => {
    const recipient = email.trim()
    if (!recipient) {
      setEmailNotice(t.emailRequired)
      return
    }

    const { subject, body } = { subject: emailSubject, body: emailBody }
    if (!isEmailJsConfigured()) {
      setEmailNotice(t.emailJsNotConfigured ?? tr("尚未設定 EmailJS，請先建立 .env.local。"))
      return
    }

    try {
      await sendHistoryEmail({ recipient, recipientName: patient.name, subject, body })
      window.localStorage.setItem('sperm-ai-history-email-log', JSON.stringify({ email: recipient, patientId: patient.id, sentAt: new Date().toISOString(), provider: 'emailjs' }))
      setEmailNotice(t.emailSendSuccess ?? tr("EmailJS 已送出完整檢驗報告與衛教內容。"))
    } catch {
      setEmailNotice(t.emailSendFailed ?? tr("EmailJS 寄送失敗，請檢查服務、範本與收件地址。"))
    }
  }

  const handleCopyHistoryEmail = async () => {
    const { subject, body } = { subject: emailSubject, body: emailBody }
    if (!navigator.clipboard) {
      setEmailNotice(t.emailCopyUnavailable)
      return
    }
    await navigator.clipboard.writeText(tr("主旨：{{0}}\n\n{{1}}", [subject, body]))
    setEmailNotice(t.emailCopySuccess)
  }

  const handleDownloadHistoryEmail = () => {
    const { subject, body } = { subject: emailSubject, body: emailBody }
    const file = new Blob([tr("主旨：{{0}}\n\n{{1}}", [subject, body])], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${patient.name}-${subject}.txt`
    link.click()
    URL.revokeObjectURL(url)
    setEmailNotice(t.emailDownloaded)
  }

  const handleShareHistoryEmail = async () => {
    if (!navigator.share) {
      setEmailNotice(t.emailShareUnavailable)
      return
    }

    const { subject, body } = { subject: emailSubject, body: emailBody }
    try {
      await navigator.share({ title: subject, text: body })
      setEmailNotice(t.emailShareSuccess)
    } catch {
      setEmailNotice(t.emailShareCancelled)
    }
  }

  if (loading || error) return <div className="page-shell"><p role={error ? 'alert' : 'status'}>{tr(error || "雲端紀錄載入中…")}</p>{error && <button onClick={reload}>{tr("重試")}</button>}</div>

  if (!patient) {
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

  return (
    <div className="page-shell history-page detail-mode">
      <section className="detail-card">
        {saveError && <p role="alert" className="form-banner error">{tr(saveError)}</p>}
        <div className="history-detail-header">
          <button type="button" className="back-btn" onClick={() => navigate('/history')}>
            ← {t.previousPage}
          </button>
          <div>
            <p className="eyebrow">{t.patientHistory}</p>
            <h3>{patient.name}</h3>
          </div>

        </div>

        <PatientActions key={patientId} patientId={patientId} onSaved={reload} onDeleted={() => navigate('/history')} />
        <div className="patient-grid">
          <div className="profile-block">
            <h4>{t.patientData}</h4>
            <ul>

              <li><span>{tr("身分證／病歷識別碼")}</span><strong>{patient.identity || '—'}</strong></li>
              <li><span>{t.age}</span><strong>{patient.age}</strong></li>
              <li><span>{t.phone}</span><strong>{patient.phone}</strong></li>
              <li><span>{t.doctor}</span><strong>{patient.doctor}</strong></li>
            </ul>
          </div>
          <div className="profile-block">
            <h4>{t.averageResults}</h4>
            <div className="average-result-grid">
              {averageAssessments.map(item => <div key={item.key} className="average-assessment-card">
                <small>{tr(item.label)}</small>
                <strong>{item.displayValue}</strong>
                <span className={`status-pill ${statusClass(item.evaluation.state)}`}>
                  {item.evaluation.state === 'normal' ? t.normal : item.evaluation.state === 'abnormal' ? tr('異常') : tr('未判定')}
                </span>
                <small>{tr('{{0}}：{{1}}', [tr('參考值'), tr(item.range)])}</small>
              </div>)}
            </div>
            <p className="average-assessment-note">{tr('以此病患已有數值的檢測紀錄計算平均；個別檢測仍請逐筆查看。')}</p>
            <div className="patient-current-status">
              <span>{tr(t.status)}</span>
              <strong className={`status-pill ${latestRecord.status === '正常' ? 'success' : 'warning'}`}>
                {latestRecord.status === '正常' ? t.normal : ['示範資料', '未判讀'].includes(latestRecord.status) ? tr('未判讀') : latestRecord.status === '未分析' ? tr("未分析") : t.followUp}
              </strong>
            </div>
          </div>
        </div>

        <div className="detail-card-box">
          <div className="history-trend-header">
            <div>
              <h4>{t.trendChartTitle}</h4>
              <p>{t.trendChartDescription}</p>
            </div>
          </div>
          <div className="history-trend-chart" aria-label={t.trendChartTitle}>
            <div className="history-average-strip" aria-label={tr('歷史平均')}>
              {averageAssessments.map(item => <span key={item.key}>
                <i className={`average-dot average-dot-${item.key}`} />
                {tr(item.label)} {item.displayValue}
                <b className={`status-pill ${statusClass(item.evaluation.state)}`}>
                  {item.evaluation.state === 'normal' ? t.normal : item.evaluation.state === 'abnormal' ? tr('異常') : tr('未判定')}
                </b>
              </span>)}
            </div>
            <div className="history-trend-plot"><ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#e5edf9" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#5b7290', fontSize: 11 }} />
                <YAxis yAxisId="count" tick={{ fill: '#5b7290', fontSize: 11 }} unit=" ×10⁶/mL" />
                <YAxis yAxisId="percent" orientation="right" tick={{ fill: '#5b7290', fontSize: 11 }} unit="%" />
                <Tooltip content={(props) => <PatientTrendTooltip {...props} averages={averages} t={t} />} />
                <Legend />
                <Line yAxisId="count" type="monotone" dataKey="count" name={`${t.concentration} (×10⁶/mL)`} stroke="#3f82f6" strokeWidth={3} connectNulls={false} dot={{ r: 4 }} />
                <Line yAxisId="percent" type="monotone" dataKey="motilityValue" name={`${t.motility} (%)`} stroke="#35b779" strokeWidth={3} connectNulls={false} dot={{ r: 4 }} />
                <Line yAxisId="percent" type="monotone" dataKey="morphologyValue" name={`${t.normalMorphology} (%)`} stroke="#f59e0b" strokeWidth={3} connectNulls={false} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer></div>
          </div>
        </div>

        <div className="detail-card-box doctor-comment-box">
          <div className="panel-header">
            <h4>{t.doctorComment}</h4>
            {isCommentSaved === patientId && <span className="status-pill success">{t.commentSaved}</span>}
          </div>
          <textarea
            value={doctorComment?.patientId === patientId ? doctorComment.value : patient.note ?? ''}
            placeholder={t.doctorCommentPlaceholder}
            onChange={(event) => {
              setDoctorComment({ patientId, value: event.target.value })
              setIsCommentSaved(false)
            }}
            rows="4"
          />
          <button
            type="button"
            className="primary-btn small doctor-comment-save"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              setSaveError('')
              try {
                await saveCloudNote(patientId, (doctorComment?.patientId === patientId ? doctorComment.value : patient.note ?? '').trim())
                setIsCommentSaved(patientId)
                reload()
              } catch (error) { setSaveError(error.message) }
              finally { setSaving(false) }
            }}
          >
            {t.saveComment}
          </button>
        </div>

        <div className="detail-card-box">
          <div className="panel-header">
            <h4>{t.patientRecords}</h4>
            <span className="chip neutral">{patientRecords.length} {t.resultCount}</span>
          </div>
          <div className="history-email-panel">
            <div>
              <strong>{t.sendHistoryEmail}</strong>
              <p>{t.historyEmailRecords}</p>
            </div>
            <div className="email-row">
              <input
                type="email"
                value={email}
                placeholder={t.historyEmailPlaceholder}
                aria-label={t.emailAddress}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setEmailNotice('')
                }}
              />
              <button type="button" className="primary-btn small" onClick={handleSendHistoryEmail}>
                {t.sendHistoryEmail}
              </button>
            </div>
            <button type="button" className="secondary-btn small" onClick={() => setEmailEditing(value => !value)}>{emailEditing ? tr('關閉編輯') : tr('Email 預覽與修改')}</button>
            {emailEditing && <div className="history-email-editor">
              <label>{tr('主旨')}<input value={emailSubject} onChange={event => setEmailSubject(event.target.value)} /></label>
              <label>{tr('內文')}<textarea rows="10" value={emailBody} onChange={event => setEmailBody(event.target.value)} /></label>
              <div className="email-preview"><strong>{emailSubject}</strong><pre>{emailBody}</pre></div>
              <button type="button" className="primary-btn small" onClick={() => { window.localStorage.setItem(`sperm-ai-history-email-${patientId}`, JSON.stringify({ subject: emailSubject, body: emailBody })); setEmailNotice(tr('Email 修改已儲存')) }}>{tr('儲存修改')}</button>
            </div>}
            <div className="email-tools">
              <button type="button" className="secondary-btn small" onClick={handleCopyHistoryEmail}>{t.emailCopy}</button>
              <button type="button" className="secondary-btn small" onClick={handleDownloadHistoryEmail}>{t.emailDownload}</button>
              <button type="button" className="secondary-btn small" onClick={handleShareHistoryEmail}>{t.emailShare}</button>
            </div>
            {emailNotice ? <p className="form-banner success history-email-notice">{tr(emailNotice)}</p> : null}
          </div>
          <div className="record-list patient-record-list">
            {patientRecords.map((record) => {
              const isExpanded = expandedRecordId === record.id
              const recordStates = CORE_MEASUREMENT_STANDARDS.map(item => evaluateMeasurement(record, item.key).state)
              const hasResult = recordStates.some(state => state !== 'unknown')
              const overallState = recordStates.includes('abnormal') ? 'abnormal' : recordStates.every(state => state === 'normal') ? 'normal' : 'unknown'
              const overallLabel = overallState === 'normal' ? t.normal : overallState === 'abnormal' ? tr('異常') : tr('未判定')
              return (
                <article className={`patient-record ${isExpanded ? 'patient-record-expanded' : ''}`} key={record.id}>
                  <RecordActions record={record} onSaved={reload} compact header={<button
                    type="button"
                    className="patient-record-summary"
                    aria-expanded={isExpanded}
                    aria-controls={`record-details-${record.id}`}
                    aria-label={isExpanded ? t.collapseRecord : t.expandRecord}
                    onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                  >
                    <span>
                      <strong>{record.date}</strong>
                      <small>{record.sampleId}</small>
                    </span>
                    <span>
                      <strong>{record.measurements?.density ?? record.density ?? '—'} ×10⁶/mL</strong>
                      <small>{t.concentration}</small>
                    </span>
                    <span className="status-pill neutral-badge">{tr(record.processingState)}</span>
                    {hasResult && <span className={`status-pill ${statusClass(overallState)}`}>{overallLabel}</span>}
                    <span className="patient-record-chevron" aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                  </button>} />

                  {isExpanded && (
                    <div className="patient-record-details" id={`record-details-${record.id}`}>
                      <div className="patient-record-detail-grid">
                        <div className="detail-card-box">
                          <h4>{t.analysisResult}</h4>
                          <ul className="summary-list compact-list">
                            {CORE_MEASUREMENT_STANDARDS.map(item => {
                              const evaluation = evaluateMeasurement(record, item.key)
                              const statusLabel = evaluation.state === 'normal' ? t.normal : evaluation.state === 'abnormal' ? tr('異常') : tr('未判定')
                              return <li key={item.key} className="historical-metric-row">
                                <span>{tr(item.label)}</span>
                                <strong>{formatMeasurement(evaluation, tr('未判定'))}</strong>
                                <em className={`status-pill ${statusClass(evaluation.state)}`}>{statusLabel}</em>
                              </li>
                            })}
                            {record.aiResult?.processingTime && !record.isDemo && <li><span>{tr(t.processingTime)}</span><strong>{tr(record.aiResult.processingTime)}</strong></li>}
                          </ul>
                        </div>
                        <div className="detail-card-box">
                          <h4>{t.imageYolo}</h4>
                          <PrivateExamMedia record={record} />
                        </div>
                      </div>
                      <div className="detail-card-box historical-morphology-card">
                        <MorphologyBreakdown record={record} height={145} />
                      </div>
                      <div className="patient-record-detail-grid">
                        <div className="detail-card-box">
                          <h4>{t.testSummary}</h4>
                          <p>{displayRecordSummary(record)}</p>
                          <ul className="summary-list compact-list">
                            {!record.isDemo && record.aiResult?.precision && <li><span>{tr(t.precision)}</span><strong>{tr(record.aiResult.precision)}</strong></li>}
                            {!record.isDemo && record.aiResult?.confidence && <li><span>{tr(t.confidence)}</span><strong>{tr(record.aiResult.confidence)}</strong></li>}
                          </ul>
                        </div>
                        <div className="detail-card-box">
                          <h4>{t.notes}</h4>
                          <p>{record.patient.note}</p>
                        </div>
                      </div>
                      {record.processingState === '待複核' ? (
                        <div className="doctor-review-action">
                          <div>
                            <strong>{t.confirmReview}</strong>
                            <p>{t.reviewHint}</p>
                          </div>
                          <button
                            type="button"
                            className="primary-btn small"
                            disabled={saving}
                            onClick={async () => {
                              setSaving(true)
                              setSaveError('')
                              try { await completeCloudRecord(record.id); reload() }
                              catch (error) { setSaveError(error.message) }
                              finally { setSaving(false) }
                            }}
                          >
                            {t.confirmReview}
                          </button>
                        </div>
                      ) : null}
                      <ReportPreview key={`report-${record.id}`} record={record} />
                      <ResultEmail key={`email-${record.id}`} record={record} />
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
