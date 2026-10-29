import { translateText as tr } from '../../i18n/translate.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { manageCloudRecord } from '../../services/cloudApi.js'

const fields = [
 ['density', '濃度（million/mL）'], ['motility', '活動力（%）'], ['morphology', '正常型態（%）'],
 ['amount', '精液量（mL）'], ['ph', 'pH'], ['count_of_spermatozoa', '總精蟲數（沿用原紀錄單位）'],
]
function initial(record) {
 const m=record.measurements || {}
 return { exam_date:record.date, summary:record.summary || '', density:m.density ?? '', motility:m.motility ?? '',
  morphology:m.morphology ?? '', amount:m.amount ?? '', ph:m.ph ?? '', color:m.color ?? '', appearance:m.appearance ?? '', count_of_spermatozoa:m.countOfSpermatozoa ?? '' }
}
export function RecordActions({ record, onSaved, onDeleted = onSaved, header, compact = false }) {
 const [mode,setMode]=useState('')
 const [draft,setDraft]=useState({})
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const open=next=>{setDraft(initial(record));setError('');setMode(next)}
 const save=async event=>{
  event.preventDefault();setError('');setBusy(true)
  try {
   const patch={...draft}
   for(const [key] of fields) {
    patch[key]=draft[key]==='' ? null : Number(draft[key])
    if(patch[key]!==null && (!Number.isFinite(patch[key]) || patch[key]<0)) throw new Error(tr("數值必須為零或正數。"))
   }
   if([patch.motility,patch.morphology].some(v=>v!==null&&v>100)||patch.ph>14) throw new Error(tr("百分比須介於 0–100，pH 須介於 0–14。"))
   if(!patch.exam_date) throw new Error(tr("請填寫檢測日期。"))
   await manageCloudRecord(record,patch)
   setMode('');onSaved()
  } catch(e){setError(e.message)} finally{setBusy(false)}
 }
 const remove=async()=>{
  setBusy(true);setError('')
  try{await manageCloudRecord(record,{},true);setMode('');onDeleted()}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <div className="record-actions">
  <div className={header ? 'patient-record-heading' : 'header-actions'}>
   {header}
   <div className={compact ? 'record-icon-actions' : 'header-actions'}>
    <button className={compact ? 'record-icon-btn' : 'secondary-btn small'} type="button" disabled={busy} aria-label={tr("修改檢測")} title={tr("修改檢測")} onClick={()=>open('edit')}>{compact ? <Pencil size={17} aria-hidden="true" /> : tr("修改檢測")}</button>
    <button className={compact ? 'record-icon-btn record-icon-delete' : 'secondary-btn small'} type="button" disabled={busy} aria-label={tr("刪除檢測")} title={tr("刪除檢測")} onClick={()=>open('delete')}>{compact ? <Trash2 size={17} aria-hidden="true" /> : tr("刪除檢測")}</button>
   </div>
  </div>
  {mode && <section className="upload-card" role="dialog" aria-modal="false" aria-label={mode==='edit'?tr("修改檢測"):tr("刪除檢測確認")}>
   <h3>{record.sampleId} · {mode==='edit'?tr("修改檢測"):tr("確認刪除")}</h3>
   {mode==='edit' ? <form onSubmit={save}>
    <fieldset disabled={busy} style={{border:0,padding:0}}>
     <div className="field-row patient-fields">
      <label>{tr("檢測日期")}<input type="date" required value={draft.exam_date} onChange={e=>setDraft({...draft,exam_date:e.target.value})}/></label>
      {fields.map(([key,label])=><label key={key}>{tr(label)}<input type="number" step="any" min="0" max={['motility','morphology'].includes(key)?100:key==='ph'?14:undefined} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
      {['color','appearance'].map(key=><label key={key}>{key==='color'?tr("顏色"):tr("外觀")}<input value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}
     </div>
     <label>{tr("檢測摘要")}<textarea value={draft.summary} onChange={e=>setDraft({...draft,summary:e.target.value})}/></label>
     <p>{tr("留白代表未量測。儲存修改後需重新複核；已建立的報告版本保留原內容。")}</p>
     <button className="primary-btn small" type="submit">{busy?tr("儲存中…"):tr("儲存修改")}</button>
    </fieldset>
   </form> : <><p>{tr("確定永久刪除此筆檢測？原始與分析後影像、影片、報告版本及寄送追蹤紀錄將一併刪除，無法復原。病患與其他檢測會保留。已寄出的 Email 不會撤回。")}</p><button className="primary-btn small" type="button" disabled={busy} onClick={remove}>{busy?tr("刪除中…"):tr("確認刪除")}</button></>}
   {error && <p role="alert">{tr(error)}</p>}
   <button type="button" className="secondary-btn small" disabled={busy} onClick={()=>setMode('')}>{tr("取消")}</button>
  </section>}
 </div>
}
