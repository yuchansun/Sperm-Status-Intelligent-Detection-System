import { createContext, useContext } from 'react'

export const ExaminationSessionContext = createContext(null)

export function useExaminationSession() {
  const context = useContext(ExaminationSessionContext)
  if (!context) {
    throw new Error('useExaminationSession must be used within ExaminationSessionProvider')
  }
  return context
}
