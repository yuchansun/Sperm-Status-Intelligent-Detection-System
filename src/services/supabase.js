import { createClient } from '@supabase/supabase-js'

export function validateSupabaseConfig(url, key) {
  if (!url || !key) return '請先在 .env.local 填入 VITE_SUPABASE_URL 與 VITE_SUPABASE_PUBLISHABLE_KEY，然後重新啟動開發伺服器。'
  try {
    if (new URL(url).protocol !== 'https:') return 'Supabase 網址必須使用 HTTPS。'
  } catch {
    return 'Supabase 網址格式不正確。'
  }
  if (key.startsWith('sb_secret_')) return '不可在前端使用 Supabase secret key，請改用 publishable 或 anon key。'
  if (!key.startsWith('sb_publishable_')) {
    try {
      const payload = JSON.parse(atob(key.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')))
      if (payload.role !== 'anon') return '前端只允許 publishable 或 anon key，禁止使用管理金鑰。'
    } catch {
      return 'Supabase 公開金鑰格式不正確。'
    }
  }
  return ''
}

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim()
export const supabaseConfigError = validateSupabaseConfig(url, key)
export const supabase = supabaseConfigError ? null : createClient(url, key)
