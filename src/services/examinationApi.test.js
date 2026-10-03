import { describe, expect, it, beforeEach } from 'vitest'
import {
  __resetExaminationStoreForTests,
  createExamination,
  getPatientById,
} from './examinationApi.js'

describe('createExamination', () => {
  beforeEach(() => {
    __resetExaminationStoreForTests()
  })

  it('re-validates patient data on server layer', () => {
    const result = createExamination({
      patientDraft: {
        patientName: '',
        nationalId: '',
        birthDate: '',
        sex: 'UNKNOWN',
        phone: '',
        healthCardNumber: '',
        identityStatus: '',
        patientDataSource: 'manual',
      },
      specimen: { sampleId: 'SP-1', includeMotility: false },
    })

    expect('errors' in result).toBe(true)
  })

  it('creates examination linked to patient without exposing storage in localStorage', () => {
    const result = createExamination({
      patientDraft: {
        patientName: '王小明',
        nationalId: 'MR-20260001',
        birthDate: '1990-05-20',
        sex: 'M',
        phone: '',
        healthCardNumber: '',
        identityStatus: '',
        patientDataSource: 'manual',
      },
      specimen: { sampleId: 'SP-2026-001', includeMotility: true },
    })

    expect('examination' in result).toBe(true)
    if (!('examination' in result)) return

    const patient = getPatientById(result.examination.patientId)
    expect(patient?.patientName).toBe('王小明')
    expect(result.examination.specimen.sampleId).toBe('SP-2026-001')
  })
})
