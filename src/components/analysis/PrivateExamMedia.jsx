import { translateText as tr } from '../../i18n/translate.js'
import { useEffect, useState } from 'react'
import { signedMedia } from '../../services/cloudApi.js'
import { PrivateImage } from './PrivateImage.jsx'

export function PrivateExamMedia({ record }) {
  const media = record.media
  const [state, setState] = useState({ path: '', url: '', error: '' })
  const [playbackFailed, setPlaybackFailed] = useState('')
  const path = media?.object_path
  const bucket = media?.bucket_id
  useEffect(() => {
    if (!path || bucket !== 'exam-videos' || media.upload_status !== 'ready') return
    let active = true
    const refresh = () => signedMedia(bucket, path).then(url => {
      if (active) setState({ path, url, error: '' })
    }).catch(() => { if (active) setState({ path, url: '', error: tr("影片讀取失敗，請確認連線後重新開啟。") }) })
    refresh()
    const timer = window.setInterval(refresh, 240000)
    return () => { active = false; window.clearInterval(timer) }
  }, [path, bucket, media?.upload_status])
  if (media && media.upload_status !== 'ready') return <p role="status">{tr("檔案尚未上傳完成。")}</p>
  if (!media || media.media_kind !== 'video') return <PrivateImage path={record.imagePath} isDemo={record.isDemo} />
  if (media.upload_status !== 'ready') return <p role="status">{tr("檔案尚未上傳完成。")}</p>
  if (state.path !== path) return <p role="status">{tr("正在載入私有影片…")}</p>
  if (state.error) return <p role="alert">{tr(state.error)}</p>
  return <div className="private-video">
    <p>{media.original_filename}</p>
    <video key={path} controls playsInline preload="metadata" src={state.url} onError={() => setPlaybackFailed(path)} />
    {playbackFailed === path && <p role="status">{tr("瀏覽器無法播放此格式或編碼；檔案仍已保存，可下載後以相容播放器開啟。")}</p>}
    <a href={state.url} target="_blank" rel="noreferrer">{tr("開啟／下載原始影片（短效連結）")}</a>
  </div>
}
