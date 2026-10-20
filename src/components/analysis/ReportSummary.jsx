import { translateText as tr } from '../../i18n/translate.js'
export function ReportSummary() {
  return (
    <div className="report-card">
      <div className="panel-header">
        <h3>{tr("檢驗結果摘要")}</h3>
        <span className="chip warning">{tr("需追蹤")}</span>
      </div>

      <div className="report-body">
        <p>{tr("AI 分析結果顯示精子密度接近參考下限，建議由專業人員進一步確認，並以臨床症狀與後續追蹤結果綜合判定。")}</p>
        <ul>
          <li>{tr("精子濃度：14.8 million/mL，接近 WHO 參考下限")}</li>
          <li>{tr("正常形態：6.4%，符合目前參考值")}</li>
          <li>{tr("活動力：62%，目前表現穩定")}</li>
        </ul>
      </div>

      <div className="action-group">
        <button type="button" className="primary-btn small">{tr("下載 PDF")}</button>
        <button type="button" className="secondary-btn small">{tr("同步醫療系統")}</button>
      </div>
    </div>
  )
}
