import { useLanguage } from '../app/LanguageContext'
import { settingsContentByLanguage } from '../data/content/ui.content'

function SettingsPage() {
  const { language, setLanguage } = useLanguage()
  const content = settingsContentByLanguage[language]

  return (
    <div className="page-stack">
      <section className="panel-card">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">{content.sectionEyebrow}</p>
            <h2>{content.sectionTitle}</h2>
          </div>
          <p className="section-heading__subtitle">{content.sectionSubtitle}</p>
        </div>

        <div className="settings-grid">
          <article className="settings-card">
            <h3>{content.languageCardTitle}</h3>
            <p>{content.languageCardDesc}</p>
            <div className="settings-locale-switcher" role="group" aria-label={content.languageLabel}>
              <span>{content.languageLabel}</span>
              <button
                type="button"
                className={language === 'zh-TW' ? 'locale-switcher__active' : ''}
                onClick={() => setLanguage('zh-TW')}
              >
                {content.zhLabel}
              </button>
              <button
                type="button"
                className={language === 'en' ? 'locale-switcher__active' : ''}
                onClick={() => setLanguage('en')}
              >
                {content.enLabel}
              </button>
            </div>
          </article>
          <article className="settings-card">
            <h3>{content.themeTitle}</h3>
            <p>{content.themeDesc}</p>
          </article>
          <article className="settings-card">
            <h3>{content.navigationTitle}</h3>
            <p>{content.navigationDesc}</p>
          </article>
          <article className="settings-card">
            <h3>{content.dataLayerTitle}</h3>
            <p>{content.dataLayerDesc}</p>
          </article>
        </div>
      </section>
    </div>
  )
}

export default SettingsPage