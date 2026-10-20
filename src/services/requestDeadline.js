export function cancellationError() {
  const error = new Error('已取消本次操作；已保存的資料不會刪除，可在本頁重試。')
  error.name = 'AbortError'
  return error
}
// Also guards calls (such as auth reads) that do not expose an AbortSignal.
export async function withDeadline(work, { signal, timeoutMs = 30000, label = '連線' } = {}) {
  if (signal?.aborted) throw cancellationError()
  const controller = new AbortController()
  let timer, rejectAbort
  const abortPromise = new Promise((_, reject) => { rejectAbort = reject })
  const cancel = () => { controller.abort(); rejectAbort(cancellationError()) }
  signal?.addEventListener('abort', cancel, { once: true })
  timer = setTimeout(() => {
    controller.abort()
    const error = new Error(`${label}超過 ${Math.round(timeoutMs / 1000)} 秒未完成，請檢查連線並在本頁重試。`)
    error.name = 'TimeoutError'
    rejectAbort(error)
  }, timeoutMs)
  try { return await Promise.race([Promise.resolve().then(() => work(controller.signal)), abortPromise]) }
  finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel) }
}
