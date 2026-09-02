import { dashboardStats } from '../services/mockData.js'
import { MetricCard } from '../components/common/MetricCard.jsx'

export function DashboardPage() {
  return (
    <div className="page-shell">
      <section className="hero-banner">
        <div>
          <p className="eyebrow">AI-assisted reproductive health</p>
          <h2>台灣低生育風險：加速精蟲檢驗與診療決策</h2>
        </div>
        <button type="button" className="primary-btn">
          開始新檢驗
        </button>
      </section>

      <section className="stats-grid">
        {dashboardStats.map((stat) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            detail={stat.detail}
            status={stat.status}
            tone={stat.tone}
          />
        ))}
      </section>

      <section className="story-grid">
        <div className="story-card">
          <h3>醫管背景指標</h3>
          <p>台灣生育率 0.69，生殖醫學門診需求持續成長。平台目標是縮短檢驗負擔並提高判讀一致性。</p>
        </div>
        <div className="story-card emphasis">
          <h3>系統效益</h3>
          <p>預估可減少醫檢師顯微鏡鏡檢疲勞 60%，並提升檢驗報告生成效率。</p>
        </div>
      </section>
    </div>
  )
}
