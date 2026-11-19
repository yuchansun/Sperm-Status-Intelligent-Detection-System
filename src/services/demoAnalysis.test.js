import { expect, it } from 'vitest'
import { demoCase, generateDemoAnalysis } from './demoAnalysis.js'

it('ties the fixed presentation measurements to the prerecorded case', () => {
  const result = generateDemoAnalysis(true)
  expect(result).toMatchObject({
    density: 14.8, morphology: 6.4, motility: 62,
    ai_result: { isDemo: true, demoCaseId: demoCase.id, motility: '62%' },
  })
  const withoutMotility = generateDemoAnalysis(false)
  expect(withoutMotility).toMatchObject({
    density: result.density, morphology: result.morphology, motility: null,
    motility_type: null, ai_result: { demoCaseId: demoCase.id, motility: '—' },
  })
})
