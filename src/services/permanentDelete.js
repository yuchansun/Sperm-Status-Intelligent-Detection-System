import { supabase, supabaseConfigError } from './supabase.js'

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  if (error?.code === 'PGRST202') throw new Error('請先在 Supabase 執行 202610200006_permanent_delete.sql，再重試。')
  if (error) throw new Error('刪除尚未完成，資料可能已變更。請保留此頁重試；若仍失敗請重新整理已刪除項目。')
  return data
}
export async function permanentlyDelete(kind, target) {
  if (!supabase) throw new Error(supabaseConfigError)
  const job = await rpc('prepare_permanent_delete', { p_kind: kind, p_id: target.id, p_expected_updated_at: target.updatedAt })
  if (job.completed) return
  // Delete actual bytes via Storage API; never delete storage.objects with SQL.
  for (const bucket of ['exam-images', 'exam-videos', 'reports']) {
    const paths = job.files.filter(file => file.bucket === bucket).map(file => file.path)
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await supabase.storage.from(bucket).remove(paths.slice(index, index + 100))
      if (error) throw new Error('雲端檔案尚未完全刪除。請在本頁重試，會接續清理；資料庫紀錄暫時保留。')
    }
  }
  const done = await rpc('finish_permanent_delete', { p_job_id: job.id })
  if (done !== true) throw new Error('刪除尚未確認完成，請重試。')
}
export async function getDeletedItems() {
  if (!supabase) throw new Error(supabaseConfigError)
  return rpc('list_deleted_items', {})
}
