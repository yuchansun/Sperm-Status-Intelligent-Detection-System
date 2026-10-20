import { translateText as tr } from '../../i18n/translate.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useState } from 'react'
import { getDeletedItems, permanentlyDelete } from '../../services/permanentDelete.js'
export function DeletedItems({ onChanged }) {
 const [items,setItems]=useState(null),[selected,setSelected]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const load=async()=>{setBusy(true);setError('');try{setItems(await getDeletedItems())}catch(e){setError(e.message)}finally{setBusy(false)}}
 const remove=async()=>{
  setBusy(true);setError('')
  try{await permanentlyDelete(selected.kind,selected);setSelected(null);setItems(await getDeletedItems());onChanged()}
  catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <section className="deleted-items">
  <button className="secondary-btn small" type="button" disabled={busy} onClick={()=>items ? (setItems(null),setSelected(null)) : load()}>{tr("已刪除項目")}</button>
  {items&&<div className="upload-card"><h3>{tr("清理先前隱藏的資料")}</h3><p>{tr("這些資料仍佔用空間。請逐筆確認永久刪除。")}</p>
   {[...items.patients.map(p=>({...p,kind:'patient'})),...items.records.map(r=>({...r,kind:'record'}))].map(item=><div className="panel-header" key={`${item.kind}-${item.id}`}><span>{item.kind==='patient'?tr("病患"):tr("檢測")}：{item.label}</span><button className="secondary-btn small" type="button" disabled={busy} onClick={()=>setSelected(item)}>{tr("永久刪除")}</button></div>)}
   {!items.patients.length&&!items.records.length&&<p>{tr("沒有待清理項目。")}</p>}
   {selected&&<div role="dialog" aria-label={tr("永久刪除確認")}><p>{tr("永久刪除「")}{selected.label}{tr("」及其相關影像、影片、報告與寄送紀錄？")}{selected.kind==='patient'?tr("也會刪除該病患所有檢測。"):''}{tr("此操作無法復原。")}</p><button className="primary-btn small" disabled={busy} onClick={remove}>{busy?tr("刪除中…"):tr("確認永久刪除")}</button><button className="secondary-btn small" disabled={busy} onClick={()=>setSelected(null)}>{tr("取消")}</button></div>}
  </div>}
  {error&&<p role="alert">{tr(error)}</p>}
 </section>
}
