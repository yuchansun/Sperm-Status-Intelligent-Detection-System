export const MEASUREMENT_STANDARDS = [
  { key: 'amount', label: 'Amount', unit: 'mL', range: '0.7–6.5' },
  { key: 'color', label: 'Color', unit: '無', range: 'White' },
  { key: 'appearance', label: 'Appearance', unit: '無', range: 'Milk-like' },
  { key: 'ph', label: 'pH', unit: '無', range: '7–8' },
  { key: 'morphology', label: '正常型態比例', unit: '%', range: '>15%' },
  { key: 'motility', label: '活動力', unit: '%', range: '>50%' },
  { key: 'countOfSpermatozoa', label: '精蟲濃度', unit: '×10⁶/mL', range: '>20 且 <120' },
]

// These are the three indicators shown as the primary result throughout the app.
// Other measurements remain available in the stored examination record.
export const CORE_MEASUREMENT_KEYS = ['countOfSpermatozoa', 'motility', 'morphology']
export const CORE_MEASUREMENT_STANDARDS = CORE_MEASUREMENT_KEYS
  .map(key => MEASUREMENT_STANDARDS.find(item => item.key === key))
  .filter(Boolean)

function numericValue(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseFloat(String(value).replace('%', ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function getMeasurementValue(record, key) {
  const measurements = record?.measurements || {}
  // The display key is retained for compatibility; concentration comes from density.
  // Total sperm number must never be substituted for concentration.
  if (key === 'countOfSpermatozoa') return measurements.density ?? record?.density ?? null
  if (key === 'motility') return measurements.motility ?? record?.motility
  if (key === 'morphology') return measurements.morphology ?? record?.morphology
  return measurements[key] ?? null
}

export function evaluateMeasurement(record, key) {
  const raw = getMeasurementValue(record, key)
  const standard = MEASUREMENT_STANDARDS.find(item => item.key === key)
  if (!standard) return { state: 'unknown', label: '未判定', value: raw, unit: '' }
  if (key === 'color' || key === 'appearance') {
    const normalized = String(raw ?? '').trim().toLowerCase()
    const expected = key === 'color' ? ['white', '白', '白色', '乳白色'] : ['milk-like', 'milk like', '乳樣', '乳白', '均勻混濁']
    return { state: expected.includes(normalized) ? 'normal' : normalized ? 'abnormal' : 'unknown', label: normalized ? String(raw) : '未判定', value: raw, unit: standard.unit }
  }
  const value = numericValue(raw)
  let normal = false
  if (value !== null) {
    if (key === 'amount') normal = value >= 0.7 && value <= 6.5
    if (key === 'ph') normal = value >= 7 && value <= 8
    if (key === 'countOfSpermatozoa') normal = value > 20 && value < 120
    if (key === 'morphology') normal = value > 15
    if (key === 'motility') normal = value > 50
  }
  return { state: value === null ? 'unknown' : normal ? 'normal' : 'abnormal', label: value === null ? '未判定' : String(value), value, unit: standard.unit }
}

export function formatMeasurement(result, unknownLabel = '未判定') {
  if (result.state === 'unknown') return unknownLabel
  return `${result.label}${result.unit === '無' ? '' : ` ${result.unit}`}`
}

export function statusClass(state) {
  return state === 'normal' ? 'success' : state === 'abnormal' ? 'danger' : 'neutral'
}
