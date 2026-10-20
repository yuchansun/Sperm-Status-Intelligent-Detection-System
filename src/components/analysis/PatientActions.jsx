import { translateText as tr } from '../../i18n/translate.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useState } from 'react'
import { getPatient, managePatient, patientToDraft } from '../../services/patientApi.js'
import { validatePatientDraft } from '../../utils/patientValidation.ts'
const fields=[['patientName','姓名','text'],['nationalId','身分證／病歷識別碼','text'],['birthDate','出生日期','date'],['phone','電話','tel'],['email','Email','email'],['healthCardNumber','健保卡卡號','text']]
export function PatientActions({patientId,onSaved,onDeleted}) {
 const [mode,setMode]=useState(''),[patient,setPatient]=useState(null),[draft,setDraft]=useState({}),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const open=async next=>{
  setBusy(true);setError('')
  try{const p=await getPatient(patientId);setPatient({id:p.id,updatedAt:p.updated_at});setDraft(patientToDraft(p));setMode(next)}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 const submit=async event=>{
  event.preventDefault();setBusy(true);setError('')
  try{
   if(mode==='edit'){
    const errors=validatePatientDraft(draft)
    if(Object.keys(errors).length) throw new Error(Object.values(errors).map(value => tr(value)).join(' / '))
   }
   const patch=mode==='delete'?{}:{patient_name:draft.patientName,national_id:draft.nationalId,birth_date:draft.birthDate,phone:draft.phone,email:draft.email,health_card_number:draft.healthCardNumber}
   await managePatient(patient,patch,mode==='delete')
   const deleting=mode==='delete';setMode('');(deleting?onDeleted:onSaved)()
  }catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <div className="patient-actions">
  <div className="header-actions"><button className="secondary-btn small" disabled={busy} onClick={()=>open('edit')}>{tr("修改病患資料")}</button><button className="secondary-btn small" disabled={busy} onClick={()=>open('delete')}>{tr("刪除病患")}</button></div>
  {mode && <section className="upload-card" role="dialog" aria-label={mode==='edit'?tr("修改病患資料"):tr("刪除病患確認")}>
   <h3>{mode==='edit'?tr("修改病患資料"):tr("確認刪除病患")} · {draft.patientName}</h3>
   <form onSubmit={submit}>
    <fieldset disabled={busy} style={{border:0,padding:0}}>
     {mode==='edit'?<div className="field-row patient-fields">{fields.map(([key,label,type])=><label key={key}>{tr(label)}<input type={type} required={['patientName','nationalId','birthDate'].includes(key)} value={draft[key]??''} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></label>)}</div>:<p>{tr("確認永久刪除此病患？病患資料、備註、所有檢測、影像、影片、報告與寄送追蹤紀錄將一併刪除，無法復原。已寄出的 Email 不會撤回。")}</p>}
     <button className="primary-btn small" type="submit">{busy?tr("儲存中…"):mode==='edit'?tr("儲存病患資料"):tr("確認刪除病患")}</button>
     <button className="secondary-btn small" type="button" onClick={()=>setMode('')}>{tr("取消")}</button>
    </fieldset>
   </form>
  </section>}
  {error&&<p role="alert">{tr(error)}</p>}
 </div>
}
