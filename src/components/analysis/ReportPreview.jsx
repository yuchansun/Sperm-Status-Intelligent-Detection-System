// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { translateText as tr } from '../../i18n/translate.js'
import { CORE_MEASUREMENT_STANDARDS, evaluateMeasurement, formatMeasurement } from '../../utils/measurementStandards.js'
import { getReportDraft, saveReportDraft } from '../../services/reportDraftStorage.js'
import { signedImage, signedMedia } from '../../services/cloudApi.js'

function ReportImage({ path, label, onStatus }) {
  const [image, setImage] = useState({ path: '', url: '', loading: Boolean(path), error: '' })
  useEffect(() => {
    if (!path) {
      onStatus?.('ready')
      return
    }
    let active = true
    onStatus?.('loading')
    signedImage(path)
      .then(url => { if (active) { setImage({ path, url, loading: false, error: '' }); onStatus?.('ready') } })
      .catch(() => { if (active) { setImage({ path, url: '', loading: false, error: tr('影像讀取失敗，無法放入報告。') }); onStatus?.('error') } })
    return () => { active = false }
  }, [path, onStatus])

  if (!path) return <p>{tr('未附影像')}</p>
  if (image.path !== path || image.loading) return <p role="status">{tr('影像載入中…')}</p>
  if (image.error) return <p role="alert">{tr(image.error)}</p>
  return <img className="report-image" src={image.url} alt={label} />
}

function ReportVideoFrame({ media, onStatus }) {
  const [frame, setFrame] = useState({ loading: true, src: '', error: '' })
  useEffect(() => {
    let active = true
    let video
    const capture = async () => {
      try {
        if (!media?.object_path || media.upload_status !== 'ready') throw new Error()
        const url = await signedMedia(media.bucket_id, media.object_path)
        video = document.createElement('video')
        video.crossOrigin = 'anonymous'
        video.muted = true
        video.preload = 'auto'
        video.src = url
        await new Promise((resolve, reject) => {
          video.addEventListener('loadeddata', resolve, { once: true })
          video.addEventListener('error', reject, { once: true })
          video.load()
        })
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
        const src = canvas.toDataURL('image/jpeg', 0.9)
        if (active) { setFrame({ loading: false, src, error: '' }); onStatus?.('ready') }
      } catch {
        if (active) { setFrame({ loading: false, src: '', error: tr('無法擷取影片影格，請確認影片格式與權限。') }); onStatus?.('error') }
      }
    }
    onStatus?.('loading')
    capture()
    return () => {
      active = false
      if (video) { video.removeAttribute('src'); video.load() }
    }
  }, [media?.bucket_id, media?.object_path, media?.upload_status, onStatus])

  if (frame.loading) return <p role="status">{tr('正在擷取影片影格…')}</p>
  if (frame.error) return <p role="status">{tr(frame.error)}</p>
  return <img className="report-image" src={frame.src} alt={tr('影片原始影格')} />
}

