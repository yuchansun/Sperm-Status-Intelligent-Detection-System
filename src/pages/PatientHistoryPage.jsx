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
import image from '../assets/image.png'
import { getHistoryRecords, updateHistoryRecord } from '../services/historyStorage.js'
import { getPatientNote, savePatientNote } from '../services/patientNotesStorage.js'
import { isEmailJsConfigured, sendHistoryEmail } from '../services/emailService.js'
import { useLanguage } from '../context/language.js'

export function PatientHistoryPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [metric, setMetric] = useState('density')
  const [expandedRecordId, setExpandedRecordId] = useState(null)
  const [doctorComment, setDoctorComment] = useState(() => getPatientNote(patientId))
  const [isCommentSaved, setIsCommentSaved] = useState(false)
  const [records, setRecords] = useState(getHistoryRecords)
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
  const averages = useMemo(() => {
    const average = (field) => {
      if (!patientRecords.length) return 0
      const total = patientRecords.reduce((sum, record) => sum + Number.parseFloat(record[field]), 0)
      return (total / patientRecords.length).toFixed(1)
    }

    return {
      density: average('density'),
      motility: average('motility'),
      morphology: average('morphology'),
    }
  }, [patientRecords])
  const chartData = patientRecords.map((record) => ({
    date: record.date,
    value: Number.parseFloat(record[metric]),
  }))

  const getEmailContent = () => {
    const sortedRecords = [...patientRecords].sort((first, second) => second.date.localeCompare(first.date))
    const latest = sortedRecords[0]
    const educationText = t.emailEducationDetailed ?? '1. 維持規律睡眠與作息，避免長期熬夜與過度疲勞。\n2. 避免長時間處於高溫環境，並保持適度運動與健康體重。\n3. 維持均衡飲食，避免抽菸、過量飲酒與不必要的藥物。\n4. 管理壓力並依醫師建議安排複檢。'
    const reportLines = sortedRecords.flatMap((record, index) => [
      `第 ${index + 1} 筆檢驗`,
      `檢驗日期：${record.date}`,
      `檢體編號：${record.sampleId}`,
      `處理狀態：${record.processingState}`,
      `精蟲濃度：${record.density} M/mL`,
      `活動力：${record.motility}`,
      `正常型態：${record.morphology}`,
      `AI 辨識精確度：${record.aiResult.precision}`,
      `AI 辨識信心度：${record.aiResult.confidence}`,
      `AI 分析耗時：${record.aiResult.processingTime}`,
      `檢驗摘要：${record.summary}`,
      `醫師備註：${record.patient.note || '目前沒有備註'}`,
      '',
    ])
    const subject = `${t.historyEmailSubject} - ${patient.name}`
    const body = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '精蟲 AI 智慧輔助檢驗報告',
      '歷史檢驗資料與個人化衛教資訊',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      `親愛的 ${patient.name} 您好：`,
      '以下是您的精蟲檢驗歷史資料與衛教建議，請妥善保存，並於回診時提供給醫師參考。',
      '',
      '【一、病患與報告資訊】',
      `病患姓名：${patient.name}`,
      `病患 ID：${patient.id}`,
      `性別：${patient.sex}`,
      `年齡：${patient.age}`,
      `聯絡電話：${patient.phone}`,
      `主治醫師：${patient.doctor}`,
      `檢驗紀錄筆數：${patientRecords.length} 筆`,
      '',
      '【二、歷史檢驗結果】',
      '',
      ...reportLines,
      '【三、目前結果判讀】',
      `最新檢驗日期：${latest?.date ?? '—'}`,
      `最新檢體編號：${latest?.sampleId ?? '—'}`,
      `目前濃度：${latest?.density ?? '—'} M/mL`,
      `目前活動力：${latest?.motility ?? '—'}`,
      `目前正常型態：${latest?.morphology ?? '—'}`,
      `判讀摘要：${latest?.summary ?? '—'}`,
      '',
      '【四、紅綠燈指標說明】',
      '● 綠燈：代表該項數值目前達到系統參考標準。',
      '● 黃燈：代表數值接近下限或需要持續追蹤，請配合醫師建議複檢。',
      '● 紅燈：代表數值明顯異常，建議儘早回診並由專業醫師進一步評估。',
      '本報告中的燈號為 AI 輔助提示，不代表單獨的醫療診斷。',
      '',
      '【五、生活與健康衛教】',
      educationText,
      '',
      '【六、後續檢查建議】',
      '1. 若本次結果為待追蹤或異常，請依醫師安排於適當時間複檢。',
      '2. 複檢前請依醫療人員指示維持適當禁慾天數，避免自行比較不同檢驗條件下的數值。',
      '3. 若有備孕需求、持續數值異常或其他不適，請攜帶本報告與歷史趨勢諮詢泌尿科或生殖醫學科。',
      '',
      '【重要提醒】',
      '本信件內容為檢驗資料整理與一般性衛教資訊，不能取代醫師問診、身體檢查或正式醫療診斷。若您有任何疑問，請直接諮詢您的主治醫師。',
      '',
      '本報告由精蟲 AI 智慧輔助檢驗平台產生。請勿將本報告轉寄給非相關人員，以保護個人健康資料。',
    ].join('\n')
    return { subject, body }
  }

  const handleSendHistoryEmail = async () => {
    const recipient = email.trim()
    if (!recipient) {
      setEmailNotice(t.emailRequired)
      return
    }

    const { subject, body } = getEmailContent()
    if (!isEmailJsConfigured()) {
      setEmailNotice(t.emailJsNotConfigured ?? '尚未設定 EmailJS，請先建立 .env.local。')
      return
    }

    try {
      await sendHistoryEmail({ recipient, recipientName: patient.name, subject, body })
      window.localStorage.setItem('sperm-ai-history-email-log', JSON.stringify({ email: recipient, patientId: patient.id, sentAt: new Date().toISOString(), provider: 'emailjs' }))
      setEmailNotice(t.emailSendSuccess ?? 'EmailJS 已送出完整檢驗報告與衛教內容。')
    } catch {
      setEmailNotice(t.emailSendFailed ?? 'EmailJS 寄送失敗，請檢查服務、範本與收件地址。')
    }
  }

  const handleCopyHistoryEmail = async () => {
    const { subject, body } = getEmailContent()
    if (!navigator.clipboard) {
      setEmailNotice(t.emailCopyUnavailable)
      return
    }
    await navigator.clipboard.writeText(`主旨：${subject}\n\n${body}`)
    setEmailNotice(t.emailCopySuccess)
  }

  const handleDownloadHistoryEmail = () => {
    const { subject, body } = getEmailContent()
    const file = new Blob([`主旨：${subject}\n\n${body}`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = `${patient.name}-精蟲檢驗歷史與衛教.txt`
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
        <div className="history-detail-header">
          <button type="button" className="back-btn" onClick={() => navigate('/history')}>
            ← {t.previousPage}
          </button>
          <div>
            <p className="eyebrow">{t.patientHistory}</p>
            <h3>{patient.name}</h3>
          </div>
          <span className="chip neutral">{patient.id}</span>
        </div>

        <div className="patient-grid">
          <div className="profile-block">
            <h4>{t.patientData}</h4>
            <ul>
              <li><span>{t.patientId}</span><strong>{patient.id}</strong></li>
              <li><span>{t.age}</span><strong>{patient.age}</strong></li>
              <li><span>{t.sex}</span><strong>{patient.sex}</strong></li>
              <li><span>{t.phone}</span><strong>{patient.phone}</strong></li>
              <li><span>{t.doctor}</span><strong>{patient.doctor}</strong></li>
            </ul>
          </div>
          <div className="profile-block">
            <h4>{t.averageResults}</h4>
            <div className="average-result-grid">
              <div><strong>{averages.density}</strong><span>M/mL</span><small>{t.averageConcentration}</small></div>
              <div><strong>{averages.motility}%</strong><small>{t.averageMotility}</small></div>
              <div><strong>{averages.morphology}%</strong><small>{t.averageMorphology}</small></div>
            </div>
            <div className="patient-current-status">
              <span>{t.status}</span>
              <strong className={`status-pill ${latestRecord.status === '正常' ? 'success' : 'warning'}`}>
                {latestRecord.status === '正常' ? t.normal : t.followUp}
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
                <Line type="monotone" dataKey="value" name={t[metric]} stroke="#3f82f6" strokeWidth={3} dot={{ r: 5, fill: '#3f82f6' }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="detail-card-box doctor-comment-box">
          <div className="panel-header">
            <h4>{t.doctorComment}</h4>
            {isCommentSaved && <span className="status-pill success">{t.commentSaved}</span>}
          </div>
          <textarea
            value={doctorComment}
            placeholder={t.doctorCommentPlaceholder}
            onChange={(event) => {
              setDoctorComment(event.target.value)
              setIsCommentSaved(false)
            }}
            rows="4"
          />
          <button
            type="button"
            className="primary-btn small doctor-comment-save"
            onClick={() => {
              savePatientNote(patientId, doctorComment.trim())
              setIsCommentSaved(true)
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
            <div className="email-tools">
              <button type="button" className="secondary-btn small" onClick={handleCopyHistoryEmail}>{t.emailCopy}</button>
              <button type="button" className="secondary-btn small" onClick={handleDownloadHistoryEmail}>{t.emailDownload}</button>
              <button type="button" className="secondary-btn small" onClick={handleShareHistoryEmail}>{t.emailShare}</button>
            </div>
            {emailNotice ? <p className="form-banner success history-email-notice">{emailNotice}</p> : null}
          </div>
          <div className="record-list patient-record-list">
            {patientRecords.map((record) => {
              const isExpanded = expandedRecordId === record.id
              return (
                <article className={`patient-record ${isExpanded ? 'patient-record-expanded' : ''}`} key={record.id}>
                  <button
                    type="button"
                    className="patient-record-summary"
                    aria-expanded={isExpanded}
                    aria-controls={`record-details-${record.id}`}
                    aria-label={isExpanded ? t.collapseRecord : t.expandRecord}
                    onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                  >
                    <span>
                      <strong>{record.date}</strong>
                      <small>{record.id}</small>
                    </span>
                    <span>
                      <strong>{record.density} M/mL</strong>
                      <small>{t.concentration}</small>
                    </span>
                    <span className="status-pill neutral-badge">{record.processingState}</span>
                    <span className="patient-record-chevron" aria-hidden="true">{isExpanded ? '−' : '+'}</span>
                  </button>

                  {isExpanded && (
                    <div className="patient-record-details" id={`record-details-${record.id}`}>
                      <div className="patient-record-detail-grid">
                        <div className="detail-card-box">
                          <h4>{t.analysisResult}</h4>
                          <ul className="summary-list compact-list">
                            <li><span>{t.concentration}</span><strong>{record.density} M/mL</strong></li>
                            <li><span>{t.motility}</span><strong>{record.motility}</strong></li>
                            <li><span>{t.morphology}</span><strong>{record.morphology}</strong></li>
                            <li><span>{t.processingTime}</span><strong>{record.aiResult.processingTime}</strong></li>
                          </ul>
                        </div>
                        <div className="detail-card-box">
                          <h4>{t.imageYolo}</h4>
                          <img className="history-detail-image" src={image} alt={t.imageYolo} />
                        </div>
                      </div>
                      <div className="patient-record-detail-grid">
                        <div className="detail-card-box">
                          <h4>{t.testSummary}</h4>
                          <p>{record.summary}</p>
                          <ul className="summary-list compact-list">
                            <li><span>{t.precision}</span><strong>{record.aiResult.precision}</strong></li>
                            <li><span>{t.confidence}</span><strong>{record.aiResult.confidence}</strong></li>
                          </ul>
                        </div>
                        <div className="detail-card-box">
                          <h4>{t.notes}</h4>
                          <p>{record.patient.note}</p>
                        </div>
                      </div>
                      {record.processingState !== '已完成' ? (
                        <div className="doctor-review-action">
                          <div>
                            <strong>{t.confirmReview}</strong>
                            <p>{t.reviewHint}</p>
                          </div>
                          <button
                            type="button"
                            className="primary-btn small"
                            onClick={() => {
                              updateHistoryRecord(record.id, { processingState: '已完成', status: '需追蹤' })
                              setRecords(getHistoryRecords())
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