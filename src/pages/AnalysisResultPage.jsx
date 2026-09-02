import { useState } from 'react'
import { BoundingBoxView } from '../components/analysis/BoundingBoxView.jsx'
import { mockResult } from '../services/mockData.js'
import image from '../assets/image.png'

export function AnalysisResultPage() {
  const [viewMode, setViewMode] = useState('original')
  const result = mockResult

  return (
    <div className="page-shell result-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">AI 分析結果</p>
          <h2>檢體編號 #A001</h2>
        </div>
        <div className="header-actions">
          <button type="button" className="secondary-btn">重新檢測</button>
          <button type="button" className="primary-btn">下載 PDF</button>
        </div>
      </header>

      <section className="summary-banner result-summary">
        <span className="status-pill danger">需追蹤</span>
        <div>
          <h3>AI 判讀結果</h3>
          <p>
            本次分析顯示精子濃度偏低，建議由專業人員確認並安排後續追蹤檢測。
          </p>
        </div>
      </section>

      <section className="result-overview">
        <div className="result-card highlight">
          <span className="metric-label">精蟲數量</span>
          <div className="value-line">
            <strong>48</strong>
            <span>Million/mL</span>
          </div>
          <div className="status-inline success">綠色：達標 WHO 標準</div>
        </div>

        <div className="result-card">
          <span className="metric-label">型態與頭身比</span>
          <div className="value-line">
            <strong>4%</strong>
            <span>正常型態</span>
          </div>
          <div className="status-inline warning">偏低，建議追蹤</div>
        </div>

        <div className="result-card">
          <span className="metric-label">活動力預估</span>
          <div className="value-line">
            <strong>32%</strong>
            <span>前進性</span>
          </div>
          <div className="status-inline neutral">活動力中等</div>
        </div>
      </section>

      <section className="analysis-content">
        <div className="analysis-panel image-panel">
          <div className="panel-header">
            <h3>影像與 YOLO 標註</h3>
            <div className="toggle-group">
              <button
                type="button"
                className={viewMode === 'original' ? 'chip success' : 'chip neutral'}
                onClick={() => setViewMode('original')}
              >
                原始顯微影像
              </button>
              <button
                type="button"
                className={viewMode === 'yolo' ? 'chip success' : 'chip neutral'}
                onClick={() => setViewMode('yolo')}
              >
                AI YOLO 標註視圖
              </button>
            </div>
          </div>

          <div className="visual-box">
            <img src={image} alt="Microscope image analysis" />
          </div>

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
              <h3>檢驗摘要</h3>
            </div>
            <ul className="summary-list">
              <li><span>精子濃度</span><strong>48 M/mL</strong></li>
              <li><span>正常型態</span><strong>4%</strong></li>
              <li><span>活動力</span><strong>32%</strong></li>
            </ul>
          </div>

          <div className="info-block">
            <div className="panel-header">
              <h3>醫管效益</h3>
            </div>
            <p>本分析耗時 1.2 秒，已為醫檢師省下人工計數時間與判讀重複性差異。</p>
          </div>

          <div className="info-block">
            <div className="panel-header">
              <h3>檢驗資訊</h3>
            </div>
            <ul className="summary-list compact-list">
              <li><span>病患代號</span><strong>SMP-2026-001</strong></li>
              <li><span>檢驗項目</span><strong>數量 + 型態</strong></li>
              <li><span>採集時間</span><strong>2026/09/02 14:30</strong></li>
            </ul>
          </div>

          <div className="action-block">
            <button type="button" className="primary-btn">重新檢測</button>
            <button type="button" className="secondary-btn">儲存至病患歷程</button>
          </div>
        </div>
      </section>
    </div>
  )
}
