import { translateText as tr } from '../../i18n/translate.js'
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { useEffect, useState } from 'react'
import { signedImage } from '../../services/cloudApi.js'
import demoImage from '../../assets/image.png'

export function PrivateImage({ path, isDemo = false }) {
  const [state, setState] = useState({ path: null, url: null, error: '' })
  useEffect(() => {
    if (!path) return
    let active = true
    const refresh = () => signedImage(path).then(url => {
      if (active) setState({ path, url, error: '' })
    }).catch(() => {
      if (active) setState({ path, url: null, error: tr("影像讀取失敗，請確認登入、網路與影像權限。") })
    })
    refresh()
    const timer = window.setInterval(refresh, 240000)
    return () => { active = false; window.clearInterval(timer) }
  }, [path])
  if (!path) return isDemo ? <><p>{tr("模擬影像")}</p><img className="history-detail-image" src={demoImage} alt={tr("模擬影像")} /></> : <p>{tr("未附影像")}</p>
  if (state.path !== path) return <p role="status">{tr("影像載入中…")}</p>
  if (state.error) return <p role="alert">{tr(state.error)}</p>
  return <img className="history-detail-image" src={state.url} alt={tr("檢測原始影像")} />
}
