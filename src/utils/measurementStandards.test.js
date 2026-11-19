import { expect, it } from 'vitest'
import { evaluateMeasurement, getMeasurementValue } from './measurementStandards.js'
import { generateDemoAnalysis } from '../services/demoAnalysis.js'

it('uses concentration rather than total sperm number for concentration displays and assessment', () => {
  const record = { density: 31.9, measurements: { density: 31.9, countOfSpermatozoa: 102 } }
  expect(getMeasurementValue(record, 'countOfSpermatozoa')).toBe(31.9)
  expect(evaluateMeasurement(record, 'countOfSpermatozoa').value).toBe(31.9)
  expect(getMeasurementValue({ measurements: { countOfSpermatozoa: 102 } }, 'countOfSpermatozoa')).toBeNull()
  expect(getMeasurementValue({ density: 0 }, 'countOfSpermatozoa')).toBe(0)
})

it('labels the fixed case concentration without claiming an unmeasured total', () => {
  const record = generateDemoAnalysis(true)
  expect(record.count_of_spermatozoa).toBeUndefined()
  expect(record.density_unit).toBe('million/mL')
})
