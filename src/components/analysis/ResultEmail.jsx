import { translateText as tr } from '../../i18n/translate.js'
import { buildResultEmail } from '../../i18n/reportText.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useState } from 'react'
import { useLanguage } from '../../context/language.js'
import { isEmailJsConfigured, sendHistoryEmail } from '../../services/emailService.js'

export function ResultEmail({ record }) {
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState(null)
  const savedEmail = record.patient?.email?.trim() || ''
  const recipient = savedEmail || email.trim()
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
    const { subject, body } = buildResultEmail(record)
    try {
      await sendHistoryEmail({ recipient, recipientName: record.patient?.name || '', subject, body })
      setNotice({ error: false, text: tr("已提交寄送至 {{0}}。", [recipient]) })
    } catch {
      setNotice({ error: true, text: tr("寄送失敗，請確認 EmailJS 服務、範本及收件地址後再試。") })
    } finally { setSending(false) }
  }
  return <div className="education-block">
    <div className="panel-header"><h3>{t.sendEducation}</h3></div>
    <form className="email-row" onSubmit={send}>
      {savedEmail ? <p>{tr("收件地址：")}<strong>{savedEmail}</strong></p> : <input type="email" value={email} onChange={event => setEmail(event.target.value)} required disabled={sending} aria-label={t.emailAddress || tr("Email 地址")} placeholder={tr("請填寫收件 Email")} autoComplete="email" />}
      <button type="submit" className="primary-btn small" disabled={sending}>{sending ? tr("寄送中…") : t.sendEmail || tr("寄送 Email")}</button>
    </form>
    {notice && <p role={notice.error ? 'alert' : 'status'} className={`form-banner ${notice.error ? 'error' : 'success'}`}>{tr(notice.text)}</p>}
  </div>
}
