import { translateText as tr } from '../../i18n/translate.js'
import { buildResultEmail } from '../../i18n/reportText.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../context/language.js'
import { isEmailJsConfigured, sendHistoryEmail } from '../../services/emailService.js'

export function ResultEmail({ record }) {
  const { t, language } = useLanguage()
  const savedEmail = record.patient?.email?.trim() || ''
  const defaults = buildResultEmail(record, language)
  const [email, setEmail] = useState(savedEmail)
  const [subject, setSubject] = useState(defaults.subject)
  const [body, setBody] = useState(defaults.body)
  const [edited, setEdited] = useState(false)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState(null)
  const recipient = email.trim()
  useEffect(() => {
    if (edited) return
    const next = buildResultEmail(record, language)
    setSubject(next.subject)
    setBody(next.body)
  }, [edited, language, record])

  const send = async event => {
    event.preventDefault()
    if (sending) return
    setNotice(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      setNotice({ error: true, text: tr("請填寫有效的 Email 地址；若病患資料中的地址有誤，請先修改病患資料。") })
      return
    }
    if (!isEmailJsConfigured()) {
      setNotice({ error: true, text: tr("尚未設定 EmailJS，請確認 .env.local 的 EmailJS 設定。") })
      return
    }
    setSending(true)
    try {
      await sendHistoryEmail({ recipient, recipientName: record.patient?.name || '', subject, body })
      setNotice({ error: false, text: tr("已提交寄送至 {{0}}。", [recipient]) })
    } catch {
      setNotice({ error: true, text: tr("寄送失敗，請確認 EmailJS 服務、範本及收件地址後再試。") })
    } finally { setSending(false) }
  }
  return <div className="education-block">
    <div className="panel-header"><div><h3>{t.sendEducation}</h3><p>{tr("寄送前預覽，可修改收件地址、主旨與內文。")}</p></div></div>
    <form className="email-row email-preview-form" onSubmit={send}>
      <label className="email-preview-field">
        <span>{tr("收件地址")}</span>
        <input type="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={sending} aria-label={t.emailAddress || tr("Email 地址")} placeholder={tr("請填寫收件 Email")} autoComplete="email" />
      </label>
      <label className="email-preview-field">
        <span>{tr("主旨")}</span>
        <input type="text" value={subject} onChange={event => { setSubject(event.target.value); setEdited(true) }} required disabled={sending} />
      </label>
      <label className="email-preview-field">
        <span>{tr("內文")}</span>
        <textarea value={body} onChange={event => { setBody(event.target.value); setEdited(true) }} rows={10} required disabled={sending} />
      </label>
      <button type="submit" className="primary-btn small" disabled={sending}>{sending ? tr("寄送中…") : t.sendEmail || tr("寄送 Email")}</button>
    </form>
    {notice && <p role={notice.error ? 'alert' : 'status'} className={`form-banner ${notice.error ? 'error' : 'success'}`}>{tr(notice.text)}</p>}
  </div>
}
