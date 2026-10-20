import { expect, it } from 'vitest'
import { generateDemoAnalysis } from './demoAnalysis.js'
it('varies by examination while keeping retries and all displayed measurements consistent', () => {
  const results = Array.from({ length: 100 }, (_, i) => generateDemoAnalysis(`record-${i}`, true))
  expect(new Set(results.map(r => r.density)).size).toBeGreaterThan(80)
  expect(generateDemoAnalysis('same-id', true)).toEqual(generateDemoAnalysis('same-id', true))
  for (const result of results) {
    expect(result.ai_result.isDemo).toBe(true)
    expect(Number(result.ai_result.density)).toBe(result.density)
    expect(Number.parseFloat(result.ai_result.normalRate)).toBe(result.morphology)
    expect(Number.parseFloat(result.ai_result.motility)).toBe(result.motility)
    expect(result.count_of_spermatozoa).toBe(Number((result.amount * result.density).toFixed(2)))
    for (const percentage of [result.morphology, result.motility]) {
      expect(percentage).toBeGreaterThanOrEqual(0)
      expect(percentage).toBeLessThanOrEqual(100)
    }
  }
})
it('leaves unrequested motility unmeasured rather than generating a hidden result', () => {
  const result = generateDemoAnalysis('no-motility', false)
  expect(result.motility).toBeNull()
  expect(result.motility_type).toBeNull()
  expect(result.ai_result.motility).toBe('—')
})
