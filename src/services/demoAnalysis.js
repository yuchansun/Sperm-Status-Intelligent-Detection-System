import { mockResult } from './mockData.js'

const sourceFilename = 'redpandacompress_2495459-2.mp4'
const base = `${import.meta.env.BASE_URL}demo/`

export const demoCase = {
  id: '2495459-v1',
  sourceFilename,
  sourceUrl: base + sourceFilename,
  previousSourceUrl: base + 'redpandacompress_2495459.mp4',
  resultUrl: base + 'redpandacompress_2495459_Mac辨識結果.mp4',
}

// Reuse the fixed presentation measurements for every input to this demo.
export function generateDemoAnalysis(includeMotility) {
  const { summary } = mockResult
  const density = Number.parseFloat(summary.density)
  const morphology = Number.parseFloat(summary.normalRate)
  const motility = includeMotility ? Number.parseFloat(summary.motility) : null
  return {
    density, density_unit: 'million/mL', morphology, motility,
    motility_type: includeMotility ? 'progressive' : null,
    summary: `濃度 ${density} M/mL，正常型態 ${morphology}%${motility === null ? '。' : `，活動力 ${motility}%。`}`,
    ai_result: {
      ...summary, isDemo: true, demoCaseId: demoCase.id, density: String(density),
      motility: includeMotility ? summary.motility : '—',
    },
  }
}
