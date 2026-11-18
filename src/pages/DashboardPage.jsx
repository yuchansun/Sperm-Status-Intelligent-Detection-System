import { translateText as tr } from '../i18n/translate.js'
import { useMemo } from 'react'
import { TestTubeDiagonal, ClipboardCheck, CircleCheck, History, Plus, Eye } from 'lucide-react'
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
  const queueStates = new Set(['影像待上傳', '待分析', 'AI分析中'])
  const queue = historyRecords
    .filter(record => queueStates.has(record.processingState))
    .map(record => ({
      id: record.sampleId,
      recordId: record.id,
      time: record.date,
      status: record.processingState,
      action: record.processingState === 'AI分析中' ? t.viewProgress : record.processingState === '待分析' ? t.startAnalysis : t.uploadImage,
      needsUpload: record.processingState === '影像待上傳' || record.processingState === '待分析',
    }))
  const recentResults = historyRecords
    .filter(record => !queueStates.has(record.processingState))
    .slice(0, 5)
    .map(record => ({ ...record, recordId: record.id, result: record.status }))
  const dashboardStats = [{ label: t.pendingSamples, value: String(queue.length), tone: 'blue' }, { label: tr("待複核"), tone: 'warning' }, { label: tr("已完成"), tone: 'green' }]
  const pendingReviewCount = useMemo(
    () => historyRecords.filter((record) => record.processingState === '待複核').length,
    [historyRecords],
  )
  const todayCompletedCount = useMemo(
    () => historyRecords.filter((record) => record.date === today && record.processingState === '已完成').length,
    [historyRecords, today],
  )
  const statLabels = [
    [t.pendingSamples, t.queueCountDetail, t.pending],
    [t.reviewResult, t.manualReview, t.attention],
    [t.completed, t.todayClosed, t.normal],
  ]
  const statIcons = [
    <TestTubeDiagonal size={20} aria-hidden="true" />,
    <ClipboardCheck size={20} aria-hidden="true" />,
    <CircleCheck size={20} aria-hidden="true" />,
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
          className="primary-btn dashboard-icon-label"
          onClick={() => navigate('/analysis')}
        >
          <Plus size={18} aria-hidden="true" />{t.newAnalysis}
        </button>
      </header>

      <section className="stats-grid dashboard-grid">
        {dashboardStats.map((stat, index) => (
          <MetricCard
            key={stat.label}
            label={statLabels[index][0]}
            icon={statIcons[index]}
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
          <h3 className="dashboard-icon-label"><TestTubeDiagonal size={22} aria-hidden="true" />{t.pendingSamples}</h3>
          <span className="chip neutral">{t.queueWorkflowLabel}</span>
        </div>
        <p className="queue-source-note">{t.dashboardQueueHint}</p>

        <div className="queue-table">
          <div className="queue-row queue-head">
            <span>{t.sampleId}</span>
            <span>{t.receivedAt}</span>
            <span>{tr(t.status)}</span>
            <span>{t.action}</span>
          </div>

          {queue.map((item) => (
            <div className="queue-row" key={item.id}>
              <span data-label={t.sampleId}>{item.sampleId ?? item.id}</span>
              <span data-label={t.receivedAt}>{item.time}</span>
              <div data-label={t.status}><span className={`status-pill ${item.status === 'AI分析中' ? 'neutral-badge' : 'warning'}`}>
                {item.status === '待分析' ? t.pendingSamples : item.status === 'AI分析中' ? t.analyzing : t.awaitingImage}
              </span></div>
              <button
                type="button"
                className="secondary-btn small dashboard-icon-label"
                onClick={() => navigate(item.needsUpload ? `/analysis?record=${encodeURIComponent(item.recordId)}` : `/history/${item.recordId}`)}
              >
                {item.needsUpload ? <Plus size={16} aria-hidden="true" /> : <ClipboardCheck size={16} aria-hidden="true" />}
                {item.action}
              </button>
            </div>
          ))}
          {!queue.length && !loading && <p className="empty-queue-note">{t.noPendingSpecimens}</p>}
        </div>
      </section>

      <section className="dashboard-block">
        <div className="panel-header">
          <h3 className="dashboard-icon-label"><History size={22} aria-hidden="true" />{t.recentTests}</h3>
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
              <span data-label={t.sampleId}>{item.sampleId ?? item.id}</span>
              <span data-label={t.concentration}>{item.density} ×10⁶/mL</span>
              <span data-label={t.motility}>{item.motility}</span>
              <span data-label={t.morphology}>{item.morphology}</span>
              <div data-label={t.interpretation}><span className={`status-pill ${item.result === '正常' ? 'success' : 'warning'}`}>{item.result === '正常' ? t.normal : item.result === '示範資料' ? tr("示範資料") : tr(item.result)}</span></div>
              <button type="button" className="secondary-btn small dashboard-icon-label" onClick={() => navigate(`/history/${item.recordId}`)}>
                <Eye size={16} aria-hidden="true" />{t.view}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
