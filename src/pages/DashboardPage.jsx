import { dashboardStats, workQueue, recentResults } from '../services/mockData.js'
import { MetricCard } from '../components/common/MetricCard.jsx'

export function DashboardPage() {
  return (
    <div className="page-shell dashboard-page">
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">檢驗工作台</p>
          <h2>精蟲檢驗系統</h2>
        </div>
        <button type="button" className="primary-btn">
          ＋ 新增檢驗
        </button>
      </header>

      <section className="stats-grid dashboard-grid">
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

      <section className="dashboard-block">
        <div className="panel-header">
          <h3>待處理檢體</h3>
          <span className="chip neutral">今日工作</span>
        </div>

        <div className="queue-table">
          <div className="queue-row queue-head">
            <span>檢體編號</span>
            <span>收件時間</span>
            <span>狀態</span>
            <span>操作</span>
          </div>

          {workQueue.map((item) => (
            <div className="queue-row" key={item.id}>
              <span>{item.id}</span>
              <span>{item.time}</span>
              <span className={`status-pill ${item.status === '待分析' ? 'warning' : item.status === 'AI分析中' ? 'neutral-badge' : 'success'}`}>
                {item.status}
              </span>
              <button type="button" className="secondary-btn small">
                {item.action}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-block">
        <div className="panel-header">
          <h3>最近檢驗</h3>
          <span className="chip neutral">本週</span>
        </div>

        <div className="recent-table">
          <div className="recent-row recent-head">
            <span>檢體編號</span>
            <span>濃度</span>
            <span>活動力</span>
            <span>形態</span>
            <span>判讀</span>
            <span>操作</span>
          </div>

          {recentResults.map((item) => (
            <div className="recent-row" key={item.id}>
              <span>{item.id}</span>
              <span>{item.density}</span>
              <span>{item.motility}</span>
              <span>{item.morphology}</span>
              <span className={`status-pill ${item.result === '正常' ? 'success' : 'warning'}`}>{item.result}</span>
              <button type="button" className="secondary-btn small">
                查看
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
