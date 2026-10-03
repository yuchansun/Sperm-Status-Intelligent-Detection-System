import { historyRecords } from './mockData.js'
import { getPatientById } from './examinationApi.js'

const historyStorageKey = 'sperm-ai-history-records'

function sanitizeStoredRecord(record) {
  if (!record || typeof record !== 'object') return record

  const { patient, ...rest } = record
  return {
    ...rest,
    patientId: record.patientId ?? patient?.id ?? patient?.patientId,
    examinationId: record.examinationId,
  }
}

function hydrateRecord(record) {
  const patientFromStore = record.patientId ? getPatientById(record.patientId) : null
  if (patientFromStore) {
    return {
      ...record,
      patient: {
        id: patientFromStore.patientId,
        name: patientFromStore.patientName,
        sex: patientFromStore.sex === 'M' ? '男' : patientFromStore.sex === 'F' ? '女' : '未知',
        phone: patientFromStore.phone ?? '',
        age: calculateAge(patientFromStore.birthDate),
        doctor: '—',
        note: '',
      },
    }
  }

  if (record.patient) {
    return record
  }

  return {
    ...record,
    patient: {
      id: record.patientId ?? '—',
      name: '（需重新登入檢驗工作階段以載入病患資料）',
      sex: '—',
      phone: '—',
      age: '—',
      doctor: '—',
      note: '',
    },
  }
}

function calculateAge(birthDate) {
  if (!birthDate) return '—'
  const birth = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return '—'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

export function getHistoryRecords() {
  const savedRecords = window.localStorage.getItem(historyStorageKey)
  const persisted = savedRecords
    ? (() => {
        try {
          const parsedRecords = JSON.parse(savedRecords)
          return Array.isArray(parsedRecords) ? parsedRecords.map(hydrateRecord) : []
        } catch {
          return []
        }
      })()
    : []

  const mockHydrated = historyRecords.map((record) => hydrateRecord(sanitizeStoredRecord(record)))
  const persistedIds = new Set(persisted.map((record) => record.id))
  const mergedMock = mockHydrated.filter((record) => !persistedIds.has(record.id))

  return [...persisted, ...mergedMock]
}

export function saveHistoryRecord(record) {
  const savedRecords = window.localStorage.getItem(historyStorageKey)
  const records = savedRecords ? JSON.parse(savedRecords) : []
  const sanitized = sanitizeStoredRecord(record)
  const nextRecords = [sanitized, ...records.filter((savedRecord) => savedRecord.id !== sanitized.id)]
  window.localStorage.setItem(historyStorageKey, JSON.stringify(nextRecords))
}

export function createDemoHistoryRecord({ sampleId, patientId, examinationId }) {
  const baseRecord = historyRecords[0]
  const today = new Date().toISOString().slice(0, 10)
  const uniqueId = `P-${today.replaceAll('-', '')}-${Date.now().toString().slice(-4)}`

  return {
    ...baseRecord,
    id: uniqueId,
    sampleId: sampleId || `SP-${today.replaceAll('-', '')}-01`,
    date: today,
    status: '待追蹤',
    processingState: '已完成',
    patientId,
    examinationId,
  }
}
