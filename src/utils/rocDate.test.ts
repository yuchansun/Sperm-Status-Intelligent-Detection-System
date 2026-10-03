import { describe, expect, it } from 'vitest'
import { rocYyyMmDdToGregorian } from './rocDate'

describe('rocYyyMmDdToGregorian', () => {
  it('converts ROC YYYMMDD to Gregorian ISO date', () => {
    expect(rocYyyMmDdToGregorian('0790520')).toBe('1990-05-20')
    expect(rocYyyMmDdToGregorian('1090101')).toBe('2020-01-01')
  })

  it('passes through existing ISO dates', () => {
    expect(rocYyyMmDdToGregorian('1990-05-20')).toBe('1990-05-20')
  })

  it('throws for invalid formats', () => {
    expect(() => rocYyyMmDdToGregorian('')).toThrow()
    expect(() => rocYyyMmDdToGregorian('123')).toThrow()
    expect(() => rocYyyMmDdToGregorian('0790230')).toThrow()
  })
})
