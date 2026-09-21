import { useMemo, useState } from 'react'
import { AuthContext, authStorageKey } from './auth.js'

const fixedAccounts = {
  admin: 'admin123',
  doctor: 'doctor123',
  demo: 'demo123',
}

function getInitialAuthState() {
  return window.localStorage.getItem(authStorageKey) === 'true'
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(getInitialAuthState)

  const value = useMemo(() => ({
    isAuthenticated,
    login: (username, password) => {
      const isValid = fixedAccounts[username] === password
      if (!isValid) return false

      window.localStorage.setItem(authStorageKey, 'true')
      setIsAuthenticated(true)
      return true
    },
    logout: () => {
      window.localStorage.removeItem(authStorageKey)
      setIsAuthenticated(false)
    },
  }), [isAuthenticated])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
