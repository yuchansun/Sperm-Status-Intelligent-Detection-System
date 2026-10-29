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

it('labels generated total sperm number independently from concentration', () => {
  const record = generateDemoAnalysis('unit-check', true)
  expect(record.count_of_spermatozoa).toBe(Number((record.amount * record.density).toFixed(2)))
  expect(record.count_unit).toBe('10⁶')
  expect(record.count_definition).toBe('total')
  expect(record.density_unit).toBe('million/mL')
})
