import { translateText as tr } from '../../i18n/translate.js'
import { buildResultEmail } from '../../i18n/reportText.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useState } from 'react'
import { useLanguage } from '../../context/language.js'
import { isEmailJsConfigured, sendHistoryEmail } from '../../services/emailService.js'
import { getReportDraft, saveReportDraft } from '../../services/reportDraftStorage.js'

export function ResultEmail({ record }) {
  const { t } = useLanguage()
  const initial = getReportDraft(record)
  const defaultContent = buildResultEmail(record, undefined, initial)
  const [email, setEmail] = useState(initial.email || record.patient?.email?.trim() || '')
  const [subject, setSubject] = useState(initial.subject || null)
  const [body, setBody] = useState(initial.body || null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [emailEditing, setEmailEditing] = useState(!record.patient?.email?.trim())
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState(null)
  const savedEmail = record.patient?.email?.trim() || ''
  const recipient = email.trim() || savedEmail
  const currentSubject = subject ?? defaultContent.subject
  const currentBody = body ?? defaultContent.body
  const submitSend = async () => {
    if (!isEmailJsConfigured()) {
      setNotice({ error: true, text: tr("尚未設定 EmailJS，請確認 .env.local 的 EmailJS 設定。") })
      return
    }
    setSending(true)
    try {
      await sendHistoryEmail({ recipient, recipientName: record.patient?.name || '', subject: currentSubject, body: currentBody })
      setNotice({ error: false, text: tr("已提交寄送至 {{0}}。", [recipient]) })
    } catch {
      setNotice({ error: true, text: tr("寄送失敗，請確認 EmailJS 服務、範本及收件地址後再試。") })
    } finally { setSending(false) }
  }
  const send = event => {
    event.preventDefault()
    if (sending) return
    setNotice(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      setNotice({ error: true, text: tr("請填寫有效的 Email 地址；若病患資料中的地址有誤，請先修改病患資料。") })
      return
    }
    setPreviewOpen(true)
  }
  const confirmSend = async () => {
    await submitSend()
  }
  return <div className="education-block">
    <div className="panel-header"><h3>{t.sendEducation}</h3></div>
    <form className={`email-preview-panel ${previewOpen ? 'email-preview-panel-open' : ''}`} onSubmit={send}>
      {savedEmail && !emailEditing ? <p>{tr("收件地址：")}<strong>{email || savedEmail}</strong> <button type="button" className="secondary-btn small" disabled={sending} onClick={() => setEmailEditing(true)}>{tr("修改")}</button></p> : <label>{tr("收件地址")}<input type="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={sending} aria-label={t.emailAddress || tr("Email 地址")} placeholder={tr("請填寫收件 Email")} autoComplete="email" /></label>}
      {previewOpen && <><div className="email-send-preview-header"><h4>{tr("寄送內容確認")}</h4><p>{tr("請確認以下內容，儲存修改後再按確認寄出。")}</p></div><label>{tr("主旨")}<input value={currentSubject} onChange={event => setSubject(event.target.value)} disabled={sending} /></label>
      <label>{tr("內文")}<textarea rows="8" value={currentBody} onChange={event => setBody(event.target.value)} disabled={sending} /></label></>}
      <div className="action-group">
        <button type="button" className="secondary-btn small" disabled={sending} onClick={() => setPreviewOpen(value => !value)}>{previewOpen ? tr("關閉編輯") : tr("編輯 Email 內容")}</button>
        <button type="button" className="secondary-btn small" disabled={sending} onClick={() => { saveReportDraft(record.id, { ...initial, email, subject: currentSubject, body: currentBody }); setNotice({ error: false, text: tr("Email 修改已儲存") }) }}>{tr("儲存修改")}</button>
        {previewOpen && <button type="button" className="primary-btn small" disabled={sending} onClick={confirmSend}>{sending ? tr("寄送中…") : tr("確認寄出")}</button>}
        {!previewOpen && <button type="submit" className="primary-btn small" disabled={sending}>{t.sendEmail || tr("寄送 Email")}</button>}
      </div>
      {previewOpen && <div className="email-preview" aria-label={tr("Email 預覽")}><strong>{currentSubject}</strong><pre>{currentBody}</pre></div>}
    </form>
    {notice && <p role={notice.error ? 'alert' : 'status'} className={`form-banner ${notice.error ? 'error' : 'success'}`}>{tr(notice.text)}</p>}
  </div>
}
