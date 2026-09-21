import { dashboardStats, workQueue, recentResults } from '../services/mockData.js'
import { MetricCard } from '../components/common/MetricCard.jsx'
import { useLanguage } from '../context/language.js'

export function DashboardPage() {
  const { t } = useLanguage()
  const statLabels = [
    [t.pendingSamples, t.todayPending, t.pending],
    [t.analyzing, t.cloudAnalyzing, t.analyzing],
    [t.reviewResult, t.manualReview, t.attention],
    [t.completed, t.todayClosed, t.normal],
  ]

  return (
    <div className="page-shell dashboard-page">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">{t.dashboardEyebrow}</p>
          <h2>{t.dashboardTitle}</h2>
        </div>
        <button type="button" className="primary-btn">
          ＋ {t.newAnalysis}
        </button>
      </header>

      <section className="stats-grid dashboard-grid">
        {dashboardStats.map((stat, index) => (
          <MetricCard
            key={stat.label}
            label={statLabels[index][0]}
            value={stat.value}
            detail={statLabels[index][1]}
            status={statLabels[index][2]}
            tone={stat.tone}
          />
        ))}
      </section>

      <section className="dashboard-block">
        <div className="panel-header">
          <h3>{t.pendingSamples}</h3>
          <span className="chip neutral">{t.todayWork}</span>
        </div>

        <div className="queue-table">
          <div className="queue-row queue-head">
            <span>{t.sampleId}</span>
            <span>{t.receivedAt}</span>
            <span>{t.status}</span>
            <span>{t.action}</span>
          </div>

          {workQueue.map((item) => (
            <div className="queue-row" key={item.id}>
              <span>{item.id}</span>
              <span>{item.time}</span>
              <span className={`status-pill ${item.status === '待分析' ? 'warning' : item.status === 'AI分析中' ? 'neutral-badge' : 'success'}`}>
                {item.status === '待分析' ? t.pendingSamples : item.status === 'AI分析中' ? t.analyzing : t.reviewResult}
              </span>
              <button type="button" className="secondary-btn small">
                {item.action === '開始分析' ? t.startAnalysis : item.action === '複核結果' ? t.reviewResult : t.view}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-block">
        <div className="panel-header">
          <h3>{t.recentTests}</h3>
          <span className="chip neutral">{t.thisWeek}</span>
        </div>

        <div className="recent-table">
          <div className="recent-row recent-head">
            <span>{t.sampleId}</span>
            <span>{t.concentration}</span>
            <span>{t.motility}</span>
            <span>{t.morphology}</span>
            <span>{t.interpretation}</span>
            <span>{t.action}</span>
          </div>

          {recentResults.map((item) => (
            <div className="recent-row" key={item.id}>
              <span>{item.id}</span>
              <span>{item.density}</span>
              <span>{item.motility}</span>
              <span>{item.morphology}</span>
              <span className={`status-pill ${item.result === '正常' ? 'success' : 'warning'}`}>{item.result === '正常' ? t.normal : t.followUp}</span>
              <button type="button" className="secondary-btn small">
                {t.view}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
