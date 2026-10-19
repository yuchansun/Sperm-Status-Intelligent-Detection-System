import { webcrypto } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { db, replies, calls, upload, signed, getUser } = vi.hoisted(() => {
  const replies = []
  const calls = []
  const upload = vi.fn()
  const signed = vi.fn()
  const getUser = vi.fn()
  const db = { auth: { getUser }, storage: { from: vi.fn(() => ({ upload, createSignedUrl: signed })) }, from: vi.fn(table => {
    const call = { table, steps: [] }; calls.push(call)
    const query = { then: (resolve, reject) => Promise.resolve(replies.shift() ?? { data: null, error: { code: 'NO_FIXTURE' } }).then(resolve, reject) }
    for (const method of ['select', 'eq', 'limit', 'range', 'order', 'update', 'insert', 'upsert', 'single']) query[method] = (...args) => { call.steps.push([method, ...args]); return query }
    return query
  }) }
  return { db, replies, calls, upload, signed, getUser }
})
vi.mock('./supabase.js', () => ({ supabase: db, supabaseConfigError: '' }))
import { submitDemoExamination, getCloudHistory, mapRecord, validateImage, saveCloudNote, signedImage } from './cloudApi.js'

afterEach(() => vi.unstubAllGlobals())

const draft = { patientName: '測試病患', nationalId: 'TEST-0001', birthDate: '1990-05-20', sex: 'M', phone: '', healthCardNumber: '', identityStatus: '', patientDataSource: 'manual' }
const specimen = { sampleId: 'TEST-SAMPLE', includeMotility: false, templateLabel: '範例 A' }
const operation = () => ({ examinationId: 'exam-1', recordId: 'record-1', imagePath: null })
const ok = data => ({ data, error: null })
beforeEach(() => {
  replies.length = 0; calls.length = 0; vi.clearAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'staff-1' } }, error: null })
  upload.mockResolvedValue(ok({ path: 'private-path' }))
})
describe('cloud data boundary', () => {
  it('does not write invalid input or unauthenticated submissions', async () => {
    expect(await submitDemoExamination({ patientDraft: { ...draft, patientName: '' }, specimen, operation: operation() })).toHaveProperty('errors')
    expect(db.from).not.toHaveBeenCalled()
    getUser.mockResolvedValue({ data: { user: null }, error: new Error() })
    await expect(submitDemoExamination({ patientDraft: draft, specimen, operation: operation() })).rejects.toThrow('登入')
    expect(db.from).not.toHaveBeenCalled()
  })
  it('saves the patient, linked examination and explicitly marked demo without touching local data', async () => {
    localStorage.setItem('sperm-ai-patients', 'original')
    replies.push(ok([{ id: 'patient-1' }]), ok({ id: 'patient-1', patient_name: draft.patientName }), ok({ id: 'exam-1', sample_id: specimen.sampleId }), ok({ id: 'record-1' }))
    const result = await submitDemoExamination({ patientDraft: draft, specimen, operation: operation() })
    expect(result.recordId).toBe('record-1')
    const exam = calls[2].steps.find(s => s[0] === 'upsert')[1]
    expect(exam.patient_id).toBe('patient-1')
    const analysis = calls[3].steps.find(s => s[0] === 'upsert')[1]
    expect(analysis.ai_result.isDemo).toBe(true)
    expect(analysis.motility).toBeNull()
    expect(analysis.density).toBe(48)
    expect(analysis.morphology).toBe(4)
    expect(analysis.ph).toBeNull()
    expect(analysis.count_of_spermatozoa).toBeNull()
    expect(analysis.examination_id).toBe('exam-1')
    expect(upload).not.toHaveBeenCalled()
    expect(localStorage.getItem('sperm-ai-patients')).toBe('original')
  })
  it('creates a new patient using a stable unique code and the actual schema fields', async () => {
    vi.stubGlobal('crypto', webcrypto)
    replies.push(ok([]), ok({ id: 'new-patient', patient_name: draft.patientName }), ok({ id: 'exam-1', sample_id: specimen.sampleId }), ok({ id: 'record-1' }))
    await submitDemoExamination({ patientDraft: draft, specimen, operation: operation() })
    const inserted = calls[1].steps.find(s => s[0] === 'insert')[1]
    expect(inserted.patient_code).toMatch(/^PT-[0-9a-f]{64}$/)
    expect(inserted.national_id).toBe('TEST-0001')
    expect(inserted.birth_date).toBe('1990-05-20')
    expect(inserted.created_by).toBe('staff-1')
  })
  it('stops ambiguous patient matches before updating any patient', async () => {
    replies.push(ok([{ id: 'a' }, { id: 'b' }]))
    await expect(submitDemoExamination({ patientDraft: draft, specimen, operation: operation() })).rejects.toThrow('多筆')
    expect(calls).toHaveLength(1)
  })
  it('keeps IDs on upload retry and only uploads the newly supplied file to private storage', async () => {
    const op = operation()
    const file = new File(['image'], 'test.png', { type: 'image/png' })
    const seed = () => replies.push(ok([{ id: 'patient-1' }]), ok({ id: 'patient-1' }), ok({ id: 'exam-1', sample_id: 'TEST' }), ok({ id: 'record-1' }))
    seed(); upload.mockResolvedValueOnce({ data: null, error: { code: '403' } })
    await expect(submitDemoExamination({ patientDraft: draft, specimen, file, operation: op })).rejects.toThrow('403')
    seed(); replies.push(ok({ id: 'record-1' }))
    await submitDemoExamination({ patientDraft: draft, specimen, file, operation: op })
    expect(upload).toHaveBeenLastCalledWith('staff-1/exam-1/record-1.png', file, { upsert: true, contentType: 'image/png' })
    const ids = calls.filter(c => c.table === 'analysis_records').flatMap(c => c.steps.filter(s => s[0] === 'upsert').map(s => s[1].id))
    expect(ids).toEqual(['record-1', 'record-1'])
    expect(db.storage.from).toHaveBeenCalledWith('exam-images')
  })
  it('rejects oversized and unsupported files before network operations', () => {
    expect(() => validateImage({ type: 'image/png', size: 10485761 })).toThrow('10 MB')
    expect(() => validateImage({ type: 'image/svg+xml', size: 10 })).toThrow('JPEG')
    expect(() => validateImage({ type: 'image/png', size: 0 })).toThrow()
  })
  it('propagates note failures instead of claiming success', async () => {
    replies.push({ data: null, error: { code: '42501' } })
    await expect(saveCloudNote('patient-1', 'note')).rejects.toThrow('42501')
  })
  it('reads only cloud records and preserves nullable values', async () => {
    localStorage.setItem('sperm-ai-history-records', '[{"id":"local"}]')
    replies.push(ok([]))
    expect(await getCloudHistory()).toEqual([])
    const mapped = mapRecord({ id: 'record', examinations: { id: 'exam', patients: { id: 'patient', birth_date: '1990-01-01', sex: 'M', patient_notes: { note: '雲端備註' } } } })
    expect(mapped.motility).toBe('—')
    expect(mapped.patient.note).toBe('雲端備註')
    expect(mapped.isDemo).toBe(false)
  })
  it('formats numeric percentages and exposes both image paths without turning null into zero', () => {
    const mapped = mapRecord({ id: 'record', motility: 0, morphology: 4,
      original_image_path: 'original.png', analyzed_image_path: 'analyzed.png', amount: null,
      examinations: { id: 'exam', patients: { id: 'patient', birth_date: '1990-01-01', sex: 'M', email: 'patient@example.com' } } })
    expect(mapped.motility).toBe('0%')
    expect(mapped.morphology).toBe('4%')
    expect(mapped.measurements.amount).toBeNull()
    expect(mapped.analyzedImagePath).toBe('analyzed.png')
    expect(mapped.patient.email).toBe('patient@example.com')
  })
  it('uses short-lived signed URLs', async () => {
    signed.mockResolvedValue(ok({ signedUrl: 'https://example.test/signed' }))
    expect(await signedImage('private-path')).toBe('https://example.test/signed')
    expect(signed).toHaveBeenCalledWith('private-path', 300)
  })
})
