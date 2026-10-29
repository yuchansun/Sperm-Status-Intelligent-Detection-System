import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HistoryPage } from './HistoryPage.jsx'
import { LanguageProvider } from '../context/LanguageContext.jsx'

const fixture = vi.hoisted(() => ({ records: null }))

vi.mock('../hooks/useCloudHistory.js', async () => {
  const { historyRecords } = await import('../services/mockData.js')
  return { useCloudHistory: () => ({ records: fixture.records || historyRecords, loading: false, error: '', reload: vi.fn() }) }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root
let container

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  fixture.records = null
  root = undefined
  container = undefined
})

describe('HistoryPage pending review filter', () => {
  it('selects pending review from the URL and only shows pending review patients', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root.render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/history?filter=pending-review'] },
          React.createElement(LanguageProvider, null, React.createElement(HistoryPage)),
        ),
      )
    })

    const filterButton = container.querySelector('.history-filter-toggle')
    const processingStates = Array.from(container.querySelectorAll('.processing-state'))

    expect(filterButton.getAttribute('aria-pressed')).toBe('true')
    expect(filterButton.className).toContain('active')
    expect(processingStates.length).toBeGreaterThan(0)
    expect(processingStates.every((state) => state.textContent.includes('複核'))).toBe(true)
  })
})

it('shows patient identity, date and history navigation without an unexplained concentration number', () => {
  fixture.records = [31.9, 51.4].map((density, index) => ({
    id: `record-${index}`, sampleId: `SMP-${index}`, date: '2026-10-29',
    density, score: density, status: '示範資料', processingState: '待複核',
    patient: { id: `patient-${index}`, name: `PATIENT-${index}`, identity: `MASKED-${index}` },
  }))
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container)
  act(() => root.render(React.createElement(MemoryRouter, { initialEntries: ['/history'] },
    React.createElement(LanguageProvider, null, React.createElement(HistoryPage)))))
  const rows = [...container.querySelectorAll('.record-row')]
  expect(rows).toHaveLength(2)
  rows.forEach((row, index) => {
    expect(row.textContent).toContain(`PATIENT-${index}`)
    expect(row.textContent).toContain('2026-10-29')
    expect(row.textContent).not.toContain(String(fixture.records[index].density))
    expect(row.querySelector('button').textContent).toContain('查看病患歷史')
  })
})
