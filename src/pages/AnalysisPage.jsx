import { useState } from 'react'
import { ImageUploader } from '../components/analysis/ImageUploader.jsx'
import { BoundingBoxView } from '../components/analysis/BoundingBoxView.jsx'
import { ReportSummary } from '../components/analysis/ReportSummary.jsx'
import { LoadingOverlay } from '../components/common/LoadingOverlay.jsx'
import { analyzeSpermImage } from '../services/api.js'
import { mockResult } from '../services/mockData.js'
import { useLanguage } from '../context/language.js'

export function AnalysisPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(mockResult)
  const { t } = useLanguage()

  const handleAnalyze = async () => {
    setIsLoading(true)
    try {
      const data = await analyzeSpermImage({ name: 'demo-sample.jpg' })
      setResult(data)
    } finally {
      setTimeout(() => {
        setIsLoading(false)
      }, 1200)
    }
  }

  return (
    <div className="page-shell analysis-page">
      <LoadingOverlay isOpen={isLoading} />

      <header className="page-header analysis-header">
        <div>
          <p className="eyebrow">{t.analysisResult}</p>
          <h2>檢體編號 #A001</h2>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-btn">{t.reanalyze}</button>
          <button type="button" className="primary-btn">{t.downloadReport}</button>
        </div>
      </header>

      <section className="summary-banner">
        <span className="status-pill danger">{t.followUp}</span>
        <div>
          <h3>{t.aiResult}</h3>
          <p>{t.resultSummary}</p>
        </div>
      </section>

      <section className="result-overview">
        <div className="result-card highlight">
          <span className="metric-label">{t.concentration}</span>
          <div className="value-line">
            <strong>14.8</strong>
            <span>M/mL</span>
          </div>
          <div className="gauge">
            <span className="gauge-fill" style={{ width: '80%' }} />
          </div>
          <small>WHO 15</small>
          <p>{t.lowFollowUp}</p>
        </div>

        <div className="result-card">
          <span className="metric-label">{t.normalMorphology}</span>
          <div className="value-line">
            <strong>6.4</strong>
            <span>%</span>
          </div>
          <div className="trend-positive">✓ {'>'} WHO 4%</div>
          <p>{t.normalMorphology}</p>
        </div>

        <div className="result-card">
          <span className="metric-label">{t.motility}</span>
          <div className="value-line">
            <strong>62</strong>
            <span>%</span>
          </div>
          <div className="trend-positive">● 穩定</div>
          <p>{t.moderateMotility}</p>
        </div>
      </section>

      <section className="analysis-content">
        <div className="analysis-panel image-panel">
          <div className="panel-header">
            <h3>{t.imageYolo}</h3>
            <div className="toggle-group">
              <span className="chip success">{t.originalImage}</span>
              <span className="chip neutral">{t.yoloView}</span>
              <span className="chip neutral">{t.spermCountLabel}</span>
            </div>
          </div>

          <BoundingBoxView result={result} />

          <div className="evidence-row">
            <div>
                <span>{t.detected}</span>
              <strong>{result.summary.detected}</strong>
            </div>
            <div>
              <span>Precision</span>
              <strong>{result.summary.precision}</strong>
            </div>
            <div>
              <span>Confidence</span>
              <strong>{result.summary.confidence}</strong>
            </div>
          </div>
        </div>

        <div className="analysis-panel info-panel">
          <div className="info-block">
            <div className="panel-header">
              <h3>{t.testInfo}</h3>
            </div>
            <ul className="info-list">
              <li><span>{t.patientCode}</span><strong>A001</strong></li>
              <li><span>{t.collectionTime}</span><strong>2026/09/02 14:30</strong></li>
              <li><span>{t.processingTime}</span><strong>3 days</strong></li>
            </ul>
          </div>

          <div className="info-block">
            <div className="panel-header">
              <h3>{t.aiInterpretation}</h3>
            </div>
            <p>
              {t.resultSummary}
            </p>
          </div>

          <div className="action-block">
            <button type="button" className="primary-btn" onClick={handleAnalyze}>{t.reanalyze}</button>
            <button type="button" className="secondary-btn">{t.downloadPdf}</button>
          </div>
        </div>
      </section>

      <ReportSummary />

      <div className="analysis-uploader">
        <ImageUploader />
      </div>
    </div>
  )
}
