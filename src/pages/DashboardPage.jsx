import { translateText as tr } from '../i18n/translate.js'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCloudHistory } from '../hooks/useCloudHistory.js'
import { localDate } from '../services/cloudApi.js'
import { MetricCard } from '../components/common/MetricCard.jsx'
import { useLanguage } from '../context/language.js'

export function DashboardPage() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { records: historyRecords, loading, error, reload } = useCloudHistory()
  const today = localDate()
  const queue = historyRecords.filter(r => r.processingState !== '已完成').map(r => ({ id: r.sampleId, recordId: r.id, time: r.date, status: r.processingState, action: tr("複核結果") }))
  const recentResults = historyRecords.slice(0, 5).map(r => ({ ...r, recordId: r.id, result: r.status }))
  const dashboardStats = [{ label: tr("待檢驗"), value: String(historyRecords.filter(r => r.processingState === '待分析').length), tone: 'blue' }, { label: tr("待複核"), tone: 'warning' }, { label: tr("已完成"), tone: 'green' }]
  const pendingReviewCount = useMemo(
    () => historyRecords.filter((record) => record.processingState === '待複核').length,
    [historyRecords],
  )
  const todayCompletedCount = useMemo(
    () => historyRecords.filter((record) => record.date === today && record.processingState === '已完成').length,
    [historyRecords, today],
  )
  const statLabels = [
    [t.pendingSamples, t.todayPending, t.pending],
    [t.reviewResult, t.manualReview, t.attention],
    [t.completed, t.todayClosed, t.normal],
  ]

  return (
    <div className="page-shell dashboard-page">
      {loading && <p role="status">{tr("雲端紀錄載入中…")}</p>}
      {error && <p role="alert">{tr(error)} <button onClick={reload}>{tr("重試")}</button></p>}
      <header className="page-header compact-header">
        <div>
          <p className="eyebrow">{t.dashboardEyebrow}</p>
          <h2>{t.dashboardTitle}</h2>
        </div>
        <button
          type="button"
          className="primary-btn"
          onClick={() => navigate('/analysis')}
        >
          ＋ {t.newAnalysis}
        </button>
      </header>

      <section className="stats-grid dashboard-grid">
        {dashboardStats.map((stat, index) => (
          <MetricCard
            key={stat.label}
            label={statLabels[index][0]}
            value={
              index === 1
                ? String(pendingReviewCount)
                : index === 2
                  ? String(todayCompletedCount)
                  : stat.value
            }
            detail={statLabels[index][1]}
            status={statLabels[index][2]}
            tone={stat.tone}
            onClick={
              index === 1
                ? () => navigate('/history?filter=pending-review')
                : index === 2
                  ? () => navigate(`/history?filter=completed&startDate=${today}&endDate=${today}`)
                  : undefined
            }
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
            <span>{tr(t.status)}</span>
            <span>{t.action}</span>
          </div>

          {queue.map((item) => (
            <div className="queue-row" key={item.id}>
              <span>{item.sampleId ?? item.id}</span>
              <span>{item.time}</span>
              <span className={`status-pill ${item.status === '待分析' ? 'warning' : item.status === 'AI分析中' ? 'neutral-badge' : 'success'}`}>
                {item.status === '待分析' ? t.pendingSamples : item.status === 'AI分析中' ? t.analyzing : item.status}
              </span>
              <button
                type="button"
                className="secondary-btn small"
                onClick={() => navigate(`/history/${item.recordId}`)}
              >
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
              <span>{item.sampleId ?? item.id}</span>
              <span>{item.density}</span>
              <span>{item.motility}</span>
              <span>{item.morphology}</span>
              <span className={`status-pill ${item.result === '正常' ? 'success' : 'warning'}`}>{item.result === '正常' ? t.normal : item.result === '示範資料' ? tr("示範資料") : item.result}</span>
              <button type="button" className="secondary-btn small" onClick={() => navigate(`/history/${item.recordId}`)}>
                {t.view}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
