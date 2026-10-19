import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PatientBasicInfoSection } from '../components/analysis/PatientBasicInfoSection.jsx'
import { LoadingOverlay } from '../components/common/LoadingOverlay.jsx'
import { useExaminationSession } from '../context/examinationSession.js'
import { useLanguage } from '../context/language.js'
import { newSubmission, submitDemoExamination, validateImage } from '../services/cloudApi.js'
import { getHealthCardReader } from '../services/healthCard/getHealthCardReader.ts'
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
  const [selectedImage, setSelectedImage] = useState(null)
  const submissionRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const { setActiveExamination } = useExaminationSession()
  const healthCardReader = useMemo(() => getHealthCardReader(), [])

  const canStartAnalysis = useMemo(() => {
    return Object.keys(validatePatientDraft(patientDraft)).length === 0 && sampleId.trim().length > 0
  }, [patientDraft, sampleId])

  const handleStartAnalysis = async () => {
    if (isLoading) return
    const patientErrors = validatePatientDraft(patientDraft)
    setPatientFieldErrors(patientErrors)

    if (Object.keys(patientErrors).length > 0 || !sampleId.trim()) {
      setFormError('請完成病人基本資料與檢體編號後再開始分析')
      return
    }

    setIsLoading(true)
    setFormError('')
    submissionRef.current ??= newSubmission()
    try {
      const result = await submitDemoExamination({
        patientDraft, specimen: { sampleId, includeMotility, templateLabel: selectedTemplate },
        file: selectedFile, operation: submissionRef.current,
      })
      if ('errors' in result) {
        setPatientFieldErrors(result.errors)
        setFormError('資料驗證未通過，請修正後再試')
        return
      }
      setActiveExamination({ examination: result.examination, patient: result.patient,
        historyRecordId: result.recordId, sampleId, image: selectedImage, includeMotility })
      navigate(`/analysis/result?record=${result.recordId}`)
    } catch (error) {
      setFormError(`${error.message} 若部分資料已儲存，重試將沿用同一檢測，不會刪除已有資料。`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageSelected = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try { validateImage(file) } catch (error) {
      setFormError(error.message)
      event.target.value = ''
      return
    }
    setSelectedFile(file)
    setFormError('')
    const reader = new FileReader()
    reader.onload = () => setSelectedImage({ name: file.name, dataUrl: reader.result })
    reader.readAsDataURL(file)
  }

  return (
    <div className="page-shell upload-page">
      <LoadingOverlay isOpen={isLoading} />

      <p className="form-banner" role="note">示範分析：目前使用固定範例數值與標註，並非實際影像分析，不可作為臨床判讀依據。按下開始後，會儲存病患、檢測與示範結果至雲端，並上傳本次選取的影像至私有空間。</p>
      <header className="page-header">
        <div>
          <p className="eyebrow">{t.uploadSettings}</p>
          <h2>{t.newTest}</h2>
        </div>
      </header>

      <fieldset disabled={isLoading} style={{ display: 'contents' }}>
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
                disabled={isLoading}
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
                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={handleImageSelected}
                />
                <button
                  type="button"
                  className="secondary-btn small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t.chooseImage}
                </button>
                {selectedImage ? <small className="upload-file-name">{selectedImage.name}</small> : null}
              </div>
            </div>

            <div className="source-option muted">
              <h4>{t.videoExtract}</h4>
              <div className="upload-box">
                <span>{t.videoMode}</span>
                <button type="button" className="secondary-btn small" disabled>
                  {t.uploadVideo}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      </fieldset>
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
