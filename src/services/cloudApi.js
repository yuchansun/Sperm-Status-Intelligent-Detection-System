import { permanentlyDelete } from './permanentDelete.js'
import { supabase, supabaseConfigError } from './supabase.js'
import { validatePatientDraft } from '../utils/patientValidation.ts'
import { describeMedia } from './mediaFiles.js'
import { withDeadline } from './requestDeadline.js'
import { uploadMediaFile } from './uploadMedia.js'
import { maskNationalId } from '../utils/maskSensitive.ts'
import { generateDemoAnalysis } from './demoAnalysis.js'
import { mockResult } from './mockData.js'

function client() {
  if (!supabase) throw new Error(supabaseConfigError)
  return supabase
}
function unwrap({ data, error }) {
  if (error?.code === '42703' || error?.code === 'PGRST204') throw new Error('資料庫欄位尚未更新完成：請依序執行 004 檢測管理與 005 病患管理 SQL，再按重試。')
  if (error?.code === 'PGRST202') throw new Error('資料庫找不到檢體流水號功能，請先執行 202610190003_sample_serial.sql 並更新 Supabase 函式快取，再於本頁重試。')
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
export async function submitDemoExamination({ patientDraft: d, specimen, file, operation, selectedPatientId, createOnly = false, signal, onStatus = () => {}, onProgress = () => {} }) {
  const errors = validatePatientDraft(d)
  if (Object.keys(errors).length) return { errors }
  const media = describeMedia(file)
  const isVideo = media?.kind === 'video'
  const step = async (label, work) => {
    onStatus(label)
    try { return await withDeadline(work, { signal, label }) }
    catch (error) {
      if (error.name !== 'AbortError' && error.name !== 'TimeoutError') error.message = `${label}：${error.message}`
      throw error
    }
  }
  const query = (label, makeQuery) => step(label, stepSignal => makeQuery().abortSignal(stepSignal))
  const uid = await step('正在確認登入狀態', () => userId())
  const db = client()
  const nationalId = d.nationalId.trim().toUpperCase()
  const matches = selectedPatientId ? [] : unwrap(await query('正在查詢病患', () => db.from('patients').select('*').eq('national_id', nationalId).is('deleted_at', null).limit(2)))
  if (createOnly && matches.length && matches[0].id !== operation.patientId) throw new Error('此病患已存在，請改用搜尋並選擇既有病患，不會覆寫原資料。')
  if (matches.length > 1) throw new Error('此身分證號有多筆病患資料，請先由管理者確認，避免覆寫。')
  const payload = {
    patient_name: d.patientName.trim(), national_id: nationalId, birth_date: d.birthDate,
    sex: d.sex, phone: d.phone.trim() || null, health_card_number: d.healthCardNumber.trim() || null,
    patient_data_source: d.patientDataSource, identity_status: d.identityStatus.trim() || null,
    updated_at: new Date().toISOString(),
    ...(typeof d.email === 'string' ? { email: d.email.trim() || null } : {}),
  }
  let patient
  if (selectedPatientId) {
    patient = unwrap(await query('正在讀取病患資料', () => db.from('patients').select('*').eq('id', selectedPatientId).is('deleted_at', null).single()))
  } else if (matches[0]) {
    patient = unwrap(await query('正在儲存病患資料', () => db.from('patients').update(payload).eq('id', matches[0].id).select().single()))
  } else {
    // A deterministic opaque patient code prevents duplicate inserts on concurrent submissions.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nationalId))
    const code = 'PT-' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
    const result = await query('正在建立病患', () => db.from('patients').insert({ ...payload, patient_code: code, created_by: uid }).select().single())
    if (result.error?.code === '23505') {
      if (createOnly) throw new Error('此識別碼已有病患資料（可能已刪除），請搜尋既有病患或請管理者確認。')
      patient = unwrap(await query('正在確認病患', () => db.from('patients').select('*').eq('patient_code', code).is('deleted_at', null).single()))
    } else patient = unwrap(result)
  }
  operation.patientId = patient.id
  const examination = unwrap(await query('正在儲存本次檢測', () => db.rpc('ensure_examination', {
    p_id: operation.examinationId, p_patient_id: patient.id, p_include_motility: specimen.includeMotility,
    p_template_label: specimen.templateLabel,
  }).single()))
  const record = {
    id: operation.recordId, examination_id: examination.id, sample_id: examination.sample_id,
    exam_date: localDate(), clinical_status: '示範資料', processing_state: file ? '影像待上傳' : '待複核',
    ...generateDemoAnalysis(operation.recordId, specimen.includeMotility),
    boxes: mockResult.boxes, created_by: uid, updated_at: new Date().toISOString(),
  }
  // Save a recoverable record first; retries reuse these IDs and never delete partial work.
  unwrap(await query('正在儲存檢測紀錄', () => db.from('analysis_records').upsert(record, { onConflict: 'id' }).select('id').single()))
  if (file) {
    const path = `${uid}/${examination.id}/${record.id}.${media.extension}`
    unwrap(await query('正在準備檔案上傳', () => db.from('exam_media').upsert({
      id: record.id, analysis_record_id: record.id, media_kind: media.kind,
      bucket_id: media.bucket, object_path: path, original_filename: file.name,
      mime_type: media.mimeType, size_bytes: file.size, upload_status: 'pending', created_by: uid,
    }, { onConflict: 'analysis_record_id' }).select('id').single()))
    if (operation.imagePath !== path || operation.uploadedFile !== file) {
      onStatus('正在上傳檔案')
      unwrap(await uploadMediaFile({ file, bucket: media.bucket, path, mimeType: media.mimeType, operation, signal, onProgress }))
      operation.imagePath = path
      operation.uploadedFile = file
    }
    unwrap(await query('檔案已傳完，正在確認儲存', () => db.from('exam_media').update({ upload_status: 'ready' }).eq('analysis_record_id', record.id).select('id').single()))
    unwrap(await query('正在完成檢測紀錄', () => db.from('analysis_records').update({ original_image_path: isVideo ? null : path,
      processing_state: '待複核', updated_at: new Date().toISOString() }).eq('id', record.id).select('id').single()))
  }
  return { patient: { patientId: patient.id, patientName: patient.patient_name }, examination: { examinationId: examination.id, sampleId: examination.sample_id }, recordId: record.id }
}
function percentage(value) {
  if (value === null || value === undefined || value === '') return '—'
  return `${String(value).replace(/%$/, '')}%`
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
    updatedAt: row.updated_at, date: row.exam_date, status: row.clinical_status || '未判讀', processingState: row.processing_state,
    density: row.density ?? '—', motility: percentage(row.motility), morphology: percentage(row.morphology),
    score: row.density ?? '—', summary: row.summary ?? '', aiResult: row.ai_result || {},
    media: row.exam_media ?? null,
    isDemo: row.ai_result?.isDemo === true, boxes: row.boxes || [], imagePath: row.original_image_path, analyzedImagePath: row.analyzed_image_path,
    measurements: { amount: row.amount ?? null, amountUnit: row.amount_unit ?? null, color: row.color ?? null,
      appearance: row.appearance ?? null, ph: row.ph ?? null, morphology: row.morphology ?? null, motility: row.motility ?? null,
      countOfSpermatozoa: row.count_of_spermatozoa ?? null, countUnit: row.count_unit ?? null,
      countDefinition: row.count_definition ?? null, density: row.density ?? null, densityUnit: row.density_unit ?? null,
      motilityType: row.motility_type ?? null },
    patient: { birthDate: p.birth_date, updatedAt: p.updated_at, healthCardNumber: p.health_card_number || '', identityStatus: p.identity_status || '', patientDataSource: p.patient_data_source, rawSex: p.sex, id: p.id, identity: maskNationalId(p.national_id || ''), nationalId: p.national_id || '', code: p.patient_code, name: p.patient_name, email: p.email ?? '', sex: { M: '男', F: '女', UNKNOWN: '未知' }[p.sex], age, phone: p.phone || '—', doctor: '—', note: p.patient_notes?.note || '' },
  }
}
export async function getCloudHistory() {
  const rows = []
  // PostgREST caps each response; page explicitly to avoid silently dropping older records.
  for (let offset = 0; ; offset += 500) {
    const batch = unwrap(await client().from('analysis_records').select('*, exam_media(*), examinations!inner(*, patients!inner(*, patient_notes(note)))').is('deleted_at', null).is('examinations.patients.deleted_at', null).order('created_at', { ascending: false }).order('id').range(offset, offset + 499))
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

export async function signedMedia(bucket, path) {
  if (!['exam-images', 'exam-videos'].includes(bucket)) throw new Error('不支援的媒體儲存空間。')
  return unwrap(await client().storage.from(bucket).createSignedUrl(path, 300)).signedUrl
}

export async function manageCloudRecord(record, patch, deleting = false) {
  if (deleting) return permanentlyDelete('record', record)
  const { error } = await client().rpc('manage_analysis_record', {
    p_id: record.id, p_expected_updated_at: record.updatedAt, p_patch: patch, p_delete: deleting,
  })
  if (error?.code === 'PGRST202') throw new Error('請先在 Supabase 執行 202610200004_record_management.sql。')
  if (error) throw new Error('儲存失敗，紀錄可能已被其他人修改或刪除。請重新整理後再試。')
}

export async function reserveSpecimenNumber(examinationId) {
  const { data, error } = await withDeadline(signal => client().rpc('reserve_specimen_number', { p_id: examinationId }).abortSignal(signal), { label: '產生檢體編號' })
  if (error?.code === 'PGRST202') throw new Error('請先執行 202610200007_reserve_specimen.sql，再重新產生檢體編號。')
  if (error || typeof data !== 'string' || !data) throw new Error('無法產生檢體編號，請重試。')
  return data
}
