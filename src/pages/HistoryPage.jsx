import { useEffect, useMemo, useState } from 'react'
import { historyRecords } from '../services/mockData.js'

export function HistoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedId, setSelectedId] = useState(null)

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

  useEffect(() => {
    if (selectedId && !filteredRecords.some((record) => record.id === selectedId)) {
      setSelectedId(null)
    }
  }, [filteredRecords, selectedId])

  const selectedRecord = filteredRecords.find((record) => record.id === selectedId) ?? null

  if (selectedRecord) {
    return (
      <div className="page-shell history-page detail-mode">
        <section className="detail-card">
          <div className="history-detail-header">
            <button type="button" className="back-btn" onClick={() => setSelectedId(null)}>
              ← 上一頁
            </button>
            <div>
              <p className="eyebrow">病患資料 / 檢驗詳情</p>
              <h3>{selectedRecord.patient.name}</h3>
            </div>
            <span className={`status-pill ${selectedRecord.status === '正常' ? 'success' : selectedRecord.status === '異常' ? 'danger' : 'warning'}`}>
              {selectedRecord.status}
            </span>
          </div>

          <div className="patient-grid">
            <div className="profile-block">
              <h4>病患資料</h4>
              <ul>
                <li><span>病患編號</span><strong>{selectedRecord.id}</strong></li>
                <li><span>性別</span><strong>{selectedRecord.patient.sex}</strong></li>
                <li><span>年齡</span><strong>{selectedRecord.patient.age} 歲</strong></li>
                <li><span>電話</span><strong>{selectedRecord.patient.phone}</strong></li>
                <li><span>主治醫師</span><strong>{selectedRecord.patient.doctor}</strong></li>
              </ul>
            </div>

            <div className="profile-block">
              <h4>檢驗結果</h4>
              <div className="mini-metrics">
                <div>
                  <span>濃度</span>
                  <strong>{selectedRecord.density} M/mL</strong>
                </div>
                <div>
                  <span>活動力</span>
                  <strong>{selectedRecord.motility}</strong>
                </div>
                <div>
                  <span>型態</span>
                  <strong>{selectedRecord.morphology}</strong>
                </div>
                <div>
                  <span>處理狀態</span>
                  <strong>{selectedRecord.processingState}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="detail-content-grid">
            <div className="detail-card-box">
              <h4>檢驗摘要</h4>
              <p>{selectedRecord.summary}</p>
            </div>

            <div className="detail-card-box">
              <h4>AI 判讀資訊</h4>
              <ul className="summary-list compact-list">
                <li><span>Precision</span><strong>{selectedRecord.aiResult.precision}</strong></li>
                <li><span>Confidence</span><strong>{selectedRecord.aiResult.confidence}</strong></li>
                <li><span>處理時間</span><strong>{selectedRecord.aiResult.processingTime}</strong></li>
              </ul>
            </div>
          </div>

          <div className="detail-card-box">
            <h4>病歷與備註</h4>
            <p>{selectedRecord.patient.note}</p>
          </div>

          <div className="detail-card-box">
            <h4>精子數量趨勢</h4>
            <div className="trend-bar-wrap" aria-label="trend chart">
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
          <h3>檢驗紀錄列表</h3>
          <div className="search-box">
            <input
              type="text"
              placeholder="搜尋病患 / 檢驗編號 / 日期 / 處理狀態"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <div className="record-list">
          {filteredRecords.length === 0 ? (
            <div className="empty-state">查無符合條件的紀錄</div>
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
                  <small>{record.processingState}</small>
                </div>
                <span className={`status-pill ${record.status === '正常' ? 'success' : record.status === '異常' ? 'danger' : 'warning'}`}>
                  {record.status}
                </span>
                <strong>{record.score}</strong>
                <button
                  type="button"
                  className="secondary-btn small"
                  onClick={() => setSelectedId(record.id)}
                >
                  查看詳情
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