export function ReportPreview({ record }) {
  const [draft, setDraft] = useState(() => getReportDraft(record))
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [imageStatuses, setImageStatuses] = useState({ original: record.media?.media_kind === 'video' || Boolean(record.imagePath) ? 'loading' : 'ready', analyzed: record.analyzedImagePath ? 'loading' : 'ready' })
  const imagesLoading = Object.values(imageStatuses).includes('loading')
  const imageStatusHandlers = useMemo(() => Object.fromEntries(['original', 'analyzed'].map(key => [key,
    status => setImageStatuses(current => current[key] === status ? current : { ...current, [key]: status }),
  ])), [])
  const save = event => {
    event.preventDefault()
    saveReportDraft(record.id, draft)
    setEditing(false)
    setNotice(tr('報告修改已儲存'))
  }
  return <>
    <section className="report-controls" aria-label={tr('檢驗報告操作')}>
      <div className="action-group report-preview-actions">
        <button type="button" className="secondary-btn small" onClick={() => setEditing(value => !value)}>{editing ? tr('關閉編輯') : tr('編輯報告資訊')}</button>
        <button type="button" className="primary-btn small" disabled={imagesLoading} onClick={() => window.print()}>{imagesLoading ? tr('影像載入中…') : tr('列印／另存 PDF')}</button>
      </div>
      {editing && <form className="report-edit-form" onSubmit={save}>
        <label>{tr('醫療機構')}<input value={draft.hospital} onChange={event => setDraft({ ...draft, hospital: event.target.value })} placeholder={tr('請填寫醫療機構名稱')} /></label>
        <label>{tr('負責醫師')}<input value={draft.doctor} onChange={event => setDraft({ ...draft, doctor: event.target.value })} placeholder={tr('請填寫醫師姓名')} /></label>
        <label>{tr('報告備註')}<textarea rows="3" value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} /></label>
        <label>{tr('補充說明')}<textarea rows="3" value={draft.supplement} onChange={event => setDraft({ ...draft, supplement: event.target.value })} /></label>
        <div className="action-group"><button className="primary-btn small" type="submit">{tr('儲存修改')}</button><button className="secondary-btn small" type="button" onClick={() => { setDraft(getReportDraft(record)); setEditing(false) }}>{tr('取消')}</button></div>
      </form>}
      {notice && <p className="form-banner success">{notice}</p>}
    </section>
    <article className="report-print-document" id="report-preview">
      <header className="report-print-header">
        <p className="report-institution">{draft.hospital || tr('醫療機構')}</p>
        <h1>{tr('精液分析檢驗報告')}</h1>
        <p>{tr('檢驗報告')}</p>
      </header>
      <section className="report-print-patient">
        <div><span>{tr('病患姓名')}</span><strong>{record.patient?.name || '—'}</strong></div>
        <div><span>{tr('身分證字號')}</span><strong>{record.patient?.identity || '—'}</strong></div>
        <div><span>{tr('年齡')}</span><strong>{record.patient?.age ?? '—'}</strong></div>
        <div><span>{tr('檢體編號')}</span><strong>{record.sampleId || '—'}</strong></div>
        <div><span>{tr('檢測日期')}</span><strong>{record.date || '—'}</strong></div>
        <div><span>{tr('檢驗狀態')}</span><strong>{tr(record.processingState || '檢測紀錄')}</strong></div>
      </section>
      <h2>{tr('檢驗結果')}</h2>
      <div className="report-metrics">
        {CORE_MEASUREMENT_STANDARDS.map(item => {
          const result = evaluateMeasurement(record, item.key)
          return <div className="report-metric" key={item.key}><span>{tr(item.label)}</span><strong>{formatMeasurement(result, tr('未判定'))}</strong><small>{tr('系統參考範圍')}：{tr(item.range)}</small><small>{tr('判定')}：{result.state === 'normal' ? tr('正常') : result.state === 'abnormal' ? tr('異常') : tr('未判定')}</small></div>
        })}
      </div>
      <h2>{tr('檢驗影像')}</h2>
      <section className="report-images">
        <div><h4>{tr(record.media?.media_kind === 'video' ? '影片原始影格' : '原始影像')}</h4>{record.media?.media_kind === 'video' ? <ReportVideoFrame key={`${record.media?.object_path}-${record.media?.upload_status}`} media={record.media} onStatus={imageStatusHandlers.original} /> : <ReportImage key={record.imagePath} path={record.imagePath} label={tr('原始影像')} onStatus={imageStatusHandlers.original} />}</div>
        <div><h4>{tr('分析後影像')}</h4><ReportImage key={record.analyzedImagePath} path={record.analyzedImagePath} label={tr('分析後影像')} onStatus={imageStatusHandlers.analyzed} /></div>
      </section>
      <section className="report-print-notes">
        <h2>{tr('醫師評語與備註')}</h2>
        <p><strong>{tr('報告備註')}：</strong>{draft.notes || tr('未填寫')}</p>
        <p><strong>{tr('補充說明')}：</strong>{draft.supplement || tr('未填寫')}</p>
        <div className="report-signature"><span>{tr('負責醫師')}：{draft.doctor || '________________'}</span><span>{tr('醫師簽章')}：________________</span></div>
      </section>
      <footer className="report-print-footer">{tr('本報告僅供檢驗資料參考，檢驗結果應由醫療專業人員判讀。')}<span>{tr('列印日期')}：{new Date().toLocaleDateString()}</span></footer>
    </article>
  </>
}
