// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './auth.js'
import { supabase, supabaseConfigError } from '../services/supabase.js'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(supabase))
  const [authError, setAuthError] = useState(supabaseConfigError)

  useEffect(() => {
    if (!supabase) return
    // INITIAL_SESSION also restores the saved session; later events cover refresh and sign-out.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({
    isAuthenticated: Boolean(session?.user),
    isLoading,
    authError,
    user: session?.user ?? null,
    login: async (email, password) => {
      if (!supabase) return false
      setAuthError('')
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error || !data.session) {
          setAuthError('登入失敗，請確認 Email、密碼及網路連線。')
          return false
        }
        setSession(data.session)
        return true
      } catch {
        setAuthError('無法連線至登入服務，請稍後再試。')
        return false
      }
    },
    logout: async () => {
      if (!supabase) return
      try {
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (error) throw error
        setSession(null)
        setAuthError('')
      } catch {
        setAuthError('登出失敗，請檢查連線並重試。')
      }
    },
  }), [session, isLoading, authError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
