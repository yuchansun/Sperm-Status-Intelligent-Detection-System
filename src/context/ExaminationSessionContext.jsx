import { useCallback, useMemo, useState } from 'react'
import { ExaminationSessionContext } from './examinationSession.js'

export function ExaminationSessionProvider({ children }) {
  const [activeExamination, setActiveExaminationState] = useState(null)

  const setActiveExamination = useCallback((payload) => {
    setActiveExaminationState(payload)
  }, [])

  const clearActiveExamination = useCallback(() => {
    setActiveExaminationState(null)
  }, [])

  const value = useMemo(
    () => ({
      activeExamination,
      setActiveExamination,
      clearActiveExamination,
    }),
    [activeExamination, setActiveExamination, clearActiveExamination],
  )

  return (
    <ExaminationSessionContext.Provider value={value}>
      {children}
    </ExaminationSessionContext.Provider>
  )
}
