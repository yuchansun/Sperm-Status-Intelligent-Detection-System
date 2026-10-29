// Deterministic per submission: retries preserve the same simulated measurements.
// Replace this adapter with backend inference when that module is ready.
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
  const amount = number(1.2, 5)
  const density = number(8, 95)
  const morphology = number(2, 12)
  const motility = includeMotility ? number(15, 80) : null
  const detected = number(80, 260, 0)
  return {
    amount, amount_unit: 'mL', density, density_unit: 'million/mL', morphology, motility,
    color: random() < 0.5 ? '灰白色' : '乳白色', appearance: '均勻混濁', ph: number(7.2, 8),
    count_of_spermatozoa: Number((amount * density).toFixed(2)), count_unit: '10⁶/mL',
    count_definition: 'concentration', motility_type: includeMotility ? 'progressive' : null,
    summary: `濃度 ${density} M/mL，正常型態 ${morphology}%${motility === null ? '。' : `，活動力 ${motility}%。`}`,
    ai_result: {
      isDemo: true, generatorVersion: 1, density: String(density), normalRate: `${morphology}%`,
      motility: motility === null ? '—' : `${motility}%`, detected: String(detected),
      precision: `${number(90, 98)}%`, confidence: `${number(85, 97)}%`, processingTime: `${number(0.8, 3)}s`,
    },
  }
}
