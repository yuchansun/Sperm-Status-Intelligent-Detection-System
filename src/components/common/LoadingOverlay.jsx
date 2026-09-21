import { useLanguage } from '../../context/language.js'

export function LoadingOverlay({ isOpen }) {
  const { t } = useLanguage()
  if (!isOpen) return null

  return (
    <div className="loading-overlay" role="dialog" aria-live="polite">
      <div className="loading-card">
        <div className="loader-ring" aria-hidden="true" />
        <h3>{t.loadingTitle}</h3>
        <p>{t.loadingDescription}</p>
        <div className="progress-bar">
          <span className="progress-bar-fill" />
        </div>
      </div>
    </div>
  )
}
