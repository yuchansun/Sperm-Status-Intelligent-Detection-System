import { useLanguage } from '../app/LanguageContext'
import { overviewMetrics, recentAnalyses, systemStatuses } from '../data/mock/dashboard.mock'
import { analysisStatusLabelByLanguage, dashboardContentByLanguage } from '../data/content/ui.content'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'
import RecentAnalysisTable from '../components/ui/RecentAnalysisTable'

function DashboardPage() {
  const { language } = useLanguage()
  const content = dashboardContentByLanguage[language]
  const statusLabels = analysisStatusLabelByLanguage[language]

  return (
    <div className="page-stack">
      <section>
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">{content.overviewEyebrow}</p>
            <h2>{content.overviewTitle}</h2>
          </div>
          <p className="section-heading__subtitle">{content.overviewSubtitle}</p>
        </div>

        <div className="overview-grid">
          {overviewMetrics.map((metric) => (
            <StatCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="section-heading section-heading--compact">
          <div>
            <p className="section-heading__eyebrow">{content.recentEyebrow}</p>
            <h2>{content.recentTitle}</h2>
          </div>
          <p className="section-heading__subtitle">{content.recentSubtitle}</p>
        </div>

        <RecentAnalysisTable records={recentAnalyses} />
      </section>

      <section className="panel-card">
        <div className="section-heading section-heading--compact">
          <div>
            <p className="section-heading__eyebrow">{content.statusEyebrow}</p>
            <h2>{content.statusTitle}</h2>
          </div>
        </div>

        <div className="status-grid">
          {systemStatuses.map((item) => (
            <article key={item.label} className="status-card">
              <div className="status-card__head">
                <div>
                  <p className="status-card__label">{item.label}</p>
                  <h3>{item.value}</h3>
                </div>
                <StatusBadge label={statusLabels[item.tone]} tone={item.tone} />
              </div>
              <p className="status-card__detail">{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default DashboardPage