import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getHistoryRecords } from '../services/historyStorage.js'
import { useLanguage } from '../context/language.js'

function translateStatus(status, t) {
  if (status === '正常') return t.normal
  return t.followUp
}

function translateProcessingState(state, t) {
  if (state === '已完成') return t.completed
  return t.reviewResult
}

export function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const { t } = useLanguage()
  const navigate = useNavigate()
  const records = useMemo(() => getHistoryRecords(), [])

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return records.filter((record) => {
      const searchableText = [
        record.id,
        record.sampleId,
        record.date,
        record.status,
        record.processingState,
        record.patient?.name,
        record.patient?.doctor,
        record.patient?.phone,
        translateStatus(record.status, t),
        translateProcessingState(record.processingState, t),
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = !term || searchableText.includes(term)
      const matchesStartDate = !startDate || record.date >= startDate
      const matchesEndDate = !endDate || record.date <= endDate

      return matchesSearch && matchesStartDate && matchesEndDate
    })
  }, [records, searchTerm, startDate, endDate, t])

  const hasActiveFilters = searchTerm || startDate || endDate
  const patientRows = useMemo(() => {
    const groupedRecords = new Map()

    filteredRecords.forEach((record) => {
      const patientId = record.patient?.id ?? record.patient?.name
      const current = groupedRecords.get(patientId)
      if (!current) {
        groupedRecords.set(patientId, { patient: record.patient, records: [record] })
      } else {
        current.records.push(record)
      }
    })

    return Array.from(groupedRecords.values()).map(({ patient, records: patientRecords }) => {
      const latestRecord = [...patientRecords].sort((first, second) => second.date.localeCompare(first.date))[0]
      return { patient, latestRecord, count: patientRecords.length }
    })
  }, [filteredRecords])

  return (
    <div className="page-shell history-page">
      <section className="table-card">
        <div className="panel-header history-header">
          <h3>{t.historyList}</h3>
          <span className="chip neutral">{patientRows.length} {t.patientCount}</span>
        </div>

        <div className="history-filter-bar">
          <div className="search-box">
            <label htmlFor="history-search">{t.filter}</label>
            <input
              id="history-search"
              type="search"
              placeholder={t.historySearchPlaceholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <label className="history-filter-field">
            <span>{t.startDate}</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>

          <label className="history-filter-field">
            <span>{t.endDate}</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>

          {hasActiveFilters && (
            <button
              type="button"
              className="secondary-btn small history-clear-btn"
              onClick={() => {
                setSearchTerm('')
                setStartDate('')
                setEndDate('')
              }}
            >
              {t.clearFilters}
            </button>
          )}
        </div>

        <div className="record-list">
          {patientRows.length === 0 ? (
            <div className="empty-state">{t.noRecords}</div>
          ) : (
            patientRows.map(({ patient, latestRecord, count }) => (
              <div
                className="record-row"
                key={patient.id ?? patient.name}
              >
                <div aria-label={`${t.patientName}: ${patient.name}`}>
                  <strong>{patient.name}</strong>
                  <small>{patient.id}</small>
                  <small>{count} {t.recordCount}</small>
                </div>
                <div>
                  <strong>{latestRecord.date}</strong>
                  <small>{t.latestRecord}</small>
                </div>
                <span className={`status-pill ${latestRecord.status === '正常' ? 'success' : 'warning'}`}>
                  {translateStatus(latestRecord.status, t)}
                </span>
                <strong>{latestRecord.score}</strong>
                <button
                  type="button"
                  className="secondary-btn small"
                  onClick={() => navigate(`/patients/${patient.id ?? patient.name}/history`)}
                >
                  {t.viewPatientHistory}
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
