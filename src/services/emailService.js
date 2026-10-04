import emailjs from '@emailjs/browser'

const emailJsConfig = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
}

export function isEmailJsConfigured() {
  return Object.values(emailJsConfig).every(Boolean)
}

export async function sendHistoryEmail({ recipient, recipientName, subject, body }) {
  if (!isEmailJsConfigured()) {
    throw new Error('EMAILJS_NOT_CONFIGURED')
  }

  return emailjs.send(
    emailJsConfig.serviceId,
    emailJsConfig.templateId,
    {
      to_email: recipient,
      to_name: recipientName,
      from_name: '精蟲 AI 智慧輔助檢驗平台',
      subject,
      body,
      message: body,
      reply_to: recipient,
    },
    { publicKey: emailJsConfig.publicKey },
  )
}
