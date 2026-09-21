import { useState } from 'react'
import { mockResult } from '../services/mockData.js'
import image from '../assets/image.png'
import { useLanguage } from '../context/language.js'

export function AnalysisResultPage() {
  const [viewMode, setViewMode] = useState('original')
  const result = mockResult
  const { t } = useLanguage()

  return (
    <div className="page-shell result-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t.analysisResult}</p>
          <h2>檢體編號 #A001</h2>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-btn">{t.retest}</button>
          <button type="button" className="primary-btn">{t.downloadPdf}</button>
        </div>
      </header>

      <section className="summary-banner result-summary">
        <span className="status-pill danger">{t.followUp}</span>
        <div>
          <h3>{t.aiResult}</h3>
          <p>{t.resultSummary}</p>
        </div>
      </section>

      <section className="result-overview">
        <div className="result-card highlight">
          <span className="metric-label">{t.spermCountLabel}</span>
          <div className="value-line">
            <strong>48</strong>
            <span>Million/mL</span>
          </div>
          <div className="status-inline success">{t.whoPass}</div>
        </div>

        <div className="result-card">
          <span className="metric-label">{t.headBodyRatio}</span>
          <div className="value-line">
            <strong>4%</strong>
            <span>{t.normalMorphology}</span>
          </div>
          <div className="status-inline warning">{t.lowFollowUp}</div>
        </div>

        <div className="result-card">
          <span className="metric-label">{t.motilityEstimateLabel}</span>
          <div className="value-line">
            <strong>32%</strong>
            <span>{t.progressive}</span>
          </div>
          <div className="status-inline neutral">{t.moderateMotility}</div>
        </div>
      </section>

      <section className="analysis-content">
        <div className="analysis-panel image-panel">
          <div className="panel-header">
            <h3>{t.imageYolo}</h3>
            <div className="toggle-group">
              <button
                type="button"
                className={viewMode === 'original' ? 'chip success' : 'chip neutral'}
                onClick={() => setViewMode('original')}
              >
                {t.originalImage}
              </button>
              <button
                type="button"
                className={viewMode === 'yolo' ? 'chip success' : 'chip neutral'}
                onClick={() => setViewMode('yolo')}
              >
                {t.yoloView}
              </button>
            </div>
          </div>

          <div className="visual-box">
            <img src={image} alt={t.imageYolo} />
          </div>

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
              <h3>{t.testSummary}</h3>
            </div>
            <ul className="summary-list">
              <li><span>{t.concentration}</span><strong>48 M/mL</strong></li>
              <li><span>{t.normalMorphology}</span><strong>4%</strong></li>
              <li><span>{t.motility}</span><strong>32%</strong></li>
            </ul>
          </div>

          <div className="info-block">
            <div className="panel-header">
              <h3>{t.medicalBenefit}</h3>
            </div>
            <p>{t.benefitText}</p>
          </div>

          <div className="info-block">
            <div className="panel-header">
              <h3>{t.testInfo}</h3>
            </div>
            <ul className="summary-list compact-list">
              <li><span>{t.patientCode}</span><strong>SMP-2026-001</strong></li>
              <li><span>{t.testItems}</span><strong>{t.spermCountLabel} + {t.morphology}</strong></li>
              <li><span>{t.collectionTime}</span><strong>2026/09/02 14:30</strong></li>
            </ul>
          </div>

          <div className="action-block">
            <button type="button" className="primary-btn">{t.retest}</button>
            <button type="button" className="secondary-btn">{t.saveToHistory}</button>
          </div>
        </div>
      </section>
    </div>
  )
}
