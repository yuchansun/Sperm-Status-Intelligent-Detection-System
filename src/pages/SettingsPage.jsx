import { languageOptions, useLanguage } from '../context/language.js'

export function SettingsPage() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div className="page-shell settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{t.settingsEyebrow}</p>
          <h2>{t.settingsTitle}</h2>
        </div>
      </header>

      <section className="settings-card">
        <div className="settings-card-header">
          <div>
            <h3>{t.languageTitle}</h3>
            <p>{t.languageDescription}</p>
          </div>
          <span className="status-pill success">{t.saved}</span>
        </div>

        <div className="language-options" role="radiogroup" aria-label={t.languageTitle}>
          {languageOptions.map((option) => (
            <label
              key={option.value}
              className={`language-option ${language === option.value ? 'language-option-active' : ''}`}
            >
              <input
                type="radio"
                name="language"
                value={option.value}
                checked={language === option.value}
                onChange={() => setLanguage(option.value)}
              />
              <span className="language-option-copy">
                <strong>{option.label}</strong>
              </span>
              <span className="language-check" aria-hidden="true">✓</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  )
}