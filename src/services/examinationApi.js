import { validatePatientDraft } from '../utils/patientValidation.ts'

/** @typedef {import('../types/examination.ts').PatientRecord} PatientRecord */
/** @typedef {import('../types/examination.ts').SpecimenRecord} SpecimenRecord */
/** @typedef {import('../types/examination.ts').ExaminationRecord} ExaminationRecord */
/** @typedef {import('../types/examination.ts').PatientInputDraft} PatientInputDraft */

const patients = new Map()
const examinations = new Map()
const patientStorageKey = 'sperm-ai-patients'

let patientSequence = 1
let examinationSequence = 1

function createPatientId() {
  const id = `PT-${Date.now()}-${String(patientSequence).padStart(4, '0')}`
  patientSequence += 1
  return id
}

function createExaminationId() {
  const id = `EX-${Date.now()}-${String(examinationSequence).padStart(4, '0')}`
  examinationSequence += 1
  return id
}

function persistPatient(patient) {
  if (typeof window === 'undefined') return

  try {
    const savedPatients = JSON.parse(window.localStorage.getItem(patientStorageKey) ?? '{}')
    savedPatients[patient.patientId] = patient
    window.localStorage.setItem(patientStorageKey, JSON.stringify(savedPatients))
  } catch {
    // Local storage is optional for the in-memory demo mode.
  }
}

/**
 * @param {PatientInputDraft} draft
 * @returns {{ patient: PatientRecord } | { errors: Record<string, string> }}
 */
export function upsertPatientFromDraft(draft) {
  const errors = validatePatientDraft(draft)
  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const nationalIdKey = draft.nationalId.trim().toUpperCase()
  const existing = [...patients.values()].find(
    (patient) => patient.nationalId.trim().toUpperCase() === nationalIdKey,
  )

  /** @type {PatientRecord} */
  const patient = {
    patientId: existing?.patientId ?? createPatientId(),
    patientName: draft.patientName.trim(),
    nationalId: draft.nationalId.trim(),
    birthDate: draft.birthDate.trim(),
    sex: draft.sex,
    phone: draft.phone.trim() || undefined,
    healthCardNumber: draft.healthCardNumber.trim() || undefined,
    patientDataSource: draft.patientDataSource,
    identityStatus: draft.identityStatus.trim() || undefined,
  }

  patients.set(patient.patientId, patient)
  persistPatient(patient)
  return { patient }
}

/**
 * @param {{ patientDraft: PatientInputDraft, specimen: SpecimenRecord }} input
 * @returns {{ examination: ExaminationRecord, patient: PatientRecord } | { errors: Record<string, string> }}
 */
export function createExamination(input) {
  const { patientDraft, specimen } = input

  if (!specimen.sampleId?.trim()) {
    return { errors: { sampleId: '請輸入檢體編號' } }
  }

  const patientResult = upsertPatientFromDraft(patientDraft)
  if ('errors' in patientResult) {
    return patientResult
  }

  /** @type {ExaminationRecord} */
  const examination = {
    examinationId: createExaminationId(),
    patientId: patientResult.patient.patientId,
    specimen: {
      sampleId: specimen.sampleId.trim(),
      includeMotility: Boolean(specimen.includeMotility),
      templateLabel: specimen.templateLabel,
    },
    createdAt: new Date().toISOString(),
  }

  examinations.set(examination.examinationId, examination)
  return { examination, patient: patientResult.patient }
}

/** @param {string} patientId */
export function getPatientById(patientId) {
  const inMemoryPatient = patients.get(patientId)
  if (inMemoryPatient) return inMemoryPatient
  if (typeof window === 'undefined') return null

  try {
    const savedPatients = JSON.parse(window.localStorage.getItem(patientStorageKey) ?? '{}')
    const savedPatient = savedPatients[patientId]
    if (savedPatient) {
      patients.set(patientId, savedPatient)
      return savedPatient
    }
  } catch {
    return null
  }

  return null
}

/** @param {string} examinationId */
export function getExaminationById(examinationId) {
  return examinations.get(examinationId) ?? null
}

/** 供測試重置 */
export function __resetExaminationStoreForTests() {
  patients.clear()
  examinations.clear()
  patientSequence = 1
  examinationSequence = 1
}
