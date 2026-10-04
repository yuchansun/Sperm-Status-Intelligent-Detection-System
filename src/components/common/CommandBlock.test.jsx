import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommandBlock } from './CommandBlock.jsx'

let root
let container
globalThis.IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.restoreAllMocks()
})

function renderCommand(command) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      React.createElement(CommandBlock, {
        command,
        label: 'Command',
        copyLabel: '複製指令',
        copiedLabel: '已複製',
        copyErrorLabel: '無法複製',
      }),
    )
  })
}

describe('CommandBlock', () => {
  it('copies the complete multiline command and exposes an accessible copy button', async () => {
    const command = './service \\\n  --allow-origin http://localhost:5173'
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    renderCommand(command)

    const button = container.querySelector('button[aria-label="複製指令"]')
    await act(async () => button.click())

    expect(writeText).toHaveBeenCalledWith(command)
    expect(container.textContent).toContain('已複製')
  })

  it('shows a friendly error when clipboard copying fails', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) } })
    renderCommand('cargo --version')

    await act(async () => container.querySelector('button').click())

    expect(container.textContent).toContain('無法複製')
  })
})
