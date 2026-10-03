import { HealthCardReadError, type HealthCardReader } from '../../types/healthCard'
import {
  fetchTwNhiIccCards,
  isAbortError,
  isLikelyConnectionError,
  mapTwNhiIccCardToPatient,
  pingTwNhiIccService,
} from './twNhiIccApi'

/**
 * 搭配本機 tw-nhi-icc-service（例如 `nhicard` 監聽 http://127.0.0.1:8000）。
 * API：GET /version、GET /（回傳健保卡陣列）。
 */
export class TwNhiHealthCardReader implements HealthCardReader {
  constructor(private readonly timeoutMs = 10000) {}

  async readBasicInfo() {
    const alive = await pingTwNhiIccService(Math.min(this.timeoutMs, 3000))
    if (!alive) {
      throw new HealthCardReadError(
        'software_not_installed',
        '無法連線本機健保卡服務，請確認 nhicard／tw-nhi-icc-service 是否已啟動',
      )
    }

    try {
      const cards = await fetchTwNhiIccCards(this.timeoutMs)
      if (cards.length === 0) {
        throw new HealthCardReadError('no_card', '尚未讀到健保卡，請確認讀卡機連線並插入卡片')
      }

      return mapTwNhiIccCardToPatient(cards[0])
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
