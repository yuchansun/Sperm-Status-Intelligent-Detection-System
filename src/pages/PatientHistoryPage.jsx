import { translateText as tr, displayRecordSummary } from '../i18n/translate.js'
import { buildHistoryEmail } from '../i18n/reportText.js'
import { PatientActions } from '../components/analysis/PatientActions.jsx'
import { RecordActions } from '../components/analysis/RecordActions.jsx'
import { useEffect, useMemo, useState } from 'react'
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
import { saveCloudNote, completeCloudRecord } from '../services/cloudApi.js'
import { isEmailJsConfigured, sendHistoryEmail } from '../services/emailService.js'
import { useLanguage } from '../context/language.js'

export function PatientHistoryPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { t, language } = useLanguage()
  const [expandedRecordId, setExpandedRecordId] = useState(null)
  const [doctorComment, setDoctorComment] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isCommentSaved, setIsCommentSaved] = useState(false)
  const { records, loading, error, reload } = useCloudHistory()
  const [email, setEmail] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailNotice, setEmailNotice] = useState('')
  const patientRecords = useMemo(
    () => records
      .filter((record) => record.patient?.id === patientId)
      .sort((first, second) => first.date.localeCompare(second.date)),
    [records, patientId],
  )
  const patient = patientRecords[0]?.patient
  const latestRecord = patientRecords.at(-1)
  const defaultEmailContent = useMemo(
    () => patient ? buildHistoryEmail(patient, patientRecords, language) : { subject: '', body: '' },
    [language, patient, patientRecords],
  )
  useEffect(() => {
    setEmailSubject(defaultEmailContent.subject)
    setEmailBody(defaultEmailContent.body)
  }, [defaultEmailContent])
  const averages = useMemo(() => {
    const average = (field) => {
      if (!patientRecords.length) return 0
      const values = patientRecords.map(record => Number.parseFloat(record[field])).filter(Number.isFinite)
      if (!values.length) return '—'
      return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
    }

    return {
      density: average('density'),
      motility: average('motility'),
      morphology: average('morphology'),
    }
  }, [patientRecords])
  const chartData = patientRecords.map((record) => {
    const toNumber = (value) => {
      if (value === null || value === undefined || value === '' || value === '—') return null
      const parsed = Number.parseFloat(value)
      return Number.isFinite(parsed) ? parsed : null
    }
    return {
      date: record.date,
      concentration: toNumber(record.density),
      motility: toNumber(record.motility),
    }
  })

  const getEmailContent = () => ({ subject: emailSubject, body: emailBody })

  const handleSendHistoryEmail = async () => {
    const recipient = email.trim()
    if (!recipient) {
      setEmailNotice(t.emailRequired)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      setEmailNotice(tr("請填寫有效的 Email 地址。"))
      return
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      setEmailNotice(tr("請填寫 Email 主旨與內文。"))
      return
    }

    const { subject, body } = getEmailContent()
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
    const { subject, body } = getEmailContent()
    if (!navigator.clipboard) {
      setEmailNotice(t.emailCopyUnavailable)
      return
    }
    await navigator.clipboard.writeText(tr("主旨：{{0}}\n\n{{1}}", [subject, body]))
    setEmailNotice(t.emailCopySuccess)
  }

  const handleDownloadHistoryEmail = () => {
    const { subject, body } = getEmailContent()
    const file = new Blob([tr("主旨：{{0}}\n\n{{1}}", [subject, body])], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${patient.name}-${getEmailContent().subject}.txt`
    link.click()
    URL.revokeObjectURL(url)
    setEmailNotice(t.emailDownloaded)
  }

  const handleShareHistoryEmail = async () => {
    if (!navigator.share) {
      setEmailNotice(t.emailShareUnavailable)
      return
    }

    const { subject, body } = getEmailContent()
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
            {patientRecords.some((item) => item.isDemo) && <p className="demo-image-note">{tr("平均數值含有模擬資料。")}</p>}
            <div className="patient-current-status">
              <span>{tr(t.status)}</span>
              <strong className={`status-pill ${latestRecord.isDemo ? 'neutral-badge' : latestRecord.status === '正常' ? 'success' : 'warning'}`}>
                {latestRecord.isDemo ? tr("示範資料") : latestRecord.status === '正常' ? t.normal : latestRecord.status === '示範資料' ? tr("示範資料") : latestRecord.status === '未分析' ? tr("未分析") : t.followUp}
              </strong>
            </div>
          </div>
        </div>

        <div className="detail-card-box">
          <div className="history-trend-header">
            <div>
              <h4>{t.trendChartTitle}</h4>
              <p>{tr("左軸為濃度（×10⁶/mL），右軸為活動力（%）。")}</p>
            </div>
          </div>
          <div className="history-trend-chart" aria-label={t.trendChartTitle}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 18, left: 4, bottom: 22 }}>
                <CartesianGrid stroke="#e5edf9" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: '#5b7290', fontSize: 11 }} label={{ value: tr("檢測日期"), position: 'insideBottom', offset: -8 }} />
                <YAxis yAxisId="concentration" tick={{ fill: '#5b7290', fontSize: 11 }} />
                <YAxis yAxisId="motility" orientation="right" unit="%" tick={{ fill: '#5b7290', fontSize: 11 }} />
                <Tooltip formatter={(value, name) => [value === null ? '—' : value, name]} />
                <Line yAxisId="concentration" type="monotone" dataKey="concentration" name={tr("精蟲濃度（×10⁶/mL）")} stroke="#3f82f6" strokeWidth={3} connectNulls={false} dot={{ r: 5, fill: '#3f82f6' }} activeDot={{ r: 7 }} />
                <Line yAxisId="motility" type="monotone" dataKey="motility" name={tr("活動力（%）")} stroke="#e58b2a" strokeWidth={3} connectNulls={false} dot={{ r: 5, fill: '#e58b2a' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            <span><i style={{ background: '#3f82f6' }} />{tr("精蟲濃度（×10⁶/mL）")}</span>
            <span><i style={{ background: '#e58b2a' }} />{tr("活動力（%）")}</span>
          </div>
          {patientRecords.some((item) => item.isDemo) && <p className="demo-image-note">{tr("此趨勢圖含有模擬資料。")}</p>}
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
            <div className="email-preview-form history-email-preview">
              <label className="email-preview-field">
                <span>{tr("收件地址")}</span>
                <input type="email" value={email} placeholder={t.historyEmailPlaceholder} aria-label={t.emailAddress}
                  onChange={(event) => { setEmail(event.target.value); setEmailNotice('') }} />
              </label>
              <label className="email-preview-field">
                <span>{tr("主旨")}</span>
                <input type="text" value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} />
              </label>
              <label className="email-preview-field">
                <span>{tr("內文")}</span>
                <textarea rows={12} value={emailBody} onChange={(event) => setEmailBody(event.target.value)} />
              </label>
              <div className="email-preview-actions">
              <button type="button" className="primary-btn small" onClick={handleSendHistoryEmail}>
                {t.sendHistoryEmail}
              </button>
                <button type="button" className="secondary-btn small" onClick={() => { setEmailSubject(defaultEmailContent.subject); setEmailBody(defaultEmailContent.body) }}>
                  {tr("還原預設內容")}
                </button>
              </div>
            </div>
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
                      <strong>{record.density ?? '—'} ×10⁶/mL</strong>
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
                            <li><span>{t.concentration}</span><strong>{record.density ?? '—'} ×10⁶/mL</strong></li>
                            <li><span>{t.motility}</span><strong>{record.motility}</strong></li>
                            <li><span>{t.morphology}</span><strong>{record.morphology}</strong></li>
                            {!record.isDemo && <li><span>{tr(t.processingTime)}</span><strong>{tr(record.aiResult.processingTime)}</strong></li>}
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
                          <p>{record.isDemo && <strong>Demo · </strong>}{displayRecordSummary(record)}</p>
                          {!record.isDemo && <ul className="summary-list compact-list">
                            <li><span>{tr(t.precision)}</span><strong>{tr(record.aiResult.precision)}</strong></li>
                            <li><span>{tr(t.confidence)}</span><strong>{tr(record.aiResult.confidence)}</strong></li>
                          </ul>}
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
