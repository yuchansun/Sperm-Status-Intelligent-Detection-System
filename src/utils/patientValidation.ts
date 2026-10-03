import type { HealthCardSex } from '../types/healthCard'
import type { PatientInputDraft } from '../types/examination'

export type PatientFieldErrors = Partial<Record<keyof PatientInputDraft, string>>

const taiwanIdLetterValues: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18, K: 19, L: 20, M: 21,
  N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27, U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
}

function isValidTaiwanNationalId(id: string): boolean {
  const normalized = id.trim().toUpperCase()
  if (!/^[A-Z][12]\d{8}$/.test(normalized)) return false

  const letterValue = taiwanIdLetterValues[normalized[0]]
  const digits = normalized.slice(1).split('').map((char) => Number.parseInt(char, 10))
  const checksum =
    Math.floor(letterValue / 10) +
    (letterValue % 10) * 9 +
    digits[0] * 8 +
    digits[1] * 7 +
    digits[2] * 6 +
    digits[3] * 5 +
    digits[4] * 4 +
    digits[5] * 3 +
    digits[6] * 2 +
    digits[7] +
    digits[8]

  return checksum % 10 === 0
}

function isValidMedicalRecordId(id: string): boolean {
  const trimmed = id.trim()
  return trimmed.length >= 4 && trimmed.length <= 32 && /^[A-Za-z0-9\-_]+$/.test(trimmed)
}

export function validatePatientDraft(draft: PatientInputDraft): PatientFieldErrors {
  const errors: PatientFieldErrors = {}

  if (!draft.patientName.trim()) {
    errors.patientName = '請輸入姓名'
  }

  const idValue = draft.nationalId.trim()
  if (!idValue) {
    errors.nationalId = '請輸入身分證字號或病歷識別碼'
  } else if (!isValidTaiwanNationalId(idValue) && !isValidMedicalRecordId(idValue)) {
    errors.nationalId = '身分證字號或病歷識別碼格式不正確'
  }

  if (!draft.birthDate.trim()) {
    errors.birthDate = '請選擇出生日期'
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate.trim())) {
    errors.birthDate = '出生日期格式不正確'
  }

  const sex: HealthCardSex = draft.sex
  if (sex !== 'M' && sex !== 'F' && sex !== 'UNKNOWN') {
    errors.sex = '請選擇生理性別'
  }

  if (draft.phone.trim() && !/^[\d+\-() ]{6,20}$/.test(draft.phone.trim())) {
    errors.phone = '聯絡電話格式不正確'
  }

  return errors
}

export function isPatientDraftComplete(draft: PatientInputDraft): boolean {
  return Object.keys(validatePatientDraft(draft)).length === 0
}
