// Schema v2 helpers for the report/email UI. Queueing is not provider delivery.
import { supabase, supabaseConfigError } from './supabase.js'
function db() {
  if (!supabase) throw new Error(supabaseConfigError)
  return supabase
}
function unwrap({ data, error }) {
  if (error) throw new Error(`儲存失敗：${error.message || error.code}。請確認資料庫已更新，或重新載入最新版本。`)
  return data
}
export async function saveReportVersion({ analysisRecordId, expectedVersion = 0, title, summary = '', conclusion = '', recommendations = '', language = 'zh', changeNote = '' }) {
  return unwrap(await db().rpc('save_report_version', {
    p_analysis_record_id: analysisRecordId, p_expected_version: expectedVersion,
    p_title: title, p_summary: summary, p_conclusion: conclusion,
    p_recommendations: recommendations, p_language: language, p_change_note: changeNote,
  }))
}
export async function getReportVersions(analysisRecordId) {
  const report = unwrap(await db().from('reports').select('id').eq('analysis_record_id', analysisRecordId).maybeSingle())
  if (!report) return []
  return unwrap(await db().from('report_versions').select('*').eq('report_id', report.id).order('version', { ascending: false }))
}
export async function saveEmailDraft({ id, revision, patientId, reportVersionId = null, toEmail, subject, body, language = 'zh' }) {
  const payload = { patient_id: patientId, report_version_id: reportVersionId, to_email: toEmail.trim(), subject, body, language }
  if (id) {
    if (!Number.isInteger(revision) || revision < 1) throw new Error('請先讀取 Email 草稿的最新版本。')
    return unwrap(await db().from('email_drafts').update(payload).eq('id', id).eq('revision', revision).select().single())
  }
  return unwrap(await db().from('email_drafts').insert(payload).select().single())
}
export async function queueEmailDelivery({ draftId, revision, idempotencyKey, attachReport = false }) {
  if (!idempotencyKey) throw new Error('請為本次寄送建立固定的請求識別碼，重試時沿用。')
  return unwrap(await db().rpc('queue_email_delivery', {
    p_draft_id: draftId, p_expected_revision: revision,
    p_idempotency_key: idempotencyKey, p_attach_report: attachReport,
  }))
}
export async function getEmailDeliveries(patientId) {
  return unwrap(await db().from('email_deliveries').select('*').eq('patient_id', patientId).order('requested_at', { ascending: false }))
}
