import { translateText as tr, displayRecordSummary } from '../../i18n/translate.js'
import { PatientActions } from './PatientActions.jsx'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PatientBasicInfoSection } from './PatientBasicInfoSection.jsx'
import { searchPatients, getPatientPreview, patientToDraft, findPatientByNationalId } from '../../services/patientApi.js'
import { createEmptyPatientDraft } from '../../utils/patientDraft.js'
import { validatePatientDraft } from '../../utils/patientValidation.ts'
import { maskNationalId } from '../../utils/maskSensitive.ts'
import { getHealthCardReader } from '../../services/healthCard/getHealthCardReader.ts'

export function PatientSelector({ confirmed, onConfirm, onChangePatient, locked }) {
  const [mode, setMode] = useState('existing')
  const [term, setTerm] = useState('')
  const [search, setSearch] = useState({ rows: [], loading: false, error: '', searched: false })
  const [preview, setPreview] = useState({ patient: null, history: [], loading: false, error: '' })
  const [draft, setDraft] = useState(createEmptyPatientDraft)
  const [inputMode, setInputMode] = useState('manual')
  const [errors, setErrors] = useState({})
  const [cardLookup, setCardLookup] = useState({ loading: false, error: '' })
  const request = useRef(0)
  const selection = useRef(0)
  const mounted = useRef(true)
  const reader = useMemo(() => getHealthCardReader(), [])
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const changeMode = value => {
    request.current++; selection.current++
    setCardLookup({ loading: false, error: '' })
    setMode(value)
    setSearch(s => ({ ...s, loading: false }))
    setPreview({ patient: null, history: [], loading: false, error: '' })
  }
  const runSearch = async (append = false) => {
    const version = ++request.current
    const offset = append ? search.rows.length : 0
    setSearch(s => ({ ...s, loading: true, error: '' }))
    try {
      const rows = await searchPatients(term, offset)
      if (mounted.current && version === request.current) setSearch(s => ({ rows: append ? [...s.rows, ...rows] : rows, loading: false, error: '', searched: true, more: rows.length === 20 }))
    } catch (error) {
      if (mounted.current && version === request.current) setSearch({ rows: [], loading: false, error: error.message, searched: false })
    }
  }
  const choosePatient = async id => {
    const version = ++selection.current
    setPreview({ patient: null, history: [], loading: true, error: '' })
    try {
      const result = await getPatientPreview(id)
      if (mounted.current && version === selection.current) setPreview({ ...result, loading: false, error: '' })
    } catch (error) {
      if (mounted.current && version === selection.current) setPreview({ patient: null, history: [], loading: false, error: error.message })
    }
  }
  const resolveCardPatient = async card => {
    const version = ++selection.current
    setCardLookup({ loading: true, error: '' })
    try {
      const match = await findPatientByNationalId(card.nationalId)
      if (!mounted.current || version !== selection.current) return
      if (!match) return
      const result = await getPatientPreview(match.id)
      if (!mounted.current || version !== selection.current) return
      request.current++
      setMode('existing')
      setSearch({ rows: [], loading: false, error: '', searched: false })
      setPreview({ ...result, loading: false, error: '' })
    } catch (error) {
      if (mounted.current && version === selection.current) setCardLookup({ loading: false, error: error.message })
      throw error
    } finally {
      if (mounted.current && version === selection.current) setCardLookup(state => ({ ...state, loading: false }))
    }
  }
  if (confirmed) return <section className="upload-card patient-confirmed">
    <div className="panel-header"><h3>{tr("已確認本次病患")}</h3><span className="chip success">{confirmed.kind === 'existing' ? tr("既有病患") : tr("待新增病患")}</span></div>
    <strong>{confirmed.draft.patientName}</strong>
    <p>{maskNationalId(confirmed.draft.nationalId)}{tr("· 出生日期")}{confirmed.draft.birthDate}</p>
    <p>{confirmed.kind === 'existing' ? tr("沿用病患主檔，開始本次檢測時不會覆寫基本資料。") : tr("按下開始後才會建立病患與本次檢測。")}</p>
    <button type="button" className="secondary-btn small" disabled={locked} onClick={onChangePatient}>{tr("更換／重新確認病患")}</button>
  </section>
  return <div className="patient-selection">
    <section className="upload-card">
      <div className="panel-header"><h3>{tr("選擇本次病患")}</h3><span className="chip neutral">{tr("先確認病患，再設定檢測")}</span></div>
      <div className="patient-input-mode">
        <button type="button" className={mode === 'existing' ? 'segment-btn active' : 'segment-btn'} onClick={() => changeMode('existing')}>{tr("搜尋既有病患")}</button>
        <button type="button" className={mode === 'new' ? 'segment-btn active' : 'segment-btn'} onClick={() => changeMode('new')}>{tr("新增病患／讀取健保卡")}</button>
      </div>
      {mode === 'existing' && <>
        <form className="patient-search-form" onSubmit={event => { event.preventDefault(); runSearch() }}>
          <label htmlFor="patient-search">{tr("姓名或身分證／病歷識別碼（至少 2 字）")}</label>
          <div><input id="patient-search" type="search" value={term} onChange={event => {
            request.current++
            setTerm(event.target.value)
            setSearch({ rows: [], loading: false, error: '', searched: false })
          }} autoComplete="off" /><button type="submit" className="primary-btn small" disabled={search.loading || term.trim().length < 2}>{tr("搜尋")}</button></div>
        </form>
        {search.loading && <p role="status">{tr("搜尋中…")}</p>}
        {search.error && <p className="form-banner error" role="alert">{tr(search.error)}</p>}
        {search.searched && !search.rows.length && <p>{tr("沒有符合的病患，可以切換至新增病患。")}</p>}
        <ul className="patient-search-results">{search.rows.map(p => <li key={p.id}>
          <div><strong>{p.patient_name}</strong><small>{maskNationalId(p.national_id)} · {p.birth_date}</small></div>
          <button type="button" className="secondary-btn small" disabled={preview.loading} onClick={() => choosePatient(p.id)}>{tr("選擇並查看歷史")}</button>
        </li>)}</ul>
        {search.more && <button type="button" className="secondary-btn small" disabled={search.loading} onClick={() => runSearch(true)}>{tr("載入更多病患")}</button>}
      </>}
    </section>
    {mode === 'new' && <>
      <PatientBasicInfoSection draft={draft} onDraftChange={value => { selection.current++; setCardLookup({ loading: false, error: '' }); setDraft(value) }} inputMode={inputMode} onInputModeChange={setInputMode}
        reader={reader} onCardRead={resolveCardPatient} fieldErrors={errors} onFieldErrorsChange={setErrors} />
      {cardLookup.loading && <p role="status">{tr("正在比對病患與讀取歷史…")}</p>}
      {cardLookup.error && <p role="alert">{tr(cardLookup.error)}{tr("請重新讀卡。")}</p>}
      <button type="button" className="primary-btn" disabled={cardLookup.loading || Boolean(cardLookup.error)} onClick={() => {
        const validation = validatePatientDraft(draft); setErrors(validation)
        if (!Object.keys(validation).length) onConfirm({ kind: 'new', draft: { ...draft } })
      }}>{tr("確認病患資料，繼續本次檢測")}</button>
    </>}
    {mode === 'existing' && preview.loading && <p role="status">{tr("正在讀取病患歷史與備註…")}</p>}
    {mode === 'existing' && preview.error && <p className="form-banner error" role="alert">{tr(preview.error)}{tr("請重新選擇病患以重試。")}</p>}
    {mode === 'existing' && preview.patient && <section className="upload-card patient-history-preview">
      <div className="panel-header"><h3>{preview.patient.patient_name}{tr("· 檢測前確認")}</h3><span className="chip neutral">{tr("歷史預覽")}</span></div>
      <p>{tr("出生日期：")}{preview.patient.birth_date} · Email：{preview.patient.email || tr("未填寫")}</p>
      <PatientActions key={preview.patient.id} patientId={preview.patient.id}
        onSaved={() => choosePatient(preview.patient.id)}
        onDeleted={() => { selection.current++; setPreview({ patient: null, history: [], loading: false, error: '' }); setSearch({ rows: [], loading: false, error: '', searched: false }); changeMode('existing') }} />
      <h4>{tr("病患備註")}</h4><p className="patient-note-preview">{preview.patient.patient_notes?.note || tr("尚無備註")}</p>
      <h4>{tr("最近五筆檢測與摘要")}</h4>
      {!preview.history.length ? <p>{tr("此病患尚無過往分析紀錄；可以開始第一筆檢測。")}</p> : <ol className="patient-preview-records">{preview.history.map(r => <li key={r.id}>
        <strong>{r.date} · {r.sampleId}</strong><span>{tr(r.processingState)}{r.isDemo ? tr(" · 示範資料") : ''}</span>
        <p>{tr("精蟲濃度")}{r.density ?? '—'} ×10⁶/mL {tr("· 活動力")}{r.motility ?? '—'}{tr("· 正常型態")}{r.morphology ?? '—'}</p>
        <p>{displayRecordSummary(r) || tr("尚無摘要")}</p>
      </li>)}</ol>}
      {preview.hasMore && <p>{tr("此處僅列最近五筆；完整內容可至病患歷史頁查看。")}</p>}
      <button type="button" className="primary-btn" onClick={() => onConfirm({ kind: 'existing', patientId: preview.patient.id, draft: patientToDraft(preview.patient) })}>{tr("確認此病患，繼續本次檢測")}</button>
    </section>}
  </div>
}
