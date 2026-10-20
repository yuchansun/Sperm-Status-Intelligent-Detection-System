import { translateText as tr } from '../i18n/translate.js'
import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth.js'
import { languageOptions, useLanguage } from '../context/language.js'

export function LoginPage() {
  const { isAuthenticated, isLoading, authError, login } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [hasError, setHasError] = useState(false)
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting || isLoading) return
    setIsSubmitting(true)
    const didLogin = await login(username.trim(), password)
    setIsSubmitting(false)
    if (!didLogin) {
      setHasError(true)
      return
    }

    setHasError(false)
    navigate('/', { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-language-control">
          <button
            type="button"
            className="language-icon-btn"
            aria-label={t.languageTitle}
            aria-expanded={isLanguageMenuOpen}
            aria-haspopup="menu"
            title={t.languageTitle}
            onClick={() => setIsLanguageMenuOpen((isOpen) => !isOpen)}
          >
            <span aria-hidden="true">🌐</span>
          </button>
          {isLanguageMenuOpen && (
            <div className="login-language-menu" role="menu">
              {languageOptions.map((option) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={option.value === language}
                  className="login-language-option"
                  key={option.value}
                  onClick={() => {
                    setLanguage(option.value)
                    setIsLanguageMenuOpen(false)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="login-brand">
          <div className="brand-mark">AI</div>
          <div>
            <p className="eyebrow">SpermAI Platform</p>
            <span className="brand-name">SpermAI</span>
          </div>
        </div>

        <div className="login-heading">
          <p className="eyebrow">{t.loginEyebrow}</p>
          <h1 id="login-title">{t.loginTitle}</h1>
          <p>{t.loginDescription}</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit} >
          <label>
            <span>{t.username}</span>
            <input
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                setHasError(false)
              }}
              autoComplete="username"
              placeholder={t.usernamePlaceholder}
              required
            />
          </label>

          <label>
            <span>{t.password}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setHasError(false)
              }}
              autoComplete="current-password"
              placeholder={t.passwordPlaceholder}
              required
            />
          </label>

          {(hasError || authError) && <p className="login-error" role="alert">{tr(authError || t.invalidCredentials)}</p>}

          <button type="submit" className="primary-btn login-submit" disabled={isSubmitting || isLoading}>
            {isSubmitting ? tr("登入中…") : t.login}
          </button>
        </form>
      </section>
    </main>
  )
}
