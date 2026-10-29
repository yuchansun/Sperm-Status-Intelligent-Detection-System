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
      if (!patientRecords.length) return 0
      const values = patientRecords.map(record => Number.parseFloat(field === 'density' ? record.measurements?.density ?? record.density : record.measurements?.[field] ?? record[field])).filter(Number.isFinite)
      if (!values.length) return '—'
      return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
    }

    return {
      density: average('density'),
      motility: average('motility'),
      morphology: average('morphology'),
    }
  }, [patientRecords])
  const chartData = patientRecords.map((record) => ({
    date: record.date,
    count: Number.isFinite(Number.parseFloat(record.measurements?.density ?? record.density)) ? Number.parseFloat(record.measurements?.density ?? record.density) : null,
    motilityValue: Number.isFinite(Number.parseFloat(record.measurements?.motility ?? record.motility)) ? Number.parseFloat(record.measurements?.motility ?? record.motility) : null,
    morphologyValue: Number.isFinite(Number.parseFloat(record.measurements?.morphology ?? record.morphology)) ? Number.parseFloat(record.measurements?.morphology ?? record.morphology) : null,
  }))

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

  if (loading || error) return <div className="page-shell"><p role={error ? 'alert' : 'status'}>{error || tr("雲端紀錄載入中…")}</p>{error && <button onClick={reload}>{tr("重試")}</button>}</div>

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
              <div><strong>{averages.density}</strong><span>×10⁶/mL</span><small>{t.averageConcentration}</small></div>
              <div><strong>{averages.motility === '—' ? '—' : `${averages.motility}%`}</strong><small>{t.averageMotility}</small></div>
              <div><strong>{averages.morphology === '—' ? '—' : `${averages.morphology}%`}</strong><small>{t.averageMorphology}</small></div>
            </div>
            <div className="patient-current-status">
              <span>{tr(t.status)}</span>
              <strong className={`status-pill ${latestRecord.status === '正常' ? 'success' : 'warning'}`}>
                {latestRecord.status === '正常' ? t.normal : latestRecord.status === '示範資料' ? tr('模擬資料') : latestRecord.status === '未分析' ? tr("未分析") : t.followUp}
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#e5edf9" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#5b7290', fontSize: 11 }} />
                <YAxis yAxisId="count" tick={{ fill: '#5b7290', fontSize: 11 }} unit=" ×10⁶/mL" />
                <YAxis yAxisId="percent" orientation="right" tick={{ fill: '#5b7290', fontSize: 11 }} unit="%" />
                <Tooltip />
                <Legend />
                <Line yAxisId="count" type="monotone" dataKey="count" name={`${t.concentration} (×10⁶/mL)`} stroke="#3f82f6" strokeWidth={3} connectNulls={false} dot={{ r: 4 }} />
                <Line yAxisId="percent" type="monotone" dataKey="motilityValue" name={`${t.motility} (%)`} stroke="#35b779" strokeWidth={3} connectNulls={false} dot={{ r: 4 }} />
                <Line yAxisId="percent" type="monotone" dataKey="morphologyValue" name={`${t.normalMorphology} (%)`} stroke="#f59e0b" strokeWidth={3} connectNulls={false} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
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
                    <span className="patient-record-chevron" aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                  </button>} />

                  {isExpanded && (
                    <div className="patient-record-details" id={`record-details-${record.id}`}>
                      <div className="patient-record-detail-grid">
                        <div className="detail-card-box">
                          <h4>{t.analysisResult}</h4>
                          <ul className="summary-list compact-list">
                            <li><span>{t.concentration}</span><strong>{record.measurements?.density ?? record.density ?? tr('未判定')} ×10⁶/mL</strong></li>
                            <li><span>{t.motility}</span><strong>{String(record.measurements?.motility ?? record.motility ?? tr('未判定')).replace(/%$/, '')} %</strong></li>
                            <li><span>{t.normalMorphology}</span><strong>{String(record.measurements?.morphology ?? record.morphology ?? tr('未判定')).replace(/%$/, '')} %</strong></li>
                            {record.aiResult?.processingTime && !record.isDemo && <li><span>{tr(t.processingTime)}</span><strong>{tr(record.aiResult.processingTime)}</strong></li>}
                          </ul>
                        </div>
                        <div className="detail-card-box">
                          <h4>{t.imageYolo}</h4>
                          <PrivateExamMedia record={record} />
                        </div>
                      </div>
                      <div className="patient-record-detail-grid">
                        <div className="detail-card-box">
                          <h4>{t.testSummary}</h4>
                          <p>{record.isDemo && <strong>{tr('模擬資料')} · </strong>}{displayRecordSummary(record)}</p>
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
