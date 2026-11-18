import { translateText as tr } from '../i18n/translate.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { PatientSelector } from '../components/analysis/PatientSelector.jsx'
import { describeMedia, MEDIA_ACCEPT } from '../services/mediaFiles.js'
import { LoadingOverlay } from '../components/common/LoadingOverlay.jsx'
import { useExaminationSession } from '../context/examinationSession.js'
import { useLanguage } from '../context/language.js'
import { getCloudRecord, newSubmission, submitDemoExamination, reserveSpecimenNumber } from '../services/cloudApi.js'
import { validatePatientDraft } from '../utils/patientValidation.ts'

const templateOptions = [
  '範例檢體 A - 高濃度正常',
  '範例檢體 B - 型態異常案例',
  '範例檢體 C - 低濃度待追蹤',
]

export function AnalysisUploadPage() {
  const { t } = useLanguage()
  const [selectedTemplate, setSelectedTemplate] = useState(templateOptions[0])
  const [includeMotility, setIncludeMotility] = useState(true)
  const [showProcessGuide, setShowProcessGuide] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [confirmedPatient, setConfirmedPatient] = useState(null)
  const [searchParams] = useSearchParams()
  const resumeRecordId = searchParams.get('record')
  const [resumeState, setResumeState] = useState({ loading: Boolean(resumeRecordId), error: '' })
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
    if (!resumeRecordId) return undefined
    let active = true
    setResumeState({ loading: true, error: '' })
    getCloudRecord(resumeRecordId).then((record) => {
      if (!['影像待上傳', '待分析'].includes(record.processingState)) {
        throw new Error('這筆檢體目前不需要補上傳影像，請回儀表板重新整理。')
      }
      if (!active) return
      submissionRef.current = { examinationId: record.examinationId, recordId: record.id, imagePath: null }
      setConfirmedPatient({
        kind: 'existing',
        patientId: record.patientId,
        draft: {
          patientName: record.patient.name,
          nationalId: record.patient.nationalId,
          birthDate: record.patient.birthDate,
          sex: record.patient.rawSex || 'UNKNOWN',
          phone: record.patient.phone === '—' ? '' : record.patient.phone,
          email: record.patient.email || '',
          healthCardNumber: record.patient.healthCardNumber || '',
          identityStatus: record.patient.identityStatus || '',
          patientDataSource: record.patient.patientDataSource || 'manual',
        },
      })
      setSampleNumber({ value: record.sampleId, error: '', loading: false })
      if (record.templateLabel && templateOptions.includes(record.templateLabel)) setSelectedTemplate(record.templateLabel)
      setIncludeMotility(record.includeMotility !== false)
      setResumeState({ loading: false, error: '' })
    }).catch((error) => {
      if (active) setResumeState({ loading: false, error: error.message || '無法載入待上傳檢體。' })
    })
    return () => { active = false }
  }, [resumeRecordId])

  useEffect(() => {
    if (!isLoading) return
    const timer = window.setInterval(() => setElapsedSeconds(value => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [isLoading])

  useEffect(() => {
    if (!confirmedPatient || resumeRecordId) return
    let active = true
    submissionRef.current ??= newSubmission()
    const operation = submissionRef.current
    reserveSpecimenNumber(operation.examinationId).then(value => {
      if (active) setSampleNumber({ value, error: '', loading: false })
    }).catch(error => {
      if (active) setSampleNumber({ value: '', error: error.message, loading: false })
    })
    return () => { active = false }
  }, [confirmedPatient, numberAttempt, resumeRecordId])

  const canStartAnalysis = useMemo(() => {
    return Boolean(sampleNumber.value) && Boolean(patientDraft)
      && (!resumeRecordId || Boolean(selectedFile))
      && Object.keys(validatePatientDraft(patientDraft)).length === 0
  }, [patientDraft, resumeRecordId, sampleNumber.value, selectedFile])

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
          <h2>{resumeRecordId ? t.resumeUploadTitle : t.newTest}</h2>
        </div>
        <div className="upload-hero-art" aria-hidden="true">
          <svg viewBox="0 0 260 150" role="presentation" focusable="false">
            <defs>
              <linearGradient id="lab-art-card" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#f7fffc" />
                <stop offset="1" stopColor="#e5f5ef" />
              </linearGradient>
              <linearGradient id="lab-art-coat" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#83c9b5" />
                <stop offset="1" stopColor="#4eaa99" />
              </linearGradient>
            </defs>
            <path d="M10 117C48 93 58 18 124 24s88 48 126 5" fill="none" stroke="#b8e4d7" strokeWidth="2" strokeDasharray="3 8" />
            <path d="M12 129c42-17 48-61 93-60 47 1 55 45 138 13" fill="none" stroke="#d4eee5" strokeWidth="2" />
            <circle cx="226" cy="32" r="21" fill="#f7d9cb" opacity=".62" />
            <circle cx="39" cy="42" r="16" fill="#ccece1" opacity=".72" />

            <rect x="171" y="22" width="75" height="70" rx="13" fill="url(#lab-art-card)" stroke="#acd8ca" strokeWidth="1.5" />
            <path d="M181 73c8-14 14-2 21-15s12 7 20-4 11 0 16-8" fill="none" stroke="#41a995" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M181 79h54" stroke="#d0e9e0" strokeWidth="2" strokeLinecap="round" />
            <circle cx="202" cy="58" r="4" fill="#ef936f" stroke="#fff" strokeWidth="1.5" />
            <circle cx="223" cy="54" r="4" fill="#ef936f" stroke="#fff" strokeWidth="1.5" />
            <path d="M197 94v8m22-8v8m-32 0h52" stroke="#6caf9e" strokeWidth="3" strokeLinecap="round" />

            <path d="M82 121c-1-11 2-20 10-28l11-11 13 12-9 15c-4 7-5 13-5 20H82z" fill="url(#lab-art-coat)" />
            <path d="M80 62c0-16 12-27 27-27 14 0 25 10 25 25 0 9-4 15-11 20l-1 12-25-2 1-11C87 75 80 70 80 62z" fill="#f2c6a5" />
            <path d="M80 61c-1-19 12-32 30-32 12 0 21 7 25 18-8-4-14-4-22-2-9 2-15 8-24 9l-1 15c-5-1-8-4-8-8z" fill="#276f69" />
            <path d="M124 62c3 1 5 4 4 7-1 3-4 5-7 5" fill="none" stroke="#d99979" strokeWidth="2" strokeLinecap="round" />
            <circle cx="119" cy="60" r="1.7" fill="#355b58" />
            <path d="M91 120h33l12 10H78z" fill="#fff" stroke="#b8ddd1" strokeWidth="1.5" />

            <path d="M145 113h19v5h-19z" fill="#fff" stroke="#75b6a6" strokeWidth="2" />
            <path d="M154 111V88l-12-14 8-7 17 17-3 27" fill="none" stroke="#267e76" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m141 73-7-7 10-10 8 7" fill="#f1a17d" stroke="#267e76" strokeWidth="2" strokeLinejoin="round" />
            <path d="M135 90h28" stroke="#267e76" strokeWidth="4" strokeLinecap="round" />
            <path d="M137 119h39" stroke="#76b8a8" strokeWidth="4" strokeLinecap="round" />
            <circle cx="164" cy="118" r="3" fill="#ef936f" />
          </svg>
        </div>
      </header>

      {resumeRecordId && resumeState.loading && <p role="status">{tr("正在載入待處理檢體…")}</p>}
      {resumeRecordId && resumeState.error && <div className="form-banner error" role="alert"><span>{tr(resumeState.error)}</span><button type="button" className="secondary-btn small" onClick={() => navigate('/dashboard')}>{tr("返回儀表板")}</button></div>}
      {resumeRecordId && !resumeState.loading && !resumeState.error && <div className="resume-upload-notice"><strong>{t.resumeUploadNotice}</strong><span>{sampleNumber.value ? `${t.sampleId} ${sampleNumber.value}` : ''}</span></div>}

      {(!resumeRecordId || (!resumeState.loading && !resumeState.error)) && <fieldset disabled={locked} style={{ display: 'contents' }}>
        <PatientSelector confirmed={confirmedPatient} onConfirm={patient => { setSampleNumber({ value: '', error: '', loading: true }); setConfirmedPatient(patient) }} locked={locked} allowChangePatient={!resumeRecordId}
          onChangePatient={() => { clearFile(); submissionRef.current = null; setSampleNumber({ value: '', error: '', loading: false }); setConfirmedPatient(null); setFormError('') }} />
      </fieldset>}
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
          {resumeRecordId && <p className="resume-upload-hint">{tr("請選擇本機影像或影片；完成上傳後才會建立分析結果。")}</p>}

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
        <h3>{tr("本次檔案")}</h3><p>{resumeRecordId ? tr("照片最多 10 MB，影片最多 50 MB。請選擇檢體影像後再開始分析。") : tr("一次一個檔案：照片最多 10 MB、影片最多 50 MB。未選檔案時將使用預設模擬影像與數值。")}</p>
        {selectedMedia ? <div className="selected-media-preview">
          <p>{selectedMedia.name} · {(selectedFile.size / 1_000_000).toFixed(2)} MB</p>
          {selectedMedia.kind === 'video'
            ? <video src={selectedMedia.url} controls playsInline preload="metadata" />
            : <img src={selectedMedia.url} alt={tr("本次選取的照片預覽")} />}
          <button type="button" className="secondary-btn small" onClick={clearFile}>{tr("移除本次選取")}</button>
        </div> : <p>{resumeRecordId ? t.resumeUploadNotice : `${tr("預設影像：")}${selectedTemplate}`}</p>}
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
        {isLoading ? tr("正在上傳與準備結果…") : resumeRecordId ? t.chooseUploadAndAnalyze : tr("開始分析")}
      </button>

      <div className="upload-process-toggle-row">
        <button
          type="button"
          className="workflow-toggle-btn"
          aria-expanded={showProcessGuide}
          aria-controls="upload-process-guide"
          onClick={() => setShowProcessGuide((visible) => !visible)}
        >
          {showProcessGuide ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
          {showProcessGuide ? t.hideWorkflow : t.showWorkflow}
        </button>
      </div>

      {showProcessGuide && <section id="upload-process-guide" className="upload-process-guide" aria-label={t.uploadProcessEyebrow}>
        <div className="upload-process-intro">
          <p className="eyebrow">SPERMAI · {t.uploadProcessEyebrow}</p>
          <h3>{t.uploadProcessTitle}</h3>
        </div>
        <ol className="upload-process-steps">
          <li><span>01</span><strong>{t.uploadStepPatient}</strong></li>
          <li><span>02</span><strong>{t.uploadStepSpecimen}</strong></li>
          <li><span>03</span><strong>{t.uploadStepAnalysis}</strong></li>
          <li><span>04</span><strong>{t.uploadStepResult}</strong></li>
        </ol>
        <div className="upload-process-orbit" aria-hidden="true">
          <span className="orbit-dot orbit-dot-one" />
          <span className="orbit-dot orbit-dot-two" />
          <span className="orbit-dot orbit-dot-three" />
        </div>
      </section>}
    </div>
  )
}
