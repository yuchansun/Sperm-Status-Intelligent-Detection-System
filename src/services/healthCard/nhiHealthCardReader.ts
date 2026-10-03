import { HealthCardReadError, type HealthCardReader } from '../../types/healthCard'
import {
  getNhiBasicInfo,
  getNhiCardStatus,
  getNhiReaderStatus,
  initializeNhiControlSoftware,
  isAbortError,
  isLikelyConnectionError,
} from './nhiApi'
import { mapNhiBasicToPatient } from './nhiMapper'

function readerNotReady(status: { ready?: boolean; status?: string } | undefined): boolean {
  if (status?.ready === false) return true
  const text = String(status?.status ?? '').toLowerCase()
  return text.includes('notfound') || text.includes('not_found') || text.includes('disconnected')
}

function cardNotInserted(status: { inserted?: boolean; status?: string } | undefined): boolean {
  if (status?.inserted === false) return true
  const text = String(status?.status ?? '').toLowerCase()
  return text.includes('nocard') || text.includes('no_card') || text.includes('empty')
}

export class NhiHealthCardReader implements HealthCardReader {
  constructor(private readonly timeoutMs = 10000) {}

  async readBasicInfo() {
    try {
      await initializeNhiControlSoftware(this.timeoutMs)
    } catch (error) {
      if (isAbortError(error)) {
        throw new HealthCardReadError('timeout', '讀取健保卡逾時，請確認讀卡機與控制軟體狀態')
      }
      if (isLikelyConnectionError(error)) {
        throw new HealthCardReadError(
          'software_not_installed',
          '無法連線健保卡控制軟體，請確認是否已安裝並啟動',
        )
      }
      throw new HealthCardReadError('connection_failed', '健保卡控制軟體連線失敗')
    }

    let readerStatus
    try {
      readerStatus = await getNhiReaderStatus(Math.min(this.timeoutMs, 5000))
    } catch (error) {
      if (isAbortError(error)) {
        throw new HealthCardReadError('timeout', '讀卡機狀態查詢逾時')
      }
      throw new HealthCardReadError('connection_failed', '無法取得讀卡機狀態')
    }

    if (readerNotReady(readerStatus)) {
      throw new HealthCardReadError('reader_not_found', '找不到讀卡機，請確認裝置連線')
    }

    let cardStatus
    try {
      cardStatus = await getNhiCardStatus(Math.min(this.timeoutMs, 5000))
    } catch (error) {
      if (isAbortError(error)) {
        throw new HealthCardReadError('timeout', '健保卡狀態查詢逾時')
      }
      throw new HealthCardReadError('connection_failed', '無法取得健保卡狀態')
    }

    if (cardNotInserted(cardStatus)) {
      throw new HealthCardReadError('no_card', '尚未插入健保卡，請插入後再試')
    }

    try {
      const basic = await getNhiBasicInfo(this.timeoutMs)
      return mapNhiBasicToPatient(basic)
    } catch (error) {
      if (error instanceof HealthCardReadError) throw error
      if (isAbortError(error)) {
        throw new HealthCardReadError('timeout', '讀取健保卡資料逾時')
      }
      if (isLikelyConnectionError(error)) {
        throw new HealthCardReadError('connection_failed', '讀卡連線失敗，請確認憑證或 CORS 設定')
      }
      throw new HealthCardReadError('card_error', '健保卡資料讀取失敗，請重新插卡後再試')
    }
  }
}
