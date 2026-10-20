import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const { instances, session } = vi.hoisted(() => ({ instances: [], session: vi.fn() }))
vi.mock('./supabase.js', () => ({ supabaseUrl: 'https://example.supabase.co', supabase: { auth: { getSession: session } } }))
vi.mock('tus-js-client', () => ({ Upload: class {
 constructor(file, options) {
  this.file = file; this.options = options; this.url = options.uploadUrl || null
  this.abort = vi.fn(() => Promise.resolve())
  this.start = vi.fn(() => { this.url ||= 'https://example.storage.supabase.co/storage/v1/upload/resumable/test'; options.onUploadUrlAvailable?.() })
  instances.push(this)
 }
} }))
import { uploadMediaFile, resumableEndpoint } from './uploadMedia.js'
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
const params = operation => ({ file: new File(['test'], 'clip.mp4', {type:'video/mp4'}), bucket:'exam-videos',path:'staff/exam/clip.mp4',mimeType:'video/mp4',operation })
beforeEach(() => {
 vi.useFakeTimers();vi.clearAllMocks();instances.length = 0
 session.mockResolvedValue({data:{session:{access_token:'test-session-token'}},error:null})
})
afterEach(() => vi.useRealTimers())
describe('private resumable media transfer', () => {
 it('uses direct Storage hostname and 6 MiB chunks, and reports actual transferred bytes', async () => {
  const progress = vi.fn(), operation = {}
  const result = uploadMediaFile({...params(operation),onProgress:progress})
  await flush()
  const u=instances[0]
  expect(u.options.endpoint).toBe('https://example.storage.supabase.co/storage/v1/upload/resumable')
  expect(u.options.chunkSize).toBe(6*1024*1024)
  expect(u.options.storeFingerprintForResuming).toBe(false)
  u.options.onProgress(2,4)
  expect(progress).toHaveBeenLastCalledWith({loaded:2,total:4,percent:50})
  u.options.onSuccess()
  await expect(result).resolves.toMatchObject({error:null})
  expect(progress).toHaveBeenLastCalledWith({loaded:4,total:4,percent:100})
  expect(operation.resumable).toBeUndefined()
 })
 it('cancels without deletion, preserving the upload URL for same-page retry', async () => {
  const operation={},controller=new AbortController(),p=params(operation)
  const result=uploadMediaFile({...p,signal:controller.signal})
  const rejected=expect(result).rejects.toMatchObject({name:'AbortError'})
  await flush();controller.abort();await rejected
  expect(instances[0].abort).toHaveBeenCalledWith(false)
  const url=operation.resumable.url
  const retry=uploadMediaFile(p)
  await flush()
  expect(instances[1].options.uploadUrl).toBe(url)
  expect(instances[1].options.metadata.objectName).toBe(p.path)
  instances[1].options.onSuccess();await retry
 })
 it('stops a transfer stalled for 90 seconds, and allows retry instead of spinning forever', async () => {
  const result=uploadMediaFile(params({}))
  const rejected=expect(result).rejects.toThrow('90 秒沒有進度')
  await flush();await vi.advanceTimersByTimeAsync(90001);await rejected
  expect(instances[0].abort).toHaveBeenCalledWith(false)
 })
 it('keeps an actively progressing slow transfer alive', async () => {
  const result=uploadMediaFile(params({}));await flush()
  await vi.advanceTimersByTimeAsync(80000);instances[0].options.onProgress(1,4)
  await vi.advanceTimersByTimeAsync(80000);instances[0].options.onProgress(2,4)
  expect(instances[0].abort).not.toHaveBeenCalled()
  instances[0].options.onSuccess();await result
 })
 it('bounds session lookup before starting any upload', async () => {
  session.mockReturnValue(new Promise(()=>{}))
  const result=uploadMediaFile(params({}))
  const rejected=expect(result).rejects.toThrow('30 秒')
  await vi.advanceTimersByTimeAsync(30001);await rejected
  expect(instances).toHaveLength(0)
 })
 it('does not retain an expired resumable URL', async () => {
  const operation={},result=uploadMediaFile(params(operation))
  const rejected=expect(result).rejects.toThrow('HTTP 410')
  await flush();instances[0].options.onError({originalResponse:{getStatus:()=>410}});await rejected
  expect(operation.resumable).toBeUndefined()
 })
 it('preserves custom hostnames', () => {
  expect(resumableEndpoint('https://storage.example.test')).toBe('https://storage.example.test/storage/v1/upload/resumable')
 })
})
