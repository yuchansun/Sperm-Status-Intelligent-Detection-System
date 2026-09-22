import { historyRecords } from './mockData.js'

const historyStorageKey = 'sperm-ai-history-records'

export function getHistoryRecords() {
  const savedRecords = window.localStorage.getItem(historyStorageKey)
  if (!savedRecords) return historyRecords

  try {
    const parsedRecords = JSON.parse(savedRecords)
    return Array.isArray(parsedRecords) ? [...parsedRecords, ...historyRecords] : historyRecords
  } catch {
    return historyRecords
  }
}

export function saveHistoryRecord(record) {
  const savedRecords = window.localStorage.getItem(historyStorageKey)
  const records = savedRecords ? JSON.parse(savedRecords) : []
  const nextRecords = [record, ...records.filter((savedRecord) => savedRecord.id !== record.id)]
  window.localStorage.setItem(historyStorageKey, JSON.stringify(nextRecords))
}

export function createDemoHistoryRecord(sampleId) {
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
    patient: {
      ...baseRecord.patient,
      name: 'Demo Patient',
      note: '此筆紀錄由前端範例分析建立，尚未連接資料庫。',
    },
  }
}
