// Public aliases only. Passwords are verified by Supabase Auth, never by this map.
export const fixedAccountEmails = Object.freeze({
  admin: 'admin@sperm-demo.example.com',
  doctor: 'doctor@sperm-demo.example.com',
  demo: 'demo@sperm-demo.example.com',
})
export function resolveLoginEmail(account) {
  const value = account.trim()
  const alias = fixedAccountEmails[value.toLowerCase()]
  if (alias) return alias
  // Preserve existing Supabase account access during the transition.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value
  return null
}
