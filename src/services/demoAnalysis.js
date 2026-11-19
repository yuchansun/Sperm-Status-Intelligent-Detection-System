const sourceFilename = 'redpandacompress_2495459-2.mp4'
const base = `${import.meta.env.BASE_URL}demo/`

export const demoCase = {
  id: '2495459-v1',
  sourceFilename,
  sourceUrl: base + sourceFilename,
  previousSourceUrl: base + 'redpandacompress_2495459.mp4',
  resultUrl: base + 'redpandacompress_2495459_Mac辨識結果.mp4',
}

// Each record has reproducible sample values across retries and views.
export function generateDemoAnalysis(recordId, includeMotility) {
  let seed = 2166136261
  for (const char of recordId) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let value = Math.imul(seed ^ (seed >>> 15), seed | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
  const number = (min, max, digits = 1) => Number((min + random() * (max - min)).toFixed(digits))
  const density = number(18, 35)
  const morphology = number(14, 20)
  const motility = includeMotility ? number(48, 65) : null
  return {
    density, density_unit: 'million/mL', morphology, motility,
    motility_type: includeMotility ? 'progressive' : null,
    summary: `濃度 ${density} M/mL，正常型態 ${morphology}%${motility === null ? '。' : `，活動力 ${motility}%。`}`,
    ai_result: {
      normalRate: `${morphology}%`, isDemo: true, demoCaseId: demoCase.id, density: String(density),
      motility: includeMotility ? `${motility}%` : '—',
    },
  }
}
