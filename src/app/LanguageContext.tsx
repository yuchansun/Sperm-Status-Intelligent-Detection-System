import { createContext, useContext, useMemo, useState } from 'react'

import type { ReactNode } from 'react'

import type { UiLanguage } from '../types/analysis'

const LANGUAGE_STORAGE_KEY = 'spermvision:language'

type LanguageContextValue = {
  language: UiLanguage
  setLanguage: (language: UiLanguage) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function getStoredLanguage(): UiLanguage {
  if (typeof window === 'undefined') return 'zh-TW'

  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (storedLanguage === 'en' || storedLanguage === 'zh-TW') {
    return storedLanguage
  }

  return 'zh-TW'
}

type LanguageProviderProps = {
  children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<UiLanguage>(getStoredLanguage)

  const setLanguage = (nextLanguage: UiLanguage) => {
    setLanguageState(nextLanguage)
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)

  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }

  return context
}
