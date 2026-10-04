import { describe, expect, it } from 'vitest'
import { mapTwNhiIccCardToPatient, mapTwNhiIccHealthStatus } from './twNhiIccApi'

describe('mapTwNhiIccCardToPatient', () => {
  it('maps a v0.3.0 snapshot card payload', () => {
    const patient = mapTwNhiIccCardToPatient({
      reader_name: 'Test Reader',
      card_no: '1234567890123',
      full_name: '王小明',
      id_no: 'A123456789',
      birth_date: '1990-05-20',
      sex: 'M',
      issue_date: '2020-01-01',
    })

    expect(patient.source).toBe('health_card')
    expect(patient.name).toBe('王小明')
    expect(patient.birthday).toBe('1990-05-20')
    expect(patient.cardId).toBe('1234567890123')
  })
})

describe('mapTwNhiIccHealthStatus', () => {
  it('maps a healthy PC/SC reader and card without blank values', () => {
    const status = mapTwNhiIccHealthStatus('0.3.0', true, {
      status: 'ok',
      readers: [{ name: 'Reader', state: 'nhi_card', card: { full_name: 'Test', id_no: 'A123' } }],
    })

    expect(status).toMatchObject({ service: 'ready', pcsc: 'ready', reader: 'connected', card: 'ready' })
  })

  it('maps empty and unsupported reader states', () => {
    expect(mapTwNhiIccHealthStatus('0.3.0', true, { status: 'ok', readers: [{ state: 'empty' }] }).card).toBe('empty')
    expect(mapTwNhiIccHealthStatus('0.3.0', true, { status: 'ok', readers: [{ state: 'unsupported_card' }] }).card).toBe('unsupported')
    expect(mapTwNhiIccHealthStatus('0.3.0', true, { status: 'ok', readers: [{ state: 'mystery' }] }).card).toBe('unknown')
  })

  it('maps PC/SC and reader failures', () => {
    expect(mapTwNhiIccHealthStatus('0.3.0', true, { status: 'pcsc_unavailable', readers: [] }).pcsc).toBe('unavailable')
    expect(mapTwNhiIccHealthStatus('0.2.3', false, { status: 'ok', readers: [] }).service).toBe('old_version')
    expect(mapTwNhiIccHealthStatus('0.3.0', true, { status: 'ok', readers: [{ state: 'error', error: 'SharingViolation' }] }).card).toBe('sharing_violation')
  })
})
