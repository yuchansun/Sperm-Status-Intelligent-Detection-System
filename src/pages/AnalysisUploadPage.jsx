import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoadingOverlay } from '../components/common/LoadingOverlay.jsx'
import { useLanguage } from '../context/language.js'

const templateOptions = [
  '範例檢體 A - 高濃度正常',
  '範例檢體 B - 型態異常案例',
  '範例檢體 C - 低濃度待追蹤',
]

export function AnalysisUploadPage() {
  const { t } = useLanguage()
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
          <p className="eyebrow">{t.uploadSettings}</p>
          <h2>{t.newTest}</h2>
        </div>
      </header>

      <section className="upload-card">
        <div className="form-section">
          <h3>{t.basicInfo}</h3>

          <div className="field-row">
            <label>
              <span>{t.patientSampleId}</span>
              <input type="text" defaultValue="SMP-2026-001" />
            </label>
          </div>

          <div className="check-list">
            <label className="check-item">
              <input type="checkbox" checked readOnly />
              <span>{t.spermCount}</span>
              <strong>{t.required}</strong>
            </label>

            <label className="check-item">
              <input type="checkbox" checked readOnly />
              <span>{t.morphologyAssessment}</span>
              <strong>{t.required}</strong>
            </label>

            <label className="toggle-item">
              <span>{t.motilityEstimate}</span>
              <button
                type="button"
                className={includeMotility ? 'switch switch-on' : 'switch'}
                onClick={() => setIncludeMotility((prev) => !prev)}
                aria-label={t.toggleMotility}
              >
                <span className="switch-thumb" />
              </button>
            </label>
          </div>
        </div>
      </section>

      <section className="upload-card">
        <div className="form-section">
          <h3>{t.imageSource}</h3>

          <div className="source-grid">
            <div className="source-option highlight">
              <h4>{t.cloudTemplate}</h4>
              <select
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value)}
              >
                {templateOptions.map((option, index) => (
                  <option key={option} value={option}>
                    {t[`template${String.fromCharCode(65 + index)}`]}
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
              <h4>{t.cameraUpload}</h4>
              <div className="upload-box">
                <span>{t.openCamera}</span>
                <button type="button" className="secondary-btn small">
                  {t.chooseImage}
                </button>
              </div>
            </div>

            <div className="source-option muted">
              <h4>{t.videoExtract}</h4>
              <div className="upload-box">
                <span>{t.videoMode}</span>
                <button type="button" className="secondary-btn small">
                  {t.uploadVideo}
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
        🚀 {t.startCloudAnalysis}
      </button>
    </div>
  )
}
