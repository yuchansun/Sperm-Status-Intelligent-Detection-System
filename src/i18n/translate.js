import messages from './messages.json'

export function currentLanguage() {
  try {
    const language = window.localStorage.getItem('sperm-ai-language')
    return ['en', 'ko'].includes(language) ? language : 'zh'
  } catch { return 'zh' }
}
const aliases = new Map()
for (const [source, values] of Object.entries(messages)) {
  aliases.set(source, source)
  for (const value of Object.values(values)) aliases.set(value, source)
}
const patterns = Object.entries(messages).filter(([source]) => source.includes('{{')).map(([source, values]) => {
  const parts = source.split(/(\{\{\d+\}\})/g)
  const indexes = []
  const regex = parts.map(part => {
    const match = part.match(/^\{\{(\d+)\}\}$/)
    if (match) { indexes.push(Number(match[1])); return '([\\s\\S]*?)' }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }).join('')
  return { values, regex: new RegExp(`^${regex}$`), indexes }
})
export function translateText(source, variables = [], language = currentLanguage()) {
  if (typeof source !== 'string') return source
  const key = aliases.get(source) || source
  let value = messages[key]?.[language] || key
  let args = variables
  if (!messages[key]) {
    for (const pattern of patterns) {
      const match = source.match(pattern.regex)
      if (!match) continue
      value = pattern.values[language] || source
      args = []
      pattern.indexes.forEach((index, i) => { args[index] = translateText(match[i + 1], [], language) })
      break
    }
  }
  return value.replace(/\{\{(\d+)\}\}/g, (token, index) => args[index] === undefined ? token : String(args[index]))
}
// Database codes and patient-authored content are never translated or rewritten in storage.
export function displayRecordSummary(record, language = currentLanguage()) {
  if (record?.isDemo && !record.aiResult?.manuallyEdited && (record.aiResult?.generatorVersion === 1 || /^(濃度 |示範分析[:：結])/.test(record.summary || ''))) {
    return translateText('濃度 {{0}} ×10⁶/mL · 活動力 {{1}} · 正常型態比例 {{2}}', [record.density, record.motility, record.morphology], language)
  }
  return record?.summary || ''
}
