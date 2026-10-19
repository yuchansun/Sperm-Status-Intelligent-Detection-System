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
      if (active) setState({ path, url: null, error: '影像讀取失敗，請確認登入、網路與影像權限。' })
    })
    refresh()
    const timer = window.setInterval(refresh, 240000)
    return () => { active = false; window.clearInterval(timer) }
  }, [path])
  if (!path) return isDemo ? <><p>示範影像</p><img className="history-detail-image" src={demoImage} alt="示範影像" /></> : <p>未附影像</p>
  if (state.path !== path) return <p role="status">影像載入中…</p>
  if (state.error) return <p role="alert">{state.error}</p>
  return <img className="history-detail-image" src={state.url} alt="檢測原始影像" />
}
