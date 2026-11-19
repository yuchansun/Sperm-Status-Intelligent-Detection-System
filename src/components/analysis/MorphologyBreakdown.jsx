import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { translateText as tr } from '../../i18n/translate.js'
import { useLanguage } from '../../context/language.js'
import { getMeasurementValue } from '../../utils/measurementStandards.js'

const COLORS = ['#35b779', '#f59e0b']

export function MorphologyBreakdown({ record, height = 190 }) {
  const { t } = useLanguage()
  const rawValue = getMeasurementValue(record, 'morphology')
  const morphology = rawValue === null || rawValue === undefined || rawValue === ''
    ? null
    : Number.parseFloat(String(rawValue).replace('%', ''))
  const hasValue = Number.isFinite(morphology) && morphology >= 0 && morphology <= 100
  const data = hasValue ? [
    { name: tr('正常型態'), value: morphology, color: COLORS[0] },
    { name: tr('異常型態'), value: 100 - morphology, color: COLORS[1] },
  ] : []

  return (
    <div className="morphology-breakdown">
      <div className="morphology-breakdown-heading">
        <strong>{t.morphologyAnalysis}</strong>
        <span>{tr('{{0}}：{{1}}', [tr('正常率'), hasValue ? `${morphology}%` : tr('未判定')])}</span>
      </div>
      <div className="morphology-breakdown-chart">
        {hasValue ? <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={4}>
              {data.map(entry => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]} />
          </PieChart>
        </ResponsiveContainer> : <p className="muted-preview">{tr('目前沒有型態比例資料，暫不顯示圖表。')}</p>}
      </div>
      {hasValue && <div className="chart-legend">
        {data.map(entry => <span key={entry.name}><i style={{ background: entry.color }} />{entry.name} {entry.value.toFixed(1)}%</span>)}
      </div>}
    </div>
  )
}
