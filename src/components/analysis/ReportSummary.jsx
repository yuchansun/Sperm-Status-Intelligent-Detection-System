export function ReportSummary() {
  return (
    <div className="report-card">
      <div className="panel-header">
        <h3>診斷結論</h3>
        <span className="chip warning">需追蹤</span>
      </div>

      <div className="report-body">
        <p>
          綜合判讀結果：精子密度屬於邊緣範圍，活動力與型態比例顯示中度下降，建議重複檢測或搭配生活習慣調整。
        </p>
        <ul>
          <li>WHO 密度門檻：≥ 15 million/mL</li>
          <li>型態正常率：建議 &gt; 4%</li>
          <li>活動力：建議持續追蹤 6-8 週</li>
        </ul>
      </div>

      <div className="action-group">
        <button type="button" className="primary-btn small">
          下載 PDF
        </button>
        <button type="button" className="secondary-btn small">
          同步醫療系統
        </button>
      </div>
    </div>
  )
}
