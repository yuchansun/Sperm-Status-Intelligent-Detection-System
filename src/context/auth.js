import { createContext, useContext } from 'react'

export const authStorageKey = 'sperm-ai-authenticated'
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}
