import { useState } from 'react'
import { ImageUploader } from '../components/analysis/ImageUploader.jsx'
import { BoundingBoxView } from '../components/analysis/BoundingBoxView.jsx'
import { ReportSummary } from '../components/analysis/ReportSummary.jsx'
import { LoadingOverlay } from '../components/common/LoadingOverlay.jsx'
import { analyzeSpermImage } from '../services/api.js'
import { mockResult } from '../services/mockData.js'

export function AnalysisPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(mockResult)

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
          <p className="eyebrow">分析結果</p>
          <h2>檢體編號 #A001</h2>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-btn">重新分析</button>
          <button type="button" className="primary-btn">下載報告</button>
        </div>
      </header>

      <section className="summary-banner">
        <span className="status-pill danger">需追蹤</span>
        <div>
          <h3>AI 檢驗結果摘要</h3>
          <p>
            AI 分析顯示精子濃度接近參考下限，建議由專業人員進一步確認，並視臨床需求安排後續檢測。
          </p>
        </div>
      </section>

      <section className="result-overview">
        <div className="result-card highlight">
          <span className="metric-label">精子濃度</span>
          <div className="value-line">
            <strong>14.8</strong>
            <span>M/mL</span>
          </div>
          <div className="gauge">
            <span className="gauge-fill" style={{ width: '80%' }} />
          </div>
          <small>WHO 門檻 15</small>
          <p>接近參考下限</p>
        </div>

        <div className="result-card">
          <span className="metric-label">正常形態</span>
          <div className="value-line">
            <strong>6.4</strong>
            <span>%</span>
          </div>
          <div className="trend-positive">✓ {'>'} WHO 4%</div>
          <p>形態表現尚可</p>
        </div>

        <div className="result-card">
          <span className="metric-label">活動力</span>
          <div className="value-line">
            <strong>62</strong>
            <span>%</span>
          </div>
          <div className="trend-positive">● 穩定</div>
          <p>目前表現穩定</p>
        </div>
      </section>

      <section className="analysis-content">
        <div className="analysis-panel image-panel">
          <div className="panel-header">
            <h3>AI 影像分析</h3>
            <div className="toggle-group">
              <span className="chip success">原圖</span>
              <span className="chip neutral">標註</span>
              <span className="chip neutral">精子</span>
            </div>
          </div>

          <BoundingBoxView result={result} />

          <div className="evidence-row">
            <div>
              <span>辨識成功</span>
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
              <h3>檢驗資訊</h3>
            </div>
            <ul className="info-list">
              <li><span>病患代號</span><strong>A001</strong></li>
              <li><span>採集時間</span><strong>2026/09/02 14:30</strong></li>
              <li><span>禁慾天數</span><strong>3 天</strong></li>
            </ul>
          </div>

          <div className="info-block">
            <div className="panel-header">
              <h3>AI 判讀摘要</h3>
            </div>
            <p>
              精子濃度接近 WHO 參考下限，正常形態與活動力仍維持可接受範圍；若臨床症狀持續，建議複檢或安排進一步評估。
            </p>
          </div>

          <div className="action-block">
            <button type="button" className="primary-btn" onClick={handleAnalyze}>重新分析</button>
            <button type="button" className="secondary-btn">下載 PDF</button>
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
