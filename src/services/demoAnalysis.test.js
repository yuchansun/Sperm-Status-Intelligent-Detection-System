import { expect, it } from 'vitest'
import { demoCase, generateDemoAnalysis } from './demoAnalysis.js'

it('uses the same video with reproducible, near-reference values for each record', () => {
  const results = Array.from({ length: 80 }, (_, i) => generateDemoAnalysis(String(i), true))
  for (const [key, min, max] of [['density', 18, 35], ['morphology', 14, 20], ['motility', 48, 65]]) {
    expect(new Set(results.map(result => result[key])).size).toBeGreaterThan(1)
    expect(results.every(result => result[key] >= min && result[key] <= max)).toBe(true)
  }
  expect(generateDemoAnalysis('0', true)).toEqual(results[0])
  for (const result of results) {
    expect(result.ai_result).toMatchObject({
      demoCaseId: demoCase.id, density: String(result.density),
      motility: `${result.motility}%`, normalRate: `${result.morphology}%`,
    })
  }
  expect(generateDemoAnalysis('0', false)).toMatchObject({
    density: results[0].density, morphology: results[0].morphology,
    motility: null, motility_type: null, ai_result: { motility: '—' },
  })
})
