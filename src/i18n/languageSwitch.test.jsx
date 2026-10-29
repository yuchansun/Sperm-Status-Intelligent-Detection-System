// eslint-disable-next-line no-unused-vars
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {afterEach,expect,it,vi} from 'vitest'
import {LanguageProvider} from '../context/LanguageContext.jsx'
import {useLanguage} from '../context/language.js'
import {RecordActions} from '../components/analysis/RecordActions.jsx'
import {ResultEmail} from '../components/analysis/ResultEmail.jsx'
vi.mock('../services/emailService.js',()=>({isEmailJsConfigured:vi.fn(),sendHistoryEmail:vi.fn()}))
globalThis.IS_REACT_ACT_ENVIRONMENT=true
afterEach(()=>localStorage.removeItem('sperm-ai-language'))
const record={id:'r',sampleId:'SMP-1',date:'2026-10-20',patient:{name:'PATIENT',email:'patient@example.com'},measurements:{density:42,motility:32,morphology:6}}
function Preview(){const {setLanguage}=useLanguage();return <><button onClick={()=>setLanguage('en')}>EN</button><button onClick={()=>setLanguage('ko')}>KO</button><RecordActions record={record} onSaved={()=>{}}/><ResultEmail record={record}/></>}
it('switches newly added controls and an open edit form between English and Korean',()=>{
 localStorage.removeItem('sperm-ai-language')
 const container=document.createElement('div'),root=createRoot(container)
 const button=label=>[...container.querySelectorAll('button')].find(b=>b.textContent===label)
 try{
  act(()=>root.render(<LanguageProvider><Preview/></LanguageProvider>))
  act(()=>button('EN').click())
  expect(button('Edit examination')).toBeDefined()
  act(()=>button('Edit examination').click())
  expect(container.textContent).toContain('Sperm concentration (million/mL)')
  expect(container.textContent).toContain('Send results and patient education')
  act(()=>button('Edit email content').click())
  expect(container.querySelector('.email-preview').textContent).toContain('Examination results')
  expect(/\p{Script=Han}/u.test(container.textContent)).toBe(false)
  act(()=>button('KO').click())
  expect(button('검사 수정')).toBeDefined()
  expect(container.textContent).toContain('정자 농도(million/mL)')
  expect(container.textContent).toContain('검사 결과 및 건강 교육 보내기')
  expect(container.querySelector('.email-preview').textContent).toContain('검사 결과')
  expect(container.querySelector('.email-preview').textContent).not.toContain('Examination results')
  expect(/\p{Script=Han}/u.test(container.textContent)).toBe(false)
  expect(container.querySelector('input[type="number"]').value).toBe('42')
 }finally{act(()=>root.unmount())}
})
