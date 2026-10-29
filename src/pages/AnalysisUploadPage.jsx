import { translateText as tr } from '../i18n/translate.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PatientSelector } from '../components/analysis/PatientSelector.jsx'
import { describeMedia, MEDIA_ACCEPT } from '../services/mediaFiles.js'
import { LoadingOverlay } from '../components/common/LoadingOverlay.jsx'
import { useExaminationSession } from '../context/examinationSession.js'
import { useLanguage } from '../context/language.js'
import { newSubmission, submitDemoExamination, reserveSpecimenNumber } from '../services/cloudApi.js'
import { validatePatientDraft } from '../utils/patientValidation.ts'

const templateOptions = [
  '範例檢體 A - 高濃度正常',
  '範例檢體 B - 型態異常案例',
  '範例檢體 C - 低濃度待追蹤',
]

export function AnalysisUploadPage() {
  const { t } = useLanguage()
  const [selectedTemplate, setSelectedTemplate] = useState(templateOptions[0])
  const [includeMotility, setIncludeMotility] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmedPatient, setConfirmedPatient] = useState(null)
  const [sampleNumber, setSampleNumber] = useState({ value: '', error: '', loading: false })
  const [numberAttempt, setNumberAttempt] = useState(0)
  const [hasAttempted, setHasAttempted] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ label: '', percent: null, loaded: null, total: null })
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const abortRef = useRef(null)
  const [formError, setFormError] = useState('')
  const [selectedMedia, setSelectedMedia] = useState(null)
  const previewRef = useRef(null)
  const cameraInputRef = useRef(null)
  const submissionRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const { setActiveExamination } = useExaminationSession()
  const locked = isLoading || hasAttempted
  const patientDraft = confirmedPatient?.draft
  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current) }, [])

  useEffect(() => () => abortRef.current?.abort(), [])
  useEffect(() => {
    if (!isLoading) return
    const timer = window.setInterval(() => setElapsedSeconds(value => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isLoading])

  useEffect(() => {
    if (!confirmedPatient) return
    let active = true
    submissionRef.current ??= newSubmission()
    const operation = submissionRef.current
    reserveSpecimenNumber(operation.examinationId).then(value => {
      if (active) setSampleNumber({ value, error: '', loading: false })
    }).catch(error => {
      if (active) setSampleNumber({ value: '', error: error.message, loading: false })
    })
    return () => { active = false }
  }, [confirmedPatient, numberAttempt])

  const canStartAnalysis = useMemo(() => {
    return Boolean(sampleNumber.value) && Boolean(patientDraft) && Object.keys(validatePatientDraft(patientDraft)).length === 0
  }, [patientDraft, sampleNumber.value])

  const handleStartAnalysis = async () => {
    if (isLoading || !sampleNumber.value) return
    if (!patientDraft) { setFormError(tr("請先確認病患。")); return }
    const patientErrors = validatePatientDraft(patientDraft)

    if (Object.keys(patientErrors).length > 0) {
      setFormError(tr("請完成病患基本資料後再開始分析"))
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setElapsedSeconds(0)
    setUploadProgress({ label: tr("正在準備儲存"), percent: null, loaded: null, total: null })
    setIsLoading(true)
    setFormError('')
    submissionRef.current ??= newSubmission()
    setHasAttempted(true)
    try {
      const result = await submitDemoExamination({
        patientDraft, specimen: { includeMotility, templateLabel: selectedTemplate },
        file: selectedFile, operation: submissionRef.current,
        selectedPatientId: confirmedPatient.patientId, createOnly: confirmedPatient.kind === 'new',
        signal: controller.signal,
        onStatus: label => setUploadProgress({ label, percent: null, loaded: null, total: null }),
        onProgress: progress => setUploadProgress({ label: tr("正在上傳檔案"), ...progress }),
      })
      if ('errors' in result) {
        setHasAttempted(false)
        setFormError(tr("資料驗證未通過，請修正後再試"))
        return
      }
      setActiveExamination({ examination: result.examination, patient: result.patient,
        historyRecordId: result.recordId, sampleId: result.examination.sampleId, includeMotility })
      navigate(`/analysis/result?record=${result.recordId}`)
    } catch (error) {
      if (!submissionRef.current.patientId) setHasAttempted(false)
      setFormError(tr("{{0}} 若部分資料已儲存，重試將沿用同一檢測，不會刪除已有資料。", [tr(error.message)]))
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setIsLoading(false)
    }
  }

  const handleFileSelected = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const info = describeMedia(file)
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
      const url = URL.createObjectURL(file)
      previewRef.current = url
      setSelectedMedia({ ...info, url, name: file.name })
      setSelectedFile(file)
      setFormError('')
    } catch (error) { setFormError(error.message) }
    event.target.value = ''
  }
  const clearFile = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setSelectedFile(null); setSelectedMedia(null)
  }

  return (
    <div className="page-shell upload-page">
      <LoadingOverlay isOpen={isLoading} title={tr("正在儲存檢測與上傳檔案")} description={null} status={uploadProgress.label}
        progress={uploadProgress} elapsedSeconds={elapsedSeconds} onCancel={() => abortRef.current?.abort()} />

      <header className="page-header">
        <div>
          <p className="eyebrow">{t.uploadSettings}</p>
          <h2>{t.newTest}</h2>
        </div>
      </header>

      <fieldset disabled={locked} style={{ display: 'contents' }}>
        <PatientSelector confirmed={confirmedPatient} onConfirm={patient => { setSampleNumber({ value: '', error: '', loading: true }); setConfirmedPatient(patient) }} locked={locked}
          onChangePatient={() => { clearFile(); submissionRef.current = null; setSampleNumber({ value: '', error: '', loading: false }); setConfirmedPatient(null); setFormError('') }} />
      </fieldset>
      {confirmedPatient && <fieldset disabled={locked} style={{ display: 'contents' }}>

      <section className="upload-card">
        <div className="form-section">
          <h3>{t.basicInfo}</h3>

          <div className="specimen-number-display">
            <span>{tr("檢體編號")}</span>
            <strong aria-live="polite">{sampleNumber.value || (sampleNumber.loading ? tr("產生中…") : tr("尚未取得編號"))}</strong>
            {sampleNumber.error && <><p role="alert">{tr(sampleNumber.error)}</p><button type="button" className="secondary-btn small" onClick={() => { setSampleNumber({ value: '', error: '', loading: true }); setNumberAttempt(value => value + 1) }}>{tr("重新產生編號")}</button></>}
          </div>

          <div className="check-list">
            <label className="check-item">
              <input type="checkbox" checked readOnly />
              <span>{t.concentration} (×10⁶/mL)</span>
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
                disabled={locked}
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
              <h4>{tr("本機照片／影片")}</h4>
              <div className="upload-box">
                <span>{tr("照片最多 10 MB，影片最多 50 MB")}</span>
                <input
                  ref={fileInputRef}
                  className="visually-hidden"
                  type="file"
                  accept={MEDIA_ACCEPT}
                  onChange={handleFileSelected}
                />
                <button
                  type="button"
                  className="secondary-btn small"
                  onClick={() => fileInputRef.current?.click()}
                >{tr("選擇照片或影片")}</button>
              </div>
            </div>

            <div className="source-option">
              <h4>{tr("相機拍攝（照片）")}</h4>
              <div className="upload-box">
                <span>{tr("直接拍照，或使用上方入口選擇檔案")}</span>
                <input ref={cameraInputRef} className="visually-hidden" type="file"
                  accept="image/jpeg,image/png,image/webp" capture="environment" onChange={handleFileSelected} />
                <button type="button" className="secondary-btn small" onClick={() => cameraInputRef.current?.click()}>{tr("開啟相機")}</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="upload-card">
        <h3>{tr("本次檔案")}</h3><p>{tr("一次一個檔案：照片最多 10 MB、影片最多 50 MB。未選檔案時使用示範範本。")}</p>
        {selectedMedia ? <div className="selected-media-preview">
          <p>{selectedMedia.name} · {(selectedFile.size / 1_000_000).toFixed(2)} MB</p>
          {selectedMedia.kind === 'video'
            ? <video src={selectedMedia.url} controls playsInline preload="metadata" />
            : <img src={selectedMedia.url} alt={tr("本次選取的照片預覽")} />}
          <button type="button" className="secondary-btn small" onClick={clearFile}>{tr("移除本次選取")}</button>
        </div> : <p>{tr("示範範本：")}{selectedTemplate}</p>}
      </section>
      </fieldset>}
      {hasAttempted && !isLoading && formError && <p role="note">{tr("部分資料可能已儲存，已鎖定本次病患與檔案；請在本頁重試以沿用原檢測。")}</p>}
      {formError ? <p className="form-banner error">{tr(formError)}</p> : null}

      <button
        type="button"
        className="primary-btn full-width"
        onClick={handleStartAnalysis}
        disabled={!canStartAnalysis || isLoading}
        aria-disabled={!canStartAnalysis || isLoading}
      >
        {isLoading ? tr("正在上傳與準備結果…") : tr("開始分析")}
      </button>
    </div>
  )
}
