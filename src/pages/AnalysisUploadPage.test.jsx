import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalysisUploadPage } from './AnalysisUploadPage.jsx'
import { newSubmission, submitDemoExamination, reserveSpecimenNumber } from '../services/cloudApi.js'
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('../context/language.js', () => ({ useLanguage: () => ({ t: {} }) }))
vi.mock('../context/examinationSession.js', () => ({ useExaminationSession: () => ({ setActiveExamination: vi.fn() }) }))
vi.mock('../services/cloudApi.js', () => ({ newSubmission: vi.fn(), submitDemoExamination: vi.fn(), reserveSpecimenNumber: vi.fn() }))
vi.mock('../components/analysis/PatientSelector.jsx', () => ({
 PatientSelector: ({ onConfirm }) => React.createElement('button', { onClick: () => onConfirm({kind:'existing',patientId:'patient',draft:{patientName:'測試病患',nationalId:'TEST-001',birthDate:'1990-01-01',sex:'M',phone:'',healthCardNumber:'',identityStatus:'',patientDataSource:'manual'}}) }, '確認測試病患'),
}))
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container
beforeEach(async () => {
 vi.clearAllMocks()
 reserveSpecimenNumber.mockResolvedValue('SMP-00000042')
 newSubmission.mockReturnValue({examinationId:'exam-id',recordId:'record-id',patientId:'patient'})
 vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn(()=>'blob:test-video'), revokeObjectURL: vi.fn() }))
 container=document.createElement('div');document.body.appendChild(container);root=createRoot(container)
 act(()=>root.render(React.createElement(AnalysisUploadPage)))
 await act(async()=>container.querySelector('button').click())
})
afterEach(()=>{act(()=>root?.unmount());container?.remove();vi.unstubAllGlobals()})
describe('unified media picker',()=>{
 it('displays the reserved specimen serial as text before analysis', () => {
  expect(container.querySelector('.specimen-number-display').textContent).toContain('SMP-00000042')
  expect(container.querySelector('.specimen-number-display input')).toBeNull()
  expect(reserveSpecimenNumber).toHaveBeenCalledWith('exam-id')
  expect(submitDemoExamination).not.toHaveBeenCalled()
 })
 it('allows video through the primary photo/video picker and offers demo analysis without uploading on selection',()=>{
  const picker=container.querySelector('input[type="file"]:not([capture])')
  expect(picker.accept).toContain('video/*')
  expect(picker.accept).toContain('.mov')
  expect(picker.multiple).toBe(false)
  const file=new File(['video'], 'test.mov', {type:'video/quicktime'})
  Object.defineProperty(picker,'files',{value:[file],configurable:true})
  act(()=>picker.dispatchEvent(new Event('change',{bubbles:true})))
  expect(container.querySelector('video').getAttribute('src')).toBe('blob:test-video')
  expect(container.textContent).toContain('test.mov')
  expect(container.textContent).toContain('開始分析')
  expect(submitDemoExamination).not.toHaveBeenCalled()
 })
 it('cancels a pending upload and reuses the same submission on retry', async () => {
  let args
  submitDemoExamination.mockImplementationOnce(options => {
   args=options
   options.onStatus('正在上傳檔案')
   options.onProgress({loaded:6000000,total:24000000,percent:25})
   return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>{
    const error=new Error('已取消本次操作');error.name='AbortError';reject(error)
   },{once:true}))
  })
  await act(async()=>container.querySelector('.full-width').click())
  expect(container.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')).toBe('25')
  await act(async()=>[...container.querySelectorAll('button')].find(b=>b.textContent==='取消，保留資料以便重試').click())
  expect(args.signal.aborted).toBe(true)
  expect(container.querySelector('[role="dialog"]')).toBeNull()
  expect(container.textContent).toContain('已取消本次操作')
  const operation=args.operation
  submitDemoExamination.mockResolvedValueOnce({examination:{examinationId:'exam-id'},patient:{patientId:'patient'},recordId:'record-id'})
  await act(async()=>container.querySelector('.full-width').click())
  expect(newSubmission).toHaveBeenCalledTimes(1)
  expect(submitDemoExamination.mock.calls[1][0].operation).toBe(operation)
 })
 it('keeps camera capture separate from the main file picker',()=>{
  const pickers=container.querySelectorAll('input[type="file"]')
  expect(pickers).toHaveLength(2)
  expect(pickers[0].hasAttribute('capture')).toBe(false)
  expect(pickers[1].getAttribute('capture')).toBe('environment')
  expect(pickers[1].accept).not.toContain('video')
 })
})
