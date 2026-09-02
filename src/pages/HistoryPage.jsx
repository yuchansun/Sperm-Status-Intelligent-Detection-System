import { historyRecords } from '../services/mockData.js'

export function HistoryPage() {
  return (
    <div className="page-shell">
      <section className="table-card">
        <div className="panel-header">
          <h3>檢驗紀錄列表</h3>
          <div className="filter-row">
            <span className="chip neutral">病患 ID</span>
            <span className="chip neutral">日期</span>
            <span className="chip neutral">狀態</span>
          </div>
        </div>

        <div className="record-list">
          {historyRecords.map((record) => (
            <div className="record-row" key={record.id}>
              <div>
                <strong>{record.id}</strong>
                <small>{record.date}</small>
              </div>
              <span className={`status-pill ${record.status === '正常' ? 'success' : record.status === '異常' ? 'danger' : 'warning'}`}>
                {record.status}
              </span>
              <strong>{record.score}</strong>
              <button type="button" className="secondary-btn small">
                查看報告
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
