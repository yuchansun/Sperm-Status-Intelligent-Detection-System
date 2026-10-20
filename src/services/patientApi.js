import { permanentlyDelete } from './permanentDelete.js'
import { supabase, supabaseConfigError } from './supabase.js'
import { mapRecord } from './cloudApi.js'
function db() { if (!supabase) throw new Error(supabaseConfigError); return supabase }
function unwrap({ data, error }) {
  if (error?.code === '42703' || error?.code === 'PGRST204') throw new Error('病患管理欄位尚未更新，請先執行 202610200005_patient_management.sql，再重試。')
  if (error) throw new Error('無法讀取病患資料，請確認登入、連線及查詢權限後重試。')
  return data
}
export function patientToDraft(p) {
  return { patientName: p.patient_name, nationalId: p.national_id, birthDate: p.birth_date,
    sex: p.sex, phone: p.phone || '', email: p.email || '', healthCardNumber: p.health_card_number || '',
    identityStatus: p.identity_status || '', patientDataSource: p.patient_data_source }
}
export async function searchPatients(term, offset = 0) {
  const clean = term.trim().replace(/[^\p{L}\p{N}\s@.-]/gu, '').slice(0, 80)
  if (clean.length < 2) throw new Error('請輸入至少兩個字搜尋姓名、病患代碼或身分證／病歷識別碼。')
  const rows = unwrap(await db().from('patients').select('id,patient_code,patient_name,national_id,birth_date')
    .or(`patient_name.ilike.*${clean}*,patient_code.ilike.*${clean}*,national_id.ilike.*${clean}*`)
    .is('deleted_at', null).order('patient_name').order('id').range(offset, offset + 19))
  return rows
}
export async function getPatientPreview(id) {
  const patient = unwrap(await db().from('patients').select('*, patient_notes(note)').eq('id', id).is('deleted_at', null).single())
  const history = unwrap(await db().from('analysis_records')
    .select('*, examinations!inner(*, patients!inner(*, patient_notes(note)))')
    .eq('examinations.patient_id', id).is('deleted_at', null).order('created_at', { ascending: false }).order('id').limit(6))
  return { patient, history: history.slice(0, 5).map(mapRecord), hasMore: history.length > 5 }
}

// Exact identity lookup: fuzzy search must never choose a patient for a card scan.
export async function findPatientByNationalId(nationalId) {
  const identity = nationalId.trim().toUpperCase()
  if (!identity) throw new Error('健保卡缺少身分證字號，請重新讀卡。')
  const rows = unwrap(await db().from('patients').select('id').eq('national_id', identity).is('deleted_at', null).limit(2))
  if (rows.length > 1) throw new Error('此身分證字號有多筆病患資料，請由管理者確認。')
  return rows[0] || null
}

export async function getPatient(id) {
  return unwrap(await db().from('patients').select('*, patient_notes(note)').eq('id', id).is('deleted_at', null).single())
}
export async function managePatient(patient, patch, deleting = false) {
  if (deleting) return permanentlyDelete('patient', patient)
  const { error } = await db().rpc('manage_patient', { p_id: patient.id, p_expected_updated_at: patient.updatedAt, p_patch: patch, p_delete: deleting })
  if (error?.code === 'PGRST202') throw new Error('請先在 Supabase 執行 202610200005_patient_management.sql。')
  if (error?.code === '23505') throw new Error('此身分證／病歷識別碼已有其他病患使用，請確認後再試。')
  if (error) throw new Error('儲存失敗，資料可能已被修改或刪除，請重新整理後再試。')
}
