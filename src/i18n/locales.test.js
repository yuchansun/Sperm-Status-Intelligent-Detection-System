import { afterEach, expect, it } from 'vitest'
import { translations } from '../context/language.js'
import messages from './messages.json'
import { translateText as tr, displayRecordSummary } from './translate.js'
import { buildResultEmail, buildHistoryEmail } from './reportText.js'
const han=/\p{Script=Han}/u
afterEach(()=>localStorage.removeItem('sperm-ai-language'))
it('provides every locale key in all three supported languages',()=>{
 const keys=new Set(Object.values(translations).flatMap(locale=>Object.keys(locale)))
 for(const language of ['zh','en','ko'])for(const key of keys)expect(translations[language][key],`${language}.${key}`).toBeDefined()
 for(const language of ['en','ko'])expect(han.test(JSON.stringify(translations[language])),language).toBe(false)
})
it('provides English and Korean for every supplemental message and preserves placeholder slots',()=>{
 for(const [source,values] of Object.entries(messages))for(const language of ['en','ko']){
  expect(values[language],source).toBeTruthy()
  expect(han.test(values[language]),source).toBe(false)
  const slots=s=>[...s.matchAll(/\{\{\d+\}\}/g)].map(m=>m[0]).sort()
  expect(slots(values[language]),source).toEqual(slots(source))
 }
})
it('translates dynamic service errors without dropping codes or measured values',()=>{
 localStorage.setItem('sperm-ai-language','ko')
 expect(tr('資料操作失敗（PGRST202），請確認權限、資料內容與網路後重試。')).toContain('PGRST202')
 expect(han.test(tr('資料操作失敗（PGRST202），請確認權限、資料內容與網路後重試。'))).toBe(false)
 expect(tr('濃度 {{0}} million/mL · 活動力 {{1}} · 正常型態 {{2}}',[42,'32%','6%'])).toContain('42 million/mL')
})
it('uses consistent units and localized terms in reports and emails while preserving patient text',()=>{
 const patient={name:'USER_NAME',age:30,phone:'0912345678',note:'備註原文'}
 const record={sampleId:'SMP-123',date:'2026-10-20',density:42,motility:'32%',morphology:'6%',processingState:'待複核',isDemo:true,summary:'濃度 42 M/mL，正常型態 6%。',aiResult:{generatorVersion:1,precision:'95%',confidence:'90%',processingTime:'1s'},patient}
 for(const language of ['en','ko']){
  const result=buildResultEmail(record,language)
  expect(han.test(result.body)).toBe(false)
  expect(result.body).toContain('42 million/mL')
  const history=buildHistoryEmail(patient,[{...record,patient:{...patient,note:'USER_NOTE'}}],language)
  expect(han.test(history.body)).toBe(false)
  expect(history.body).toContain('USER_NOTE')
  expect(history.body).toContain('42 ×10⁶/mL')
 }
 expect(displayRecordSummary({...record,summary:'人工修改摘要',aiResult:{manuallyEdited:true}},'en')).toBe('人工修改摘要')
 expect(buildHistoryEmail(patient,[record],'ko').body).toContain('備註原文')
})
