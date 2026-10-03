import { describe, expect, it } from 'vitest'
import { mapTwNhiIccCardToPatient } from './twNhiIccApi'

describe('mapTwNhiIccCardToPatient', () => {
  it('maps tw-nhi-icc-service card payload', () => {
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
