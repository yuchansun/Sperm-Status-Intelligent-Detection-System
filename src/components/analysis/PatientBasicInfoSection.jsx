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
        {label}
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
            {revealed ? '隱藏' : '顯示'}
          </button>
        ) : null}
      </div>
      {!revealed && value ? (
        <p className="field-message muted-preview">預覽：{maskFn(value)}</p>
      ) : null}
      {error ? <p className="field-message error">{error}</p> : null}
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
}) {
  const [readStatus, setReadStatus] = useState('idle')
  const [readMessage, setReadMessage] = useState('')

  const patchDraft = (patch) => {
    onDraftChange({ ...draft, ...patch })
  }

  const handleReadCard = async () => {
    setReadStatus('reading')
    setReadMessage('卡片讀取中，請勿移動健保卡…')

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
      setReadMessage('讀卡成功，請確認病人資料是否正確')
    } catch (error) {
      const message =
        error instanceof HealthCardReadError
          ? error.message
          : '讀卡失敗，請稍後再試或改用手動輸入'
      setReadStatus('error')
      setReadMessage(message)
    }
  }

  const switchToManual = () => {
    onInputModeChange('manual')
    patchDraft({ patientDataSource: 'manual' })
    setReadStatus('manual_mode')
    setReadMessage('已切換為手動輸入，先前資料仍保留供確認')
  }

  const isComplete = isPatientDraftComplete(draft)

  return (
    <section className="upload-card patient-basic-card">
      <div className="form-section">
        <div className="panel-header">
          <h3>病人基本資料</h3>
          {!isComplete ? <span className="chip warning">必填未完成</span> : <span className="chip neutral">已完成</span>}
        </div>

        <div className="patient-input-mode">
          <button
            type="button"
            className={inputMode === 'health_card' ? 'segment-btn active' : 'segment-btn'}
            onClick={() => onInputModeChange('health_card')}
          >
            讀取健保卡
          </button>
          <button
            type="button"
            className={inputMode === 'manual' ? 'segment-btn active' : 'segment-btn'}
            onClick={switchToManual}
          >
            無健保卡／手動輸入
          </button>
        </div>

        {inputMode === 'health_card' ? (
          <div className="health-card-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={handleReadCard}
              disabled={readStatus === 'reading'}
            >
              {readStatus === 'reading' ? '讀取中…' : '讀取健保卡'}
            </button>
            {readStatus === 'error' ? (
              <>
                <button type="button" className="secondary-btn" onClick={handleReadCard}>
                  重新讀取
                </button>
                <button type="button" className="secondary-btn" onClick={switchToManual}>
                  改用手動輸入
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {readMessage ? (
          <p
            className={`read-status ${readStatus === 'error' ? 'error' : readStatus === 'success' ? 'success' : ''}`}
            role="status"
          >
            {readMessage}
          </p>
        ) : null}

        <div className="field-row patient-fields">
          <label className={fieldErrors.patientName ? 'field-error' : undefined}>
            <span>姓名 *</span>
            <input
              type="text"
              value={draft.patientName}
              onChange={(event) => patchDraft({ patientName: event.target.value })}
              autoComplete="name"
            />
            {fieldErrors.patientName ? <p className="field-message error">{fieldErrors.patientName}</p> : null}
          </label>

          <SensitiveField
            label="身分證字號／病歷識別碼"
            value={draft.nationalId}
            onChange={(value) => patchDraft({ nationalId: value })}
            maskFn={maskNationalId}
            error={fieldErrors.nationalId}
            required
          />

          <label className={fieldErrors.birthDate ? 'field-error' : undefined}>
            <span>出生日期 *</span>
            <input
              type="date"
              value={draft.birthDate}
              onChange={(event) => patchDraft({ birthDate: event.target.value })}
            />
            {fieldErrors.birthDate ? <p className="field-message error">{fieldErrors.birthDate}</p> : null}
          </label>

          <label className={fieldErrors.sex ? 'field-error' : undefined}>
            <span>生理性別</span>
            <select
              value={draft.sex}
              onChange={(event) => patchDraft({ sex: event.target.value })}
            >
              <option value="UNKNOWN">請選擇</option>
              <option value="M">男</option>
              <option value="F">女</option>
            </select>
            {fieldErrors.sex ? <p className="field-message error">{fieldErrors.sex}</p> : null}
          </label>

          {draft.patientDataSource === 'health_card' || draft.healthCardNumber ? (
            <SensitiveField
              label="健保卡卡號"
              value={draft.healthCardNumber}
              onChange={(value) => patchDraft({ healthCardNumber: value })}
              maskFn={maskHealthCardNumber}
              error={fieldErrors.healthCardNumber}
            />
          ) : null}

          {draft.identityStatus ? (
            <label>
              <span>身分註記</span>
              <input type="text" value={draft.identityStatus} readOnly />
            </label>
          ) : null}

          <label className={fieldErrors.phone ? 'field-error' : undefined}>
            <span>聯絡電話（選填）</span>
            <input
              type="tel"
              value={draft.phone}
              onChange={(event) => patchDraft({ phone: event.target.value })}
              autoComplete="tel"
            />
            {fieldErrors.phone ? <p className="field-message error">{fieldErrors.phone}</p> : null}
          </label>
        </div>
      </div>
    </section>
  )
}
