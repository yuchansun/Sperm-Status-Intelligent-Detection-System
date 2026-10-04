import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SettingsPage } from './SettingsPage.jsx'
import { LanguageProvider } from '../context/LanguageContext.jsx'
import { checkTwNhiIccService } from '../services/healthCard/twNhiIccApi.ts'

vi.mock('../services/healthCard/twNhiIccApi.ts', async () => {
  const actual = await vi.importActual('../services/healthCard/twNhiIccApi.ts')
  return { ...actual, checkTwNhiIccService: vi.fn() }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root
let container

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = undefined
  container = undefined
  vi.clearAllMocks()
})

function renderSettings() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(LanguageProvider, null, React.createElement(SettingsPage)),
      ),
    )
  })
}

describe('SettingsPage health-card diagnostics', () => {
  it('renders non-empty normal badges for a healthy v0.3.0 snapshot', async () => {
    checkTwNhiIccService.mockResolvedValue({
      service: 'ready',
      version: '0.3.0',
      versionSupported: true,
      pcsc: 'ready',
      reader: 'connected',
      card: 'ready',
      readerError: null,
      snapshot: {
        type: 'snapshot',
        status: 'ok',
        error: null,
        readers: [{
          name: 'Test Reader',
          state: 'nhi_card',
          card: {
            card_no: 'TEST',
            full_name: 'TEST',
            id_no: 'TEST',
            birth_date: '1990-01-01',
            birth_date_timestamp: 0,
            sex: 'M',
            issue_date: '2020-01-01',
            issue_date_timestamp: 0,
          },
          error: null,
        }],
      },
    })
    renderSettings()

    const checkButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent.includes('檢查讀卡服務'))
    await act(async () => checkButton.click())

    const statusRows = Array.from(container.querySelectorAll('.health-card-status-row'))
    const badgeTexts = statusRows.map((row) => row.querySelector('.health-card-status-badge')?.textContent.trim())
    expect(statusRows).toHaveLength(5)
    expect(badgeTexts.every(Boolean)).toBe(true)
    expect(badgeTexts.filter((text) => text === '正常')).toHaveLength(2)
    expect(container.textContent).toContain('已連線')
    expect(container.textContent).toContain('已成功讀取健保卡')
  })
})
