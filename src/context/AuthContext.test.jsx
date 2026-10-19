import React, { act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
const { auth, listeners } = vi.hoisted(() => {
  const listeners = []
  const unsubscribe = vi.fn()
  return { listeners, unsubscribe, auth: { onAuthStateChange: vi.fn(callback => { listeners.push(callback); return { data: { subscription: { unsubscribe } } } }), signInWithPassword: vi.fn(), signOut: vi.fn() } }
})
vi.mock('../services/supabase.js', () => ({ supabase: { auth }, supabaseConfigError: '' }))
import { AuthProvider } from './AuthContext.jsx'
import { useAuth } from './auth.js'

globalThis.IS_REACT_ACT_ENVIRONMENT = true
let root, container, current
function Consumer() { const value = useAuth(); useEffect(() => { current = value }, [value]); return null }
function render() {
  container = document.createElement('div'); document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(React.createElement(AuthProvider, null, React.createElement(Consumer))))
}
afterEach(() => { act(() => root?.unmount()); container?.remove(); vi.clearAllMocks(); listeners.length = 0 })
describe('Supabase authentication', () => {
  it('ignores the legacy local login flag and restores only a Supabase session', () => {
    localStorage.setItem('sperm-ai-authenticated', 'true')
    render()
    expect(current.isAuthenticated).toBe(false)
    act(() => listeners[0]('INITIAL_SESSION', { user: { id: 'staff' } }))
    expect(current.isLoading).toBe(false)
    expect(current.isAuthenticated).toBe(true)
    act(() => listeners[0]('SIGNED_OUT', null))
    expect(current.isAuthenticated).toBe(false)
  })
  it('awaits failed password login without authenticating', async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: new Error('invalid') })
    render()
    let result
    await act(async () => { result = await current.login('staff@example.com', 'invalid') })
    expect(result).toBe(false)
    expect(current.isAuthenticated).toBe(false)
    expect(current.authError).toContain('登入失敗')
  })
  it('reports sign-out failure and retains the current session for retry', async () => {
    auth.signOut.mockResolvedValue({ error: new Error('offline') })
    render()
    act(() => listeners[0]('SIGNED_IN', { user: { id: 'staff' } }))
    await act(async () => current.logout())
    expect(current.isAuthenticated).toBe(true)
    expect(current.authError).toContain('登出失敗')
    auth.signOut.mockResolvedValue({ error: null })
    await act(async () => current.logout())
    expect(current.isAuthenticated).toBe(false)
  })
})
