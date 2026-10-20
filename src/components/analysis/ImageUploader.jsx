import { translateText as tr } from '../../i18n/translate.js'
export function ImageUploader() {
  return (
    <div className="uploader-panel">
      <div className="panel-header">
        <h3>{tr("檢體影像來源")}</h3>
        <span className="chip neutral">Ready</span>
      </div>

      <div className="upload-grid">
        <button type="button" className="upload-btn primary">{tr("拍照拍攝")}</button>
        <button type="button" className="upload-btn secondary">{tr("本地相簿")}</button>
        <button type="button" className="upload-btn ghost">{tr("雲端範例影像")}</button>
      </div>

      <div className="meta-card">
        <label>
          <span>{tr("病患代號")}</span>
          <input defaultValue="P-2026-0801" />
        </label>
        <label>
          <span>{tr("檢體採集時間")}</span>
          <input defaultValue="2026-08-01 08:30" />
        </label>
        <label>
          <span>{tr("禁慾天數")}</span>
          <input defaultValue={tr("3 天")} />
        </label>
      </div>
    </div>
  )
}
