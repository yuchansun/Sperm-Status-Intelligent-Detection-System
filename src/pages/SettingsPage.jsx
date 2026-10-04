// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommandBlock } from '../components/common/CommandBlock.jsx'
import { languageOptions, useLanguage } from '../context/language.js'
import { checkTwNhiIccService } from '../services/healthCard/twNhiIccApi.ts'

const productionOrigin = 'https://sperm-status-intelligent-detection.vercel.app'

function getPlatform() {
  const userAgent = window.navigator.userAgent.toLowerCase()
  if (/ipad|iphone|ipod|android/.test(userAgent)) return 'mobile'
  if (userAgent.includes('windows')) return 'windows'
  return 'macos'
}

export function SettingsPage() {
  const { language, setLanguage, t } = useLanguage()
  const navigate = useNavigate()
  const [platform, setPlatform] = useState(getPlatform)
  const currentOrigin = window.location.origin
  const [serviceCheck, setServiceCheck] = useState({ status: 'idle', origin: currentOrigin })
  const isProduction = currentOrigin === productionOrigin
  const isPreview = currentOrigin.includes('.vercel.app') && !isProduction
  const developmentOrigins = [...new Set(['http://localhost:5173', productionOrigin])]
    const developmentCommand = ['./target/release/tw-nhi-icc-service \\', ...developmentOrigins.map((origin) => `  --allow-origin ${origin} \\`)].join('\n').replace(/ \\$/, '')
    const productionCommand = ['./target/release/tw-nhi-icc-service \\', `  --allow-origin ${productionOrigin}`].join('\n')
    const previewCommand = ['./target/release/tw-nhi-icc-service \\', `  --allow-origin ${currentOrigin} \\`, `  --allow-origin ${productionOrigin}`].join('\n')
  const commandProps = {
    copyLabel: t.healthCardCopy,
    copiedLabel: t.healthCardCopied,
    copyErrorLabel: t.healthCardCopyError,
  }

  const handleServiceCheck = async () => {
    setServiceCheck({ status: 'checking', origin: currentOrigin })
    try {
      const result = await checkTwNhiIccService()
      setServiceCheck({ status: 'success', origin: currentOrigin, health: result })
    } catch {
      setServiceCheck({ status: 'error', origin: currentOrigin })
    }
  }

  const statusLabel = (key) => {
    if (serviceCheck.status === 'idle') return { label: t.healthCardStatusNotChecked, tone: 'neutral' }
    if (serviceCheck.status === 'checking') return { label: t.healthCardStatusChecking, tone: 'neutral' }
    if (serviceCheck.status === 'error') return { label: t.healthCardStatusConnection, tone: 'error' }
    const health = serviceCheck.health
    if (key === 'service') return health.service === 'old_version' ? { label: t.healthCardStatusOldVersion ?? '版本過舊', tone: 'warning' } : { label: health.service === 'ready' ? (t.healthCardStatusReady ?? '正常') : (t.healthCardStatusConnection ?? '無法連線本機讀卡服務'), tone: health.service === 'ready' ? 'success' : 'error' }
    if (key === 'version') return { label: health.versionSupported ? health.version : t.healthCardStatusOldVersion, tone: health.versionSupported ? 'success' : 'warning' }
    if (key === 'pcsc') return { label: health.pcsc === 'ready' ? (t.healthCardStatusReady ?? '正常') : health.pcsc === 'unavailable' ? (t.healthCardStatusPcscUnavailable ?? '智慧卡服務無法使用') : (t.healthCardStatusUnknown ?? '狀態未知'), tone: health.pcsc === 'ready' ? 'success' : health.pcsc === 'unavailable' ? 'error' : 'neutral' }
    if (key === 'reader') return { label: health.reader === 'connected' ? t.healthCardStatusReaderConnected : health.reader === 'not_found' ? t.healthCardStatusNoReader : health.reader === 'error' ? t.healthCardStatusReaderError : t.healthCardStatusUnknown, tone: health.reader === 'connected' ? 'success' : health.reader === 'error' ? 'error' : 'neutral' }
    if (health.card === 'ready') return { label: t.healthCardStatusCardReady, tone: 'success' }
    if (health.card === 'empty') return { label: t.healthCardStatusEmpty, tone: 'neutral' }
    if (health.card === 'unsupported') return { label: t.healthCardStatusUnsupported, tone: 'warning' }
    if (health.card === 'sharing_violation') return { label: t.healthCardStatusSharingViolation, tone: 'error' }
    if (health.card === 'error') return { label: t.healthCardStatusReaderError, tone: 'error' }
    return { label: t.healthCardStatusUnknown, tone: 'neutral' }
  }

  const statusRows = [['service', t.healthCardService ?? '讀卡服務'], ['version', t.healthCardProgramVersion ?? t.healthCardVersion ?? '程式版本'], ['pcsc', t.healthCardPcscLabel ?? '電腦智慧卡服務'], ['reader', t.healthCardReader ?? '讀卡機'], ['card', t.healthCardCard ?? '健保卡']]

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

      <section className="settings-card health-card-guide">
        <div className="settings-card-header">
          <div>
            <h3>{t.healthCardTitle}</h3>
            <p>{t.healthCardDescription}</p>
          </div>
          <span className="status-pill success">{t.healthCardVersionLabel}</span>
        </div>

        <div className="health-card-summary">
          <span>{t.healthCardSupportedVersion}: <strong>tw-nhi-icc-service v0.3.0</strong></span>
          <span>{t.healthCardLocalAddress}: <code>http://127.0.0.1:12345</code></span>
        </div>

        <div className="health-card-platform-tabs" role="tablist" aria-label={t.healthCardPlatformLabel}>
          {['macos', 'windows', 'mobile'].map((value) => (
            <button key={value} type="button" className={platform === value ? 'segment-btn active' : 'segment-btn'} onClick={() => setPlatform(value)}>
              {t[`healthCardPlatform${value[0].toUpperCase()}${value.slice(1)}`]}
            </button>
          ))}
        </div>

        {platform === 'macos' ? (
          <details className="health-card-details" open>
            <summary>{t.healthCardMacTitle}</summary>
            <p>{t.healthCardMacPrerequisites}</p>
            <ol>
              <li><strong>{t.healthCardMacStepOne}</strong><CommandBlock command="cargo --version" label={t.healthCardCommandLabel} {...commandProps} /><CommandBlock command="curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh" label={t.healthCardRustInstallLabel} {...commandProps} /><span>{t.healthCardMacStepOneHint}</span></li>
              <li><strong>{t.healthCardMacStepTwo}</strong><CommandBlock command={'cd ~\ngit clone https://github.com/magiclen/tw-nhi-icc-service.git tw-nhi-icc-service-v0.3.0\ncd tw-nhi-icc-service-v0.3.0\ngit checkout v0.3.0'} label={t.healthCardDownloadLabel} {...commandProps} /><CommandBlock command={'cd ~/tw-nhi-icc-service-v0.3.0\ngit fetch --tags\ngit checkout v0.3.0'} label={t.healthCardExistingFolderLabel} {...commandProps} /><span>{t.healthCardMacStepTwoHint}</span></li>
              <li><strong>{t.healthCardMacStepThree}</strong><CommandBlock command="cargo build --release" label={t.healthCardBuildLabel} {...commandProps} /><span>{t.healthCardMacStepThreeHint}</span></li>
              <li><strong>{t.healthCardMacStepFour}</strong>{isProduction ? <CommandBlock command={productionCommand} label={t.healthCardProductionLabel} {...commandProps} /> : isPreview ? <><CommandBlock command={previewCommand} label={t.healthCardPreviewLabel} {...commandProps} /><CommandBlock command={productionCommand} label={t.healthCardProductionLabel} {...commandProps} /></> : <><CommandBlock command={developmentCommand} label={t.healthCardLocalLabel} {...commandProps} /><CommandBlock command={productionCommand} label={t.healthCardProductionLabel} {...commandProps} /></>}<span>{t.healthCardMacStepFourHint}</span></li>
            </ol>
            <div className="health-card-links"><a href="http://127.0.0.1:12345/version" target="_blank" rel="noreferrer">{t.healthCardVerifyVersion}</a><a href="http://127.0.0.1:12345/" target="_blank" rel="noreferrer">{t.healthCardVerifySnapshot}</a></div>
            <details><summary>{t.healthCardTroubleshooting}</summary><ul>{t.healthCardTroubleshootingItems.map((item) => <li key={item.title}><strong>{item.title}</strong>{item.text}</li>)}</ul></details>
          </details>
        ) : null}

        {platform === 'windows' ? (
          <details className="health-card-details" open>
            <summary>{t.healthCardWindowsTitle}</summary>
            <ol><li>{t.healthCardWindowsStepOne}</li><li><a href="https://github.com/magiclen/tw-nhi-icc-service/releases/download/v0.3.0/tw-nhi-icc-service-windows-x86_64.exe" target="_blank" rel="noreferrer">{t.healthCardWindowsStepTwo}</a></li><li>{t.healthCardWindowsStepThree}</li><li>{t.healthCardWindowsStepFour}</li><li>{t.healthCardWindowsStepFive}</li><li>{t.healthCardWindowsStepSix}</li></ol>
            <p className="health-card-warning">{t.healthCardWindowsWarning}</p>
            <p>{t.healthCardWindowsNote}</p>
          </details>
        ) : null}

        {platform === 'mobile' ? (
          <details className="health-card-details" open>
            <summary>{t.healthCardMobileTitle}</summary>
            <p>{t.healthCardMobileDescription}</p>
            <button type="button" className="secondary-btn" onClick={() => navigate('/analysis')}>{t.healthCardManualInput}</button>
          </details>
        ) : null}

        <div className="health-card-check">
          <div className="health-card-check-header">
            <div><h4>{t.healthCardCheckTitle}</h4><p>{t.healthCardCheckDescription}</p></div>
            <button type="button" className="secondary-btn" onClick={handleServiceCheck} disabled={serviceCheck.status === 'checking'}>{serviceCheck.status === 'checking' ? t.healthCardChecking : serviceCheck.status === 'idle' ? t.healthCardCheckButton : t.healthCardRecheck}</button>
          </div>
          <p className="health-card-browser-note">{t.healthCardBrowserNote}</p>
          <div className="health-card-check-results" role="status">
            {statusRows.map(([key, label]) => {
              const result = statusLabel(key)
              return <div className="health-card-status-row" key={key}><span>{label}{key === 'pcsc' ? <small>PC/SC</small> : null}</span><span className={`health-card-status-badge ${result.tone}`}>{result.label}</span></div>
            })}
          </div>
        </div>

        <details className="health-card-advanced"><summary>{t.healthCardAdvanced}</summary><p>{t.healthCardCurrentOrigin}: <code>{currentOrigin}</code></p></details>
        <p className="health-card-privacy">{t.healthCardPrivacy}</p>
        <button type="button" className="secondary-btn" onClick={() => navigate('/analysis')}>{t.healthCardManualInput}</button>
      </section>
    </div>
  )
}