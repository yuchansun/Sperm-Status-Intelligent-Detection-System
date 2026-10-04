// eslint-disable-next-line no-unused-vars
import React from 'react'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Clipboard is unavailable')
}

export function CommandBlock({ command, label, copyLabel, copiedLabel, copyErrorLabel }) {
  const [copyState, setCopyState] = useState('idle')

  const handleCopy = async () => {
    try {
      await copyText(command)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1600)
    } catch {
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 2400)
    }
  }

  const statusLabel = copyState === 'copied' ? copiedLabel : copyState === 'error' ? copyErrorLabel : copyLabel

  return (
    <div className="command-block">
      <div className="command-block-header">
        <span>{label}</span>
        <button
          type="button"
          className="icon-button command-copy-button"
          onClick={handleCopy}
          aria-label={copyLabel}
          title={statusLabel}
        >
          {copyState === 'copied' ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          <span className="sr-only">{statusLabel}</span>
        </button>
      </div>
      <code>{command}</code>
      {copyState === 'error' ? <p className="command-copy-error" role="status">{copyErrorLabel}</p> : null}
    </div>
  )
}
