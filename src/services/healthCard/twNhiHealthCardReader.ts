import { HealthCardReadError, type HealthCardReader } from '../../types/healthCard'
import {
  fetchTwNhiIccSnapshot,
  isAbortError,
  isLikelyConnectionError,
  mapTwNhiIccCardToPatient,
  pingTwNhiIccService,
} from './twNhiIccApi'

/**
 * 搭配本機 tw-nhi-icc-service v0.3.0，預設監聽 http://127.0.0.1:12345。
 * API：GET /version、GET /（回傳 v0.3 snapshot）。
 */
export class TwNhiHealthCardReader implements HealthCardReader {
  constructor(private readonly timeoutMs = 10000) {}

  async readBasicInfo() {
    const alive = await pingTwNhiIccService(Math.min(this.timeoutMs, 3000))
    if (!alive) {
      throw new HealthCardReadError(
        'software_not_installed',
        '無法連線本機健保卡服務，請確認 v0.3.0 tw-nhi-icc-service 是否已啟動',
      )
    }

    try {
      const snapshot = await fetchTwNhiIccSnapshot(this.timeoutMs)
      const card = snapshot.readers?.find((reader) => reader.state === 'nhi_card' && reader.card)?.card
      if (!card) {
        throw new HealthCardReadError('no_card', '尚未讀到健保卡，請確認讀卡機連線並插入卡片')
      }

      return mapTwNhiIccCardToPatient(card)
    } catch (error) {
      if (error instanceof HealthCardReadError) throw error
      if (isAbortError(error)) {
        throw new HealthCardReadError('timeout', '讀取健保卡逾時')
      }
      if (isLikelyConnectionError(error)) {
        throw new HealthCardReadError('connection_failed', '健保卡服務連線失敗')
      }
      throw new HealthCardReadError('card_error', '健保卡資料讀取失敗，請重新插卡後再試')
    }
  }
}
