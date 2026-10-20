import { translateText as tr } from '../../i18n/translate.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useState } from 'react'
import { HealthCardReadError } from '../../types/healthCard.ts'
import { maskHealthCardNumber, maskNationalId } from '../../utils/maskSensitive.ts'
import { isPatientDraftComplete } from '../../utils/patientValidation.ts'

function SensitiveField({
  label,
  value,
  onChange,
  maskFn,
  error,
  required = false,
  inputMode = 'text',
  autoComplete = 'off',
}) {
  const [revealed, setRevealed] = useState(false)

  return (
    <label className={error ? 'field-error' : undefined}>
      <span>
        {tr(label)}
        {required ? ' *' : ''}
      </span>
      <div className="sensitive-field-row">
        <input
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
        />
        {value ? (
          <button
            type="button"
            className="secondary-btn small sensitive-toggle"
            onClick={() => setRevealed((prev) => !prev)}
          >
            {revealed ? tr("隱藏") : tr("顯示")}
          </button>
        ) : null}
      </div>
      {!revealed && value ? (
        <p className="field-message muted-preview">{tr("預覽：")}{maskFn(value)}</p>
      ) : null}
      {error ? <p className="field-message error">{tr(error)}</p> : null}
    </label>
  )
}

export function PatientBasicInfoSection({
  draft,
  onDraftChange,
  inputMode,
  onInputModeChange,
  reader,
  fieldErrors,
  onFieldErrorsChange,
  onCardRead,
}) {
  const [readStatus, setReadStatus] = useState('idle')
  const [readMessage, setReadMessage] = useState('')

  const patchDraft = (patch) => {
    onDraftChange({ ...draft, ...patch })
  }

  const handleReadCard = async () => {
    setReadStatus('reading')
    setReadMessage(tr("卡片讀取中，請勿移動健保卡…"))

    try {
      const cardPatient = await reader.readBasicInfo()
      onDraftChange({
        ...draft,
        patientName: cardPatient.name,
        nationalId: cardPatient.nationalId,
        birthDate: cardPatient.birthday,
        sex: cardPatient.sex,
        healthCardNumber: cardPatient.cardId ?? draft.healthCardNumber,
        identityStatus: cardPatient.identityStatus ?? '',
        patientDataSource: 'health_card',
      })
      onFieldErrorsChange({})
      setReadStatus('success')
      setReadMessage(tr("讀卡成功，請確認病人資料是否正確"))
      await onCardRead?.(cardPatient)
    } catch (error) {
      const message =
        error instanceof HealthCardReadError
          ? error.message
          : error.message || tr("讀卡失敗，請稍後再試或改用手動輸入")
      setReadStatus('error')
      setReadMessage(message)
    }
  }

  const switchToManual = () => {
    onInputModeChange('manual')
    patchDraft({ patientDataSource: 'manual' })
    setReadStatus('manual_mode')
    setReadMessage(tr("已切換為手動輸入，先前資料仍保留供確認"))
  }

  const isComplete = isPatientDraftComplete(draft)

  return (
    <section className="upload-card patient-basic-card">
      <div className="form-section">
        <div className="panel-header">
          <h3>{tr("病人基本資料")}</h3>
          {!isComplete ? <span className="chip warning">{tr("必填未完成")}</span> : <span className="chip neutral">{tr("已完成")}</span>}
        </div>

        <div className="patient-input-mode">
          <button
            type="button"
            className={inputMode === 'health_card' ? 'segment-btn active' : 'segment-btn'}
            onClick={() => onInputModeChange('health_card')}
          >{tr("讀取健保卡")}</button>
          <button
            type="button"
            className={inputMode === 'manual' ? 'segment-btn active' : 'segment-btn'}
            onClick={switchToManual}
          >{tr("無健保卡／手動輸入")}</button>
        </div>

        {inputMode === 'health_card' ? (
          <div className="health-card-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleReadCard}
              disabled={readStatus === 'reading'}
            >
              {readStatus === 'reading' ? tr("讀取中…") : tr("讀取健保卡")}
            </button>
            {readStatus === 'error' ? (
              <>
                <button type="button" className="secondary-btn" onClick={handleReadCard}>{tr("重新讀取")}</button>
                <button type="button" className="secondary-btn" onClick={switchToManual}>{tr("改用手動輸入")}</button>
              </>
            ) : null}
          </div>
        ) : null}

        {readMessage ? (
          <p
            className={`read-status ${readStatus === 'error' ? 'error' : readStatus === 'success' ? 'success' : ''}`}
            role="status"
          >
            {tr(readMessage)}
          </p>
        ) : null}

        <div className="field-row patient-fields">
          <label className={fieldErrors.patientName ? 'field-error' : undefined}>
            <span>{tr("姓名 *")}</span>
            <input
              type="text"
              value={draft.patientName}
              onChange={(event) => patchDraft({ patientName: event.target.value })}
              autoComplete="name"
            />
            {fieldErrors.patientName ? <p className="field-message error">{tr(fieldErrors.patientName)}</p> : null}
          </label>

          <SensitiveField
            label={tr("身分證字號／病歷識別碼")}
            value={draft.nationalId}
            onChange={(value) => patchDraft({ nationalId: value })}
            maskFn={maskNationalId}
            error={tr(fieldErrors.nationalId)}
            required
          />

          <label className={fieldErrors.birthDate ? 'field-error' : undefined}>
            <span>{tr("出生日期 *")}</span>
            <input
              type="date"
              value={draft.birthDate}
              onChange={(event) => patchDraft({ birthDate: event.target.value })}
            />
            {fieldErrors.birthDate ? <p className="field-message error">{tr(fieldErrors.birthDate)}</p> : null}
          </label>

          {draft.patientDataSource === 'health_card' || draft.healthCardNumber ? (
            <SensitiveField
              label={tr("健保卡卡號")}
              value={draft.healthCardNumber}
              onChange={(value) => patchDraft({ healthCardNumber: value })}
              maskFn={maskHealthCardNumber}
              error={tr(fieldErrors.healthCardNumber)}
            />
          ) : null}

          {draft.identityStatus ? (
            <label>
              <span>{tr("身分註記")}</span>
              <input type="text" value={draft.identityStatus} readOnly />
            </label>
          ) : null}

          <label className={fieldErrors.email ? 'field-error' : undefined}>
            <span>{tr("Email（選填）")}</span>
            <input type="email" value={draft.email ?? ''}
              onChange={(event) => patchDraft({ email: event.target.value })} autoComplete="email" />
            {fieldErrors.email && <p className="field-message error">{tr(fieldErrors.email)}</p>}
          </label>

          <label className={fieldErrors.phone ? 'field-error' : undefined}>
            <span>{tr("聯絡電話（選填）")}</span>
            <input
              type="tel"
              value={draft.phone}
              onChange={(event) => patchDraft({ phone: event.target.value })}
              autoComplete="tel"
            />
            {fieldErrors.phone ? <p className="field-message error">{tr(fieldErrors.phone)}</p> : null}
          </label>
        </div>
      </div>
    </section>
  )
}
