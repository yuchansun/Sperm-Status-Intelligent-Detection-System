import { supabase, supabaseConfigError } from './supabase.js'
import { validatePatientDraft } from '../utils/patientValidation.ts'
import { mockResult } from './mockData.js'

function client() {
  if (!supabase) throw new Error(supabaseConfigError)
  return supabase
}
function unwrap({ data, error }) {
  if (error) throw new Error(`資料操作失敗（${error.code || '連線錯誤'}），請確認權限、資料內容與網路後重試。`)
  return data
}
async function userId() {
  const { data, error } = await client().auth.getUser()
  if (error || !data.user) throw new Error('登入已失效，請重新登入。')
  return data.user.id
}
export function localDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function validateImage(file) {
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('影像僅支援 JPEG、PNG、WebP。')
  if (file.size > 10485760 || file.size === 0) throw new Error('影像須大於 0 且不超過 10 MB。')
}
export function newSubmission() {
  return { examinationId: crypto.randomUUID(), recordId: crypto.randomUUID(), imagePath: null }
}
export async function submitDemoExamination({ patientDraft: d, specimen, file, operation }) {
  const errors = validatePatientDraft(d)
  if (Object.keys(errors).length) return { errors }
  if (!specimen.sampleId.trim()) return { errors: { sampleId: '請輸入檢體編號' } }
  validateImage(file)
  const uid = await userId()
  const db = client()
  const nationalId = d.nationalId.trim().toUpperCase()
  const matches = unwrap(await db.from('patients').select('*').eq('national_id', nationalId).limit(2))
  if (matches.length > 1) throw new Error('此身分證號有多筆病患資料，請先由管理者確認，避免覆寫。')
  const payload = {
    patient_name: d.patientName.trim(), national_id: nationalId, birth_date: d.birthDate,
    sex: d.sex, phone: d.phone.trim() || null, health_card_number: d.healthCardNumber.trim() || null,
    patient_data_source: d.patientDataSource, identity_status: d.identityStatus.trim() || null,
    updated_at: new Date().toISOString(),
  }
  let patient
  if (matches[0]) {
    patient = unwrap(await db.from('patients').update(payload).eq('id', matches[0].id).select().single())
  } else {
    // A deterministic opaque patient code prevents duplicate inserts on concurrent submissions.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nationalId))
    const code = 'PT-' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    const result = await db.from('patients').insert({ ...payload, patient_code: code, created_by: uid }).select().single()
    if (result.error?.code === '23505') {
      patient = unwrap(await db.from('patients').select('*').eq('patient_code', code).single())
    } else patient = unwrap(result)
  }
  const examination = unwrap(await db.from('examinations').upsert({
    id: operation.examinationId, examination_code: `EX-${operation.examinationId}`,
    patient_id: patient.id, sample_id: specimen.sampleId.trim(), include_motility: specimen.includeMotility,
    template_label: specimen.templateLabel, created_by: uid,
  }, { onConflict: 'id' }).select().single())
  const record = {
    id: operation.recordId, examination_id: examination.id, sample_id: examination.sample_id,
    exam_date: localDate(), clinical_status: '示範資料', processing_state: file ? '影像待上傳' : '待複核',
    density: '48', motility: specimen.includeMotility ? '32%' : null, morphology: '4%',
    summary: '示範分析：固定範例數值，非實際影像判讀，不可作為臨床依據。',
    ai_result: { isDemo: true, ...mockResult.summary, precision: '示範', confidence: '示範', processingTime: '示範', density: '48', normalRate: '4%', motility: specimen.includeMotility ? '32%' : '未分析' },
    boxes: mockResult.boxes, created_by: uid, updated_at: new Date().toISOString(),
  }
  // Save a recoverable record first; retries reuse these IDs and never delete partial work.
  unwrap(await db.from('analysis_records').upsert(record, { onConflict: 'id' }).select('id').single())
  if (file) {
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type]
    const path = `${uid}/${examination.id}/${record.id}.${ext}`
    if (operation.imagePath !== path || operation.uploadedFile !== file) {
      unwrap(await db.storage.from('exam-images').upload(path, file, { upsert: true, contentType: file.type }))
      operation.imagePath = path
      operation.uploadedFile = file
    }
    unwrap(await db.from('analysis_records').update({ original_image_path: path, processing_state: '待複核', updated_at: new Date().toISOString() }).eq('id', record.id).select('id').single())
  }
  return { patient: { patientId: patient.id, patientName: patient.patient_name }, examination: { examinationId: examination.id }, recordId: record.id }
}
export function mapRecord(row) {
  const exam = row.examinations
  const p = exam?.patients
  if (!p) throw new Error('紀錄缺少可讀取的病患資料，請檢查外鍵及查詢權限。')
  const birth = new Date(`${p.birth_date}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return {
    id: row.id, examinationId: exam.id, patientId: p.id, sampleId: row.sample_id,
    date: row.exam_date, status: row.clinical_status || '未判讀', processingState: row.processing_state,
    density: row.density ?? '—', motility: row.motility ?? '—', morphology: row.morphology ?? '—',
    score: row.density ?? '—', summary: row.summary ?? '', aiResult: row.ai_result || {},
    isDemo: row.ai_result?.isDemo === true, boxes: row.boxes || [], imagePath: row.original_image_path,
    patient: { id: p.id, code: p.patient_code, name: p.patient_name, sex: { M: '男', F: '女', UNKNOWN: '未知' }[p.sex], age, phone: p.phone || '—', doctor: '—', note: p.patient_notes?.note || '' },
  }
}
export async function getCloudHistory() {
  const rows = []
  // PostgREST caps each response; page explicitly to avoid silently dropping older records.
  for (let offset = 0; ; offset += 500) {
    const batch = unwrap(await client().from('analysis_records').select('*, examinations!inner(*, patients!inner(*, patient_notes(note)))').order('created_at', { ascending: false }).order('id').range(offset, offset + 499))
    rows.push(...batch)
    if (batch.length < 500) break
  }
  return rows.map(mapRecord)
}
export async function saveCloudNote(patientId, note) {
  const uid = await userId()
  unwrap(await client().from('patient_notes').upsert({ patient_id: patientId, note, updated_by: uid, updated_at: new Date().toISOString() }, { onConflict: 'patient_id' }).select('patient_id').single())
}
export async function completeCloudRecord(id) {
  unwrap(await client().from('analysis_records').update({ processing_state: '已完成', updated_at: new Date().toISOString() }).eq('id', id).eq('processing_state', '待複核').select('id').single())
}
export async function signedImage(path) {
  if (!path) return null
  return unwrap(await client().storage.from('exam-images').createSignedUrl(path, 300)).signedUrl
}
