import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PatientBasicInfoSection } from '../components/analysis/PatientBasicInfoSection.jsx'
import { LoadingOverlay } from '../components/common/LoadingOverlay.jsx'
import { useExaminationSession } from '../context/examinationSession.js'
import { useLanguage } from '../context/language.js'
import { createExamination } from '../services/examinationApi.js'
import { getHealthCardReader } from '../services/healthCard/getHealthCardReader.ts'
import { createDemoHistoryRecord, saveHistoryRecord } from '../services/historyStorage.js'
import { createEmptyPatientDraft } from '../utils/patientDraft.js'
import { validatePatientDraft } from '../utils/patientValidation.ts'

const templateOptions = [
  '範例檢體 A - 高濃度正常',
  '範例檢體 B - 型態異常案例',
  '範例檢體 C - 低濃度待追蹤',
]

export function AnalysisUploadPage() {
  const { t } = useLanguage()
  const [selectedTemplate, setSelectedTemplate] = useState(templateOptions[0])
  const [sampleId, setSampleId] = useState('SMP-2026-001')
  const [includeMotility, setIncludeMotility] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [patientDraft, setPatientDraft] = useState(createEmptyPatientDraft)
  const [patientInputMode, setPatientInputMode] = useState('manual')
  const [patientFieldErrors, setPatientFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const navigate = useNavigate()
  const { setActiveExamination } = useExaminationSession()
  const healthCardReader = useMemo(() => getHealthCardReader(), [])

  const canStartAnalysis = useMemo(() => {
    return Object.keys(validatePatientDraft(patientDraft)).length === 0 && sampleId.trim().length > 0
  }, [patientDraft, sampleId])

  const handleStartAnalysis = () => {
    const patientErrors = validatePatientDraft(patientDraft)
    setPatientFieldErrors(patientErrors)

    if (Object.keys(patientErrors).length > 0 || !sampleId.trim()) {
      setFormError('請完成病人基本資料與檢體編號後再開始分析')
      return
    }

    const result = createExamination({
      patientDraft,
      specimen: {
        sampleId,
        includeMotility,
        templateLabel: selectedTemplate,
      },
    })

    if ('errors' in result) {
      setPatientFieldErrors((prev) => ({ ...prev, ...result.errors }))
      setFormError('資料驗證未通過，請修正後再試')
      return
    }

    setFormError('')
    setActiveExamination({
      examination: result.examination,
      patient: result.patient,
    })

    saveHistoryRecord(
      createDemoHistoryRecord({
        sampleId,
        patientId: result.patient.patientId,
        examinationId: result.examination.examinationId,
      }),
    )

    setIsLoading(true)
    window.setTimeout(() => {
      navigate('/analysis/result')
    }, 1500)
  }

  return (
    <div className="page-shell upload-page">
      <LoadingOverlay isOpen={isLoading} />

      <header className="page-header">
        <div>
          <p className="eyebrow">{t.uploadSettings}</p>
          <h2>{t.newTest}</h2>
        </div>
      </header>

      <PatientBasicInfoSection
        draft={patientDraft}
        onDraftChange={setPatientDraft}
        inputMode={patientInputMode}
        onInputModeChange={setPatientInputMode}
        reader={healthCardReader}
        fieldErrors={patientFieldErrors}
        onFieldErrorsChange={setPatientFieldErrors}
      />

      <section className="upload-card">
        <div className="form-section">
          <h3>{t.basicInfo}</h3>

          <div className="field-row">
            <label>
              <span>{t.patientSampleId}</span>
              <input type="text" value={sampleId} onChange={(event) => setSampleId(event.target.value)} />
            </label>
          </div>

          <div className="check-list">
            <label className="check-item">
              <input type="checkbox" checked readOnly />
              <span>{t.spermCount}</span>
              <strong>{t.required}</strong>
            </label>

            <label className="check-item">
              <input type="checkbox" checked readOnly />
              <span>{t.morphologyAssessment}</span>
              <strong>{t.required}</strong>
            </label>

            <label className="toggle-item">
              <span>{t.motilityEstimate}</span>
              <button
                type="button"
                className={includeMotility ? 'switch switch-on' : 'switch'}
                onClick={() => setIncludeMotility((prev) => !prev)}
                aria-label={t.toggleMotility}
              >
                <span className="switch-thumb" />
              </button>
            </label>
          </div>
        </div>
      </section>

      <section className="upload-card">
        <div className="form-section">
          <h3>{t.imageSource}</h3>

          <div className="source-grid">
            <div className="source-option highlight">
              <h4>{t.cloudTemplate}</h4>
              <select
                value={selectedTemplate}
                onChange={(event) => setSelectedTemplate(event.target.value)}
              >
                {templateOptions.map((option, index) => (
                  <option key={option} value={option}>
                    {t[`template${String.fromCharCode(65 + index)}`]}
                  </option>
                ))}
              </select>

              <div className="template-preview">
                <div className="template-thumb template-a" />
                <div className="template-thumb template-b" />
                <div className="template-thumb template-c" />
              </div>
            </div>

            <div className="source-option">
              <h4>{t.cameraUpload}</h4>
              <div className="upload-box">
                <span>{t.openCamera}</span>
                <button type="button" className="secondary-btn small">
                  {t.chooseImage}
                </button>
              </div>
            </div>

            <div className="source-option muted">
              <h4>{t.videoExtract}</h4>
              <div className="upload-box">
                <span>{t.videoMode}</span>
                <button type="button" className="secondary-btn small">
                  {t.uploadVideo}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {formError ? <p className="form-banner error">{formError}</p> : null}

      <button
        type="button"
        className="primary-btn full-width"
        onClick={handleStartAnalysis}
        disabled={!canStartAnalysis || isLoading}
        aria-disabled={!canStartAnalysis || isLoading}
      >
        🚀 {t.startCloudAnalysis}
      </button>
    </div>
  )
}
