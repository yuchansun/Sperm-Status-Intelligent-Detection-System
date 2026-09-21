import { useMemo, useState } from 'react'
import { LanguageContext, languageStorageKey, translations } from './language.js'

function getInitialLanguage() {
  const savedLanguage = window.localStorage.getItem(languageStorageKey)
  return savedLanguage && translations[savedLanguage] ? savedLanguage : 'zh'
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage)

  const value = useMemo(() => ({
    language,
    setLanguage: (nextLanguage) => {
      if (!translations[nextLanguage]) return
      window.localStorage.setItem(languageStorageKey, nextLanguage)
      setLanguage(nextLanguage)
    },
    t: translations[language],
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}