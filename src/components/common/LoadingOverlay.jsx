import { translateText as tr } from '../../i18n/translate.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useLanguage } from '../../context/language.js'

export function LoadingOverlay({ isOpen, title, description, status, progress, elapsedSeconds, onCancel }) {
  const { t } = useLanguage()
  if (!isOpen) return null
  const percent = Number.isFinite(progress?.percent) ? Math.max(0, Math.min(100, progress.percent)) : null
  return (
    <div className="loading-overlay" role="dialog" aria-modal="true" aria-label={tr(title || t.loadingTitle)}>
      <div className="loading-card">
        <div className="loader-ring" aria-hidden="true" />
        <h3>{tr(title || t.loadingTitle)}</h3>
        {status && <p className="upload-stage" role="status">{tr(status)}</p>}
        {description !== null && <p>{tr(description || t.loadingDescription)}</p>}
        {percent !== null && <>
          <div className="progress-bar" role="progressbar" aria-label={tr("檔案傳送進度")} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
            <span className="progress-bar-fill" style={{ width: `${percent}%`, animation: 'none' }} />
          </div>
          <p>{percent}% · {(progress.loaded / 1_000_000).toFixed(1)} / {(progress.total / 1_000_000).toFixed(1)}{' '}{tr("MB 已傳送")}</p>
          {percent === 100 && <p>{tr("傳送完畢，等待伺服器確認；尚未宣告儲存完成。")}</p>}
        </>}
        {Number.isFinite(elapsedSeconds) && <p>{tr("已等待")}{elapsedSeconds}{tr("秒")}</p>}
        {onCancel && <button type="button" className="secondary-btn small" onClick={onCancel}>{tr("取消，保留資料以便重試")}</button>}
      </div>
    </div>
  )
}
