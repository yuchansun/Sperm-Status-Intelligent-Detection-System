import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {ResultEmail} from './ResultEmail.jsx'
import {isEmailJsConfigured,sendHistoryEmail} from '../../services/emailService.js'
vi.mock('../../context/language.js',()=>({useLanguage:()=>({t:{sendEducation:'寄送結果與衛教',sendEmail:'寄送 Email',emailAddress:'Email 地址'}})}))
vi.mock('../../services/emailService.js',()=>({isEmailJsConfigured:vi.fn(),sendHistoryEmail:vi.fn()}))
globalThis.IS_REACT_ACT_ENVIRONMENT=true
let root,container
const record={id:'r',date:'2026-10-20',sampleId:'SMP-12',density:42,motility:'32%',morphology:'6%',isDemo:true,patient:{name:'病患',email:'saved@example.com'}}
function render(value){act(()=>root.render(React.createElement(ResultEmail,{record:value})))}
async function submit(){await act(async()=>container.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})))}
beforeEach(()=>{vi.clearAllMocks();isEmailJsConfigured.mockReturnValue(true);sendHistoryEmail.mockResolvedValue({status:200});container=document.createElement('div');root=createRoot(container)})
afterEach(()=>act(()=>root.unmount()))
it('uses the saved patient email without an input and sends only after a click',async()=>{
 render(record)
 expect(container.querySelector('input')).toBeNull()
 expect(container.textContent).toContain('saved@example.com')
 expect(container.textContent).not.toContain('避免高溫環境')
 expect(sendHistoryEmail).not.toHaveBeenCalled()
 await submit()
 expect(sendHistoryEmail).not.toHaveBeenCalled()
 await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === '確認寄出').click())
 expect(sendHistoryEmail).toHaveBeenCalledWith(expect.objectContaining({recipient:'saved@example.com',recipientName:'病患',body:expect.stringContaining('濃度：42 million/mL')}))
 expect(container.querySelector('[role="status"]').textContent).toContain('已提交寄送')
})
it('asks for an email only if the patient has none',async()=>{
 render({...record,patient:{name:'病患',email:''}})
 const input=container.querySelector('input[type="email"]')
 expect(input.value).toBe('')
 const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set
 act(()=>{setter.call(input,'entered@example.com');input.dispatchEvent(new Event('input',{bubbles:true}))})
 await submit()
 await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === '確認寄出').click())
 expect(sendHistoryEmail).toHaveBeenCalledWith(expect.objectContaining({recipient:'entered@example.com'}))
})
it('blocks duplicate submission while a message is in flight',async()=>{
 let finish
 sendHistoryEmail.mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
 render(record)
 await submit()
 act(() => [...container.querySelectorAll('button')].find(button => button.textContent === '確認寄出').click())
 expect(container.querySelector('button').disabled).toBe(true)
 await submit()
 expect(sendHistoryEmail).toHaveBeenCalledOnce()
 await act(async()=>finish({status:200}))
})
it('reports missing configuration or provider failure without claiming success',async()=>{
 render(record)
 isEmailJsConfigured.mockReturnValue(false)
 await submit()
 await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === '確認寄出').click())
 expect(sendHistoryEmail).not.toHaveBeenCalled()
 expect(container.querySelector('[role="alert"]').textContent).toContain('尚未設定 EmailJS')
 isEmailJsConfigured.mockReturnValue(true);sendHistoryEmail.mockRejectedValue(new Error('offline'))
 await submit()
 await act(async () => [...container.querySelectorAll('button')].find(button => button.textContent === '確認寄出').click())
 expect(container.querySelector('[role="alert"]').textContent).toContain('寄送失敗')
 expect(container.querySelector('[role="status"]')).toBeNull()
})
