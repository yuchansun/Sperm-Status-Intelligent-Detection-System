import { patientTrend } from '../services/mockData.js'

export function PatientDetailPage() {
  const max = Math.max(...patientTrend.values)

  return (
    <div className="page-shell">
      <section className="detail-layout">
        <div className="line-chart-card">
          <div className="panel-header">
            <h3>精子數量變化曲線</h3>
            <span className="chip success">改善趨勢</span>
          </div>
          <div className="line-chart" aria-label="Sperm count trend chart">
            {patientTrend.labels.map((label, index) => (
              <div key={label} className="chart-column">
                <span
                  className="chart-bar"
                  style={{ height: `${(patientTrend.values[index] / max) * 100}%` }}
                />
                <small>{label}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="notes-card">
          <div className="panel-header">
            <h3>臨床備忘</h3>
            <span className="chip neutral">醫檢師紀錄</span>
          </div>
          <ul>
            <li>建議持續規律作息與避免高熱環境</li>
            <li>近期結果顯示型態比例略有改善</li>
            <li>需在 6 週後複檢活動力與密度</li>
          </ul>
        </div>
      </section>
    </div>
  )
}
