import { useCallback, useEffect, useState } from 'react'
import { getCloudHistory } from '../services/cloudApi.js'

export function useCloudHistory() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    let active = true
    getCloudHistory().then(data => {
      if (active) { setRecords(data); setError(''); setLoading(false) }
    }).catch(error => {
      if (active) { setError(error.message || '無法讀取雲端紀錄，請檢查登入、網路與資料表權限。'); setLoading(false) }
    })
    return () => { active = false }
  }, [version])
  return { records, loading, error, reload }
}
