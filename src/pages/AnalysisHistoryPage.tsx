import { useLanguage } from '../app/LanguageContext'
import RecentAnalysisTable from '../components/ui/RecentAnalysisTable'
import { historyContentByLanguage } from '../data/content/ui.content'
import { historyRecords } from '../data/mock/history.mock'

function AnalysisHistoryPage() {
  const { language } = useLanguage()
  const content = historyContentByLanguage[language]

  return (
    <div className="page-stack">
      <section className="panel-card">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">{content.eyebrow}</p>
            <h2>{content.title}</h2>
          </div>
          <p className="section-heading__subtitle">{content.subtitle}</p>
        </div>

        <RecentAnalysisTable records={historyRecords} />
      </section>
    </div>
  )
}

export default AnalysisHistoryPage