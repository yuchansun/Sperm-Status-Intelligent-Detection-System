import type { RecentAnalysisRecord } from '../../types/analysis'
import { useLanguage } from '../../app/LanguageContext'
import {
  analysisStatusLabelByLanguage,
  recentAnalysisTableContentByLanguage,
} from '../../data/content/ui.content'
import StatusBadge from './StatusBadge'

type RecentAnalysisTableProps = {
  records: RecentAnalysisRecord[]
}

function getStatusTone(status: RecentAnalysisRecord['status']) {
  if (status === 'Normal') return 'success'
  if (status === 'Pending') return 'warning'
  return 'danger'
}

function RecentAnalysisTable({ records }: RecentAnalysisTableProps) {
  const { language } = useLanguage()
  const content = recentAnalysisTableContentByLanguage[language]
  const statusLabels = analysisStatusLabelByLanguage[language]

  return (
    <>
      <div className="responsive-table">
        <table>
          <thead>
            <tr>
              <th>{content.analysisId}</th>
              <th>{content.dateTime}</th>
              <th>{content.totalSperm}</th>
              <th>{content.status}</th>
              <th>{content.confidence}</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.id}</td>
                <td>{record.dateTime}</td>
                <td>{record.totalSperm}</td>
                <td>
                  <StatusBadge label={statusLabels[record.status]} tone={getStatusTone(record.status)} />
                </td>
                <td>{record.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="responsive-list">
        {records.map((record) => (
          <article key={record.id} className="analysis-list-card">
            <div className="analysis-list-card__head">
              <div>
                <p className="analysis-list-card__label">{record.id}</p>
                <p className="analysis-list-card__meta">{record.dateTime}</p>
              </div>
              <StatusBadge label={statusLabels[record.status]} tone={getStatusTone(record.status)} />
            </div>

            <div className="analysis-list-card__grid">
              <div>
                <span>{content.totalSperm}</span>
                <strong>{record.totalSperm}</strong>
              </div>
              <div>
                <span>{content.confidence}</span>
                <strong>{record.confidence}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

export default RecentAnalysisTable