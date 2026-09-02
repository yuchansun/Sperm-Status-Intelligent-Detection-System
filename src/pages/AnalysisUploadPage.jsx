import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingOverlay } from '../components/common/LoadingOverlay.jsx'

const templateOptions = [
  '範例檢體 A - 高濃度正常',
  '範例檢體 B - 型態異常案例',
  '範例檢體 C - 低濃度待追蹤',
]

export function AnalysisUploadPage() {
  const [selectedTemplate, setSelectedTemplate] = useState(templateOptions[0])
  const [includeMotility, setIncludeMotility] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleStartAnalysis = () => {
    setIsLoading(true)
    window.setTimeout(() => {
      navigate('/analysis/result')
    }, 1500)
  }

  return (
    <div className="page-shell upload-page">
      <LoadingOverlay isOpen={isLoading} />

      <header className="page-header">
        <div>
          <p className="eyebrow">檢驗設定</p>
          <h2>新檢驗</h2>
        </div>
      </header>

      <section className="upload-card">
        <div className="form-section">
          <h3>檢體基本資訊</h3>

          <div className="field-row">
            <label>
              <span>病患 / 檢體編號</span>
              <input type="text" defaultValue="SMP-2026-001" />
            </label>
          </div>

          <div className="check-list">
            <label className="check-item">
              <input type="checkbox" checked readOnly />
              <span>精蟲數量與濃度 (YOLO 計數)</span>
              <strong>必選</strong>
            </label>

            <label className="check-item">
              <input type="checkbox" checked readOnly />
              <span>型態與頭身比評估</span>
              <strong>必選</strong>
            </label>

            <label className="toggle-item">
              <span>游動活動力預估 (Motility)</span>
              <button
                type="button"
                className={includeMotility ? 'switch switch-on' : 'switch'}
                onClick={() => setIncludeMotility((prev) => !prev)}
                aria-label="Toggle motility analysis"
              >
                <span className="switch-thumb" />
              </button>
            </label>
          </div>
        </div>
      </section>

      <section className="upload-card">
        <div className="form-section">
          <h3>影像來源</h3>

          <div className="source-grid">
            <div className="source-option highlight">
              <h4>選項 A：從雲端範本選擇</h4>
              <select
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value)}
              >
                {templateOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <div className="template-preview">
                <div className="template-thumb template-a" />
                <div className="template-thumb template-b" />
                <div className="template-thumb template-c" />
              </div>
            </div>

            <div className="source-option">
              <h4>選項 B：手機拍照 / 相簿上傳</h4>
              <div className="upload-box">
                <span>開啟相機或從相簿選擇影像</span>
                <button type="button" className="secondary-btn small">
                  選擇影像
                </button>
              </div>
            </div>

            <div className="source-option muted">
              <h4>選項 C：短影片抽取</h4>
              <div className="upload-box">
                <span>影片抽幀分析模式（預留介面）</span>
                <button type="button" className="secondary-btn small">
                  上傳 1 秒短片
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        className="primary-btn full-width"
        onClick={handleStartAnalysis}
      >
        🚀 開始 AI 雲端分析
      </button>
    </div>
  )
}
