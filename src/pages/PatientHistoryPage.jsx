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
import { getHistoryRecords } from '../services/historyStorage.js'
import { getPatientNote, savePatientNote } from '../services/patientNotesStorage.js'
import { useLanguage } from '../context/language.js'

export function PatientHistoryPage() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [metric, setMetric] = useState('density')
  const [expandedRecordId, setExpandedRecordId] = useState(null)
  const [doctorComment, setDoctorComment] = useState(() => getPatientNote(patientId))
  const [isCommentSaved, setIsCommentSaved] = useState(false)
  const records = useMemo(() => getHistoryRecords(), [])
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