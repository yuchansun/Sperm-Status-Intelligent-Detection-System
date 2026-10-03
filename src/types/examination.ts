import type { HealthCardSex } from './healthCard'

export type PatientDataSource = 'health_card' | 'manual'

export type PatientRecord = {
  patientId: string
  patientName: string
  nationalId: string
  birthDate: string
  sex: HealthCardSex
  phone?: string
  healthCardNumber?: string
  patientDataSource: PatientDataSource
  identityStatus?: string
  dateIssue?: string
}

export type SpecimenRecord = {
  sampleId: string
  includeMotility: boolean
  templateLabel?: string
}

export type ExaminationRecord = {
  examinationId: string
  patientId: string
  specimen: SpecimenRecord
  createdAt: string
}

export type PatientInputDraft = {
  patientName: string
  nationalId: string
  birthDate: string
  sex: HealthCardSex
  phone: string
  healthCardNumber: string
  identityStatus: string
  patientDataSource: PatientDataSource
}
