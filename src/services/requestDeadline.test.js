import { afterEach, describe, expect, it, vi } from 'vitest'
import { withDeadline } from './requestDeadline.js'
afterEach(()=>vi.useRealTimers())
describe('bounded data requests',()=>{
 it('rejects and aborts a hanging request after its deadline',async()=>{
  vi.useFakeTimers();let signal
  const request=withDeadline(s=>{signal=s;return new Promise(()=>{})},{timeoutMs:30000,label:'正在儲存本次檢測'})
  const rejected=expect(request).rejects.toThrow('正在儲存本次檢測超過 30 秒')
  await vi.advanceTimersByTimeAsync(30001);await rejected
  expect(signal.aborted).toBe(true)
 })
 it('never begins an already canceled request',async()=>{
  const controller=new AbortController();controller.abort();const work=vi.fn()
  await expect(withDeadline(work,{signal:controller.signal})).rejects.toMatchObject({name:'AbortError'})
  expect(work).not.toHaveBeenCalled()
 })
})
