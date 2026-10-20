import { Upload } from 'tus-js-client'
import { supabase, supabaseUrl } from './supabase.js'
import { cancellationError, withDeadline } from './requestDeadline.js'

export function resumableEndpoint(projectUrl) {
  const url = new URL(projectUrl)
  url.hostname = url.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co')
  return new URL('/storage/v1/upload/resumable', url).href
}
export async function uploadMediaFile({ file, bucket, path, mimeType, operation, signal, onProgress = () => {} }) {
  const result = await withDeadline(() => supabase.auth.getSession(), { signal, label: '取得上傳登入資訊' })
  if (result.error || !result.data.session?.access_token) throw new Error('登入已失效，請重新登入後再試。')
  if (signal?.aborted) throw cancellationError()
  const token = result.data.session.access_token
  return new Promise((resolve, reject) => {
    let settled = false, watchdog, overall, upload
    let lastBytes = -1
    const clean = () => { clearTimeout(watchdog); clearTimeout(overall); signal?.removeEventListener('abort', cancel) }
    const fail = error => {
      if (settled) return
      settled = true; clean()
      // false pauses this upload; never deletes a cloud object.
      Promise.resolve(upload?.abort(false)).catch(() => {})
      reject(error)
    }
    const cancel = () => fail(cancellationError())
    const armWatchdog = () => {
      if (settled) return
      clearTimeout(watchdog)
      watchdog = setTimeout(() => fail(new Error('上傳已超過 90 秒沒有進度。請確認網路並在本頁重試續傳。')), 90000)
    }
    const resume = operation.resumable?.path === path && operation.resumable.file === file
      ? operation.resumable.url : null
    upload = new Upload(file, {
      endpoint: resumableEndpoint(supabaseUrl), uploadUrl: resume,
      headers: { authorization: `Bearer ${token}`, 'x-upsert': 'true' },
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      storeFingerprintForResuming: false,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: { bucketName: bucket, objectName: path, contentType: mimeType, cacheControl: '3600' },
      onUploadUrlAvailable: () => { operation.resumable = { path, file, url: upload.url }; armWatchdog() },
      onProgress: (loaded, total) => {
        if (settled) return
        if (loaded !== lastBytes) { lastBytes = loaded; armWatchdog() }
        onProgress({ loaded, total, percent: total ? Math.floor(loaded / total * 100) : 0 })
      },
      onChunkComplete: () => armWatchdog(),
      onShouldRetry: error => {
        const status = error.originalResponse?.getStatus()
        return !signal?.aborted && (!status || status === 408 || status === 409 || status === 429 || status >= 500)
      },
      onError: error => {
        const status = error.originalResponse?.getStatus()
        if (status === 404 || status === 410) delete operation.resumable
        const message = status === 413 ? '超過 Supabase 檔案限制，請確認全域與影片 bucket 均允許 50 MB。'
          : status === 401 || status === 403 ? '影片上傳權限或登入已失效，請確認登入與 Storage 權限。'
          : `檔案上傳失敗${status ? `（HTTP ${status}）` : ''}，請在本頁重試續傳。`
        fail(new Error(message))
      },
      onSuccess: () => {
        if (settled) return
        settled = true; clean()
        delete operation.resumable
        onProgress({ loaded: file.size, total: file.size, percent: 100 })
        resolve({ data: { path }, error: null })
      },
    })
    signal?.addEventListener('abort', cancel, { once: true })
    if (signal?.aborted) { cancel(); return }
    armWatchdog()
    overall = setTimeout(() => fail(new Error('上傳已達 30 分鐘，請檢查連線並在本頁重試續傳。')), 30 * 60 * 1000)
    onProgress({ loaded: 0, total: file.size, percent: 0 })
    try { upload.start() } catch { fail(new Error('無法開始上傳，請確認瀏覽器及網路後重試。')) }
  })
}
