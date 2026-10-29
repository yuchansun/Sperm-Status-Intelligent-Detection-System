const keyFor = recordId => `sperm-ai-report-draft-${recordId}`

export function getReportDraft(record) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(keyFor(record.id)) || 'null')
    return { notes: saved?.notes ?? record.patient?.note ?? '', supplement: saved?.supplement ?? '', email: saved?.email ?? record.patient?.email ?? '', subject: saved?.subject ?? '', body: saved?.body ?? '', hospital: saved?.hospital ?? '', doctor: saved?.doctor ?? (record.patient?.doctor && record.patient.doctor !== '—' ? record.patient.doctor : '') }
  } catch {
    return { notes: record.patient?.note ?? '', supplement: '', email: record.patient?.email ?? '', subject: '', body: '', hospital: '', doctor: record.patient?.doctor && record.patient.doctor !== '—' ? record.patient.doctor : '' }
  }
}

export function saveReportDraft(recordId, draft) {
  window.localStorage.setItem(keyFor(recordId), JSON.stringify(draft))
}
