import { useState } from 'react'
import { ImageUploader } from '../components/analysis/ImageUploader.jsx'
import { BoundingBoxView } from '../components/analysis/BoundingBoxView.jsx'
import { ReportSummary } from '../components/analysis/ReportSummary.jsx'
import { MetricCard } from '../components/common/MetricCard.jsx'
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
    <div className="page-shell">
      <LoadingOverlay isOpen={isLoading} />

      <section className="analysis-layout">
        <div className="left-column">
          <ImageUploader />
          <button type="button" className="primary-btn analyze-btn" onClick={handleAnalyze}>
            送出分析
          </button>
        </div>

        <div className="right-column">
          <BoundingBoxView result={result} />
          <div className="metric-grid">
            <MetricCard
              label="總數量與密度"
              value="14.8M/mL"
              detail="WHO 門檻：≥ 15M/mL"
              status="待追蹤"
              tone="blue"
            />
            <MetricCard
              label="形態與頭身比例"
              value="6.4%"
              detail="正常外觀比例"
              status="改善"
              tone="green"
            />
            <MetricCard
              label="活動力預估"
              value="62%"
              detail="前進與活躍比例"
              status="穩定"
              tone="purple"
            />
          </div>
          <ReportSummary />
        </div>
      </section>
    </div>
  )
}
