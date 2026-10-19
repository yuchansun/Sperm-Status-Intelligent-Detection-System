import { describe, expect, it } from 'vitest'
import { validateSupabaseConfig } from './supabase.js'

const url = 'https://example.supabase.co'
const jwt = (role) => `header.${btoa(JSON.stringify({ role }))}.signature`

describe('Supabase frontend configuration', () => {
  it('requires connection settings', () => {
    expect(validateSupabaseConfig('', '')).toContain('.env.local')
  })
  it('rejects administrative credentials', () => {
    expect(validateSupabaseConfig(url, 'sb_secret_example')).toContain('secret')
    expect(validateSupabaseConfig(url, jwt('service_role'))).toContain('禁止')
  })
  it('accepts publishable and legacy anon credentials', () => {
    expect(validateSupabaseConfig(url, 'sb_publishable_example')).toBe('')
    expect(validateSupabaseConfig(url, jwt('anon'))).toBe('')
  })
  it('rejects malformed settings', () => {
    expect(validateSupabaseConfig('invalid', 'key')).toBeTruthy()
    expect(validateSupabaseConfig('http://example.com', 'key')).toBeTruthy()
    expect(validateSupabaseConfig(url, 'invalid')).toBeTruthy()
  })
})
