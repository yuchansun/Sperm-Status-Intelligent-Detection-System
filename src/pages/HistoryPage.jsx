import { useMemo, useState } from 'react'
import { historyRecords } from '../services/mockData.js'
import { useLanguage } from '../context/language.js'

export function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const { t } = useLanguage()

  const translateStatus = (status) => {
    if (status === '正常') return t.normal
    if (status === '異常') return t.attention
    return t.followUp
  }

  const translateProcessingState = (state) => {
    if (state === '已完成') return t.completed
    return t.reviewResult
  }

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return historyRecords

    return historyRecords.filter((record) => {
      const patientText = [
        record.id,
        record.sampleId,
        record.date,
        record.status,
        record.processingState,
        record.patient?.name,
        record.patient?.doctor,
      ]
        .join(' ')
        .toLowerCase()

      return patientText.includes(term)
    })
  }, [searchTerm])

  const selectedRecord = filteredRecords.find((record) => record.id === selectedId) ?? null

  if (selectedRecord) {
    return (
      <div className="page-shell history-page detail-mode">
        <section className="detail-card">
          <div className="history-detail-header">
            <button type="button" className="back-btn" onClick={() => setSelectedId(null)}>
              ← {t.previousPage}
            </button>
            <div>
              <p className="eyebrow">{t.patientData} / {t.testInfo}</p>
              <h3>{selectedRecord.patient.name}</h3>
            </div>
            <span className={`status-pill ${selectedRecord.status === '正常' ? 'success' : selectedRecord.status === '異常' ? 'danger' : 'warning'}`}>
              {translateStatus(selectedRecord.status)}
            </span>
          </div>

          <div className="patient-grid">
            <div className="profile-block">
              <h4>{t.patientData}</h4>
              <ul>
                <li><span>{t.patientNumber}</span><strong>{selectedRecord.id}</strong></li>
                <li><span>{t.sex}</span><strong>{selectedRecord.patient.sex}</strong></li>
                <li><span>{t.age}</span><strong>{selectedRecord.patient.age}</strong></li>
                <li><span>{t.phone}</span><strong>{selectedRecord.patient.phone}</strong></li>
                <li><span>{t.doctor}</span><strong>{selectedRecord.patient.doctor}</strong></li>
              </ul>
            </div>

            <div className="profile-block">
              <h4>{t.analysisResult}</h4>
              <div className="mini-metrics">
                <div>
                  <span>{t.concentration}</span>
                  <strong>{selectedRecord.density} M/mL</strong>
                </div>
                <div>
                  <span>{t.motility}</span>
                  <strong>{selectedRecord.motility}</strong>
                </div>
                <div>
                  <span>{t.morphology}</span>
                  <strong>{selectedRecord.morphology}</strong>
                </div>
                <div>
                  <span>{t.processingStatus}</span>
                  <strong>{translateProcessingState(selectedRecord.processingState)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-content-grid">
            <div className="detail-card-box">
              <h4>{t.testSummary}</h4>
              <p>{selectedRecord.summary}</p>
            </div>

            <div className="detail-card-box">
              <h4>{t.aiInterpretation}</h4>
              <ul className="summary-list compact-list">
                <li><span>Precision</span><strong>{selectedRecord.aiResult.precision}</strong></li>
                <li><span>Confidence</span><strong>{selectedRecord.aiResult.confidence}</strong></li>
                <li><span>{t.processingTime}</span><strong>{selectedRecord.aiResult.processingTime}</strong></li>
              </ul>
            </div>
          </div>

          <div className="detail-card-box">
            <h4>{t.notes}</h4>
            <p>{selectedRecord.patient.note}</p>
          </div>

          <div className="detail-card-box">
            <h4>{t.trend}</h4>
            <div className="trend-bar-wrap" aria-label={t.trend}>
              {selectedRecord.trend.map((value, index) => (
                <div key={`${selectedRecord.id}-${index}`} className="trend-bar-col">
                  <span className="trend-bar" style={{ height: `${(value / 22) * 100}%` }} />
                  <small>{index + 1}</small>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="page-shell history-page">
      <section className="table-card">
        <div className="panel-header history-header">
          <h3>{t.historyList}</h3>
          <div className="search-box">
            <input
              type="text"
              placeholder={t.historySearchPlaceholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <div className="record-list">
          {filteredRecords.length === 0 ? (
            <div className="empty-state">{t.noRecords}</div>
          ) : (
            filteredRecords.map((record) => (
              <div
                className="record-row"
                key={record.id}
              >
                <div>
                  <strong>{record.id}</strong>
                  <small>{record.sampleId}</small>
                </div>
                <div>
                  <strong>{record.date}</strong>
                  <small>{translateProcessingState(record.processingState)}</small>
                </div>
                <span className={`status-pill ${record.status === '正常' ? 'success' : record.status === '異常' ? 'danger' : 'warning'}`}>
                  {translateStatus(record.status)}
                </span>
                <strong>{record.score}</strong>
                <button
                  type="button"
                  className="secondary-btn small"
                  onClick={() => setSelectedId(record.id)}
                >
                  {t.viewDetails}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
