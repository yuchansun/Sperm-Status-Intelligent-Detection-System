const patientNotesStorageKey = 'sperm-ai-patient-notes'

function readNotes() {
  const savedNotes = window.localStorage.getItem(patientNotesStorageKey)
  if (!savedNotes) return {}

  try {
    const parsedNotes = JSON.parse(savedNotes)
    return parsedNotes && typeof parsedNotes === 'object' ? parsedNotes : {}
  } catch {
    return {}
  }
}

export function getPatientNote(patientId) {
  return readNotes()[patientId] ?? ''
}

export function savePatientNote(patientId, note) {
  const notes = readNotes()
  notes[patientId] = note
  window.localStorage.setItem(patientNotesStorageKey, JSON.stringify(notes))
}
