export function LoadingOverlay({ isOpen }) {
  if (!isOpen) return null

  return (
    <div className="loading-overlay" role="dialog" aria-live="polite">
      <div className="loading-card">
        <div className="loader-ring" aria-hidden="true" />
        <h3>AI 雲端分析中</h3>
        <p>影像上傳中 • YOLO 辨識中 • 形態評估中</p>
        <div className="progress-bar">
          <span className="progress-bar-fill" />
        </div>
      </div>
    </div>
  )
}
