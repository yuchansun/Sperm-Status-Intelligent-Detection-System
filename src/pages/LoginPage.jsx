import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth.js'
import { languageOptions, useLanguage } from '../context/language.js'

export function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [hasError, setHasError] = useState(false)
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)

  if (isAuthenticated) return <Navigate to="/" replace />

  const handleSubmit = (event) => {
    event.preventDefault()
    const didLogin = login(username.trim(), password)
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

        <form className="login-form" onSubmit={handleSubmit} noValidate>
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

          {hasError && <p className="login-error" role="alert">{t.invalidCredentials}</p>}

          <button type="submit" className="primary-btn login-submit">
            {t.login}
          </button>
        </form>
      </section>
    </main>
  )
}
