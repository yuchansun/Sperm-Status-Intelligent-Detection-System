import { describe, expect, it } from 'vitest'
import { HealthCardReadError } from '../../types/healthCard'
import { MockHealthCardReader } from './mockHealthCardReader'

describe('MockHealthCardReader', () => {
  it('returns mock patient on success', async () => {
    const reader = new MockHealthCardReader('success')
    const patient = await reader.readBasicInfo()
    expect(patient.source).toBe('health_card')
    expect(patient.name).toBeTruthy()
    expect(patient.nationalId).toBeTruthy()
  })

  it('throws no_card scenario', async () => {
    const reader = new MockHealthCardReader('no_card')
    await expect(reader.readBasicInfo()).rejects.toMatchObject({
      code: 'no_card',
    } satisfies Partial<HealthCardReadError>)
  })

  it('throws connection_failed scenario', async () => {
    const reader = new MockHealthCardReader('connection_failed')
    await expect(reader.readBasicInfo()).rejects.toMatchObject({
      code: 'connection_failed',
    })
  })

  it('throws timeout scenario', async () => {
    const reader = new MockHealthCardReader('timeout')
    await expect(reader.readBasicInfo()).rejects.toMatchObject({
      code: 'timeout',
    })
  })
})
