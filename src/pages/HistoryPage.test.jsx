import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { HistoryPage } from './HistoryPage.jsx'
import { LanguageProvider } from '../context/LanguageContext.jsx'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let root
let container

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
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
