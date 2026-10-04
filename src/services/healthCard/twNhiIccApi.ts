import type { HealthCardPatient, HealthCardSex } from '../../types/healthCard'
import { rocYyyMmDdToGregorian } from '../../utils/rocDate'

export type TwNhiIccCardPayload = {
  reader_name?: string
  name?: string
  card_no?: string
  full_name?: string
  id_no?: string
  birth_date?: string
  sex?: string
  issue_date?: string
}

export type TwNhiIccReaderSnapshot = {
  status?: 'ok' | 'pcsc_unavailable' | string
  error?: string | null
  readers?: Array<{
    name?: string
    state?: 'empty' | 'nhi_card' | 'unsupported_card' | 'error' | string
    card?: TwNhiIccCardPayload | null
    error?: string | null
  }>
}

export type TwNhiIccHealthStatus = {
  service: 'ready' | 'old_version' | 'unavailable' | 'unknown'
  version: string
  versionSupported: boolean
  pcsc: 'ready' | 'unavailable' | 'unknown'
  reader: 'connected' | 'not_found' | 'error' | 'unknown'
  card: 'ready' | 'empty' | 'unsupported' | 'sharing_violation' | 'error' | 'unknown'
  readerError: string | null
  snapshot: TwNhiIccReaderSnapshot
}

const DEFAULT_BASE = 'http://127.0.0.1:12345'

export function getTwNhiIccServiceBase(): string {
  const fromEnv = import.meta.env.VITE_NHI_ICC_SERVICE_URL?.trim()
  return fromEnv || DEFAULT_BASE
}

async function fetchJson<T>(url: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal })
    if (!response.ok) {
      throw new Error(`TW NHI ICC HTTP ${response.status}`)
    }
    return (await response.json()) as T
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function pingTwNhiIccService(timeoutMs = 3000): Promise<boolean> {
  try {
    await fetchJson<{ major?: number }>(`${getTwNhiIccServiceBase()}/version`, timeoutMs)
    return true
  } catch {
    return false
  }
}

export async function fetchTwNhiIccSnapshot(timeoutMs = 10000): Promise<TwNhiIccReaderSnapshot> {
  return fetchJson<TwNhiIccReaderSnapshot>(`${getTwNhiIccServiceBase()}/`, timeoutMs)
}

export async function checkTwNhiIccService(timeoutMs = 5000) {
  const version = await fetchJson<{ text?: string }>(`${getTwNhiIccServiceBase()}/version`, timeoutMs)
  const versionText = version.text ?? 'unknown'
  const versionParts = versionText.split('.').map((part) => Number.parseInt(part, 10))
  const versionSupported = versionParts.length >= 2 && (versionParts[0] > 0 || (versionParts[0] === 0 && versionParts[1] >= 3))
  const snapshot = await fetchTwNhiIccSnapshot(timeoutMs)
  return mapTwNhiIccHealthStatus(versionText, versionSupported, snapshot)
}

export function mapTwNhiIccHealthStatus(
  version: string,
  versionSupported: boolean,
  snapshot: TwNhiIccReaderSnapshot,
): TwNhiIccHealthStatus {
  const readers = snapshot.readers ?? []
  const reader = readers[0]
  const readerState = readers.length === 0 ? 'no_reader' : reader?.state ?? 'unknown'
  const readerError = readers.find((item) => item.error)?.error ?? snapshot.error ?? null
  const errorText = String(readerError ?? '').toLowerCase()
  const cardState = readers.some((item) => item.state === 'nhi_card' && item.card)
    ? 'ready'
    : errorText.includes('sharingviolation')
      ? 'sharing_violation'
      : readerState === 'empty'
        ? 'empty'
        : readerState === 'unsupported_card'
          ? 'unsupported'
          : readerState === 'no_reader'
            ? 'unknown'
            : readerState === 'error'
              ? 'error'
              : 'unknown'

  return {
    service: !versionSupported ? 'old_version' : snapshot.status === 'ok' ? 'ready' : 'unavailable',
    version,
    versionSupported,
    pcsc: snapshot.status === 'ok' ? 'ready' : snapshot.status === 'pcsc_unavailable' ? 'unavailable' : 'unknown',
    reader: readers.length === 0 ? 'not_found' : readerState === 'error' ? 'error' : 'connected',
    card: cardState,
    readerError,
    snapshot,
  }
}

function mapSex(raw: string | undefined): HealthCardSex {
  const value = (raw ?? '').trim().toUpperCase()
  if (value === 'M' || value === '男') return 'M'
  if (value === 'F' || value === '女') return 'F'
  return 'UNKNOWN'
}

function normalizeDate(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim()
  if (!trimmed || trimmed === '0000-00-00') {
    throw new Error('出生日期缺失')
  }
  if (/^\d{7}$/.test(trimmed)) {
    return rocYyyMmDdToGregorian(trimmed)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return rocYyyMmDdToGregorian(trimmed)
  }
  throw new Error('出生日期格式無法轉換')
}

function normalizeOptionalDate(raw: string | undefined): string | undefined {
  const trimmed = (raw ?? '').trim()
  if (!trimmed || trimmed === '0000-00-00') return undefined
  if (/^\d{7}$/.test(trimmed) || /^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return rocYyyMmDdToGregorian(trimmed)
  }
  return undefined
}

export function mapTwNhiIccCardToPatient(card: TwNhiIccCardPayload): HealthCardPatient {
  const name = String(card.full_name ?? '').trim()
  const nationalId = String(card.id_no ?? '').trim()
  if (!name || !nationalId) {
    throw new Error('健保卡基本資料不完整')
  }

  return {
    name,
    nationalId,
    birthday: normalizeDate(card.birth_date),
    sex: mapSex(card.sex),
    cardId: String(card.card_no ?? '').trim() || undefined,
    dateIssue: normalizeOptionalDate(card.issue_date),
    source: 'health_card',
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function isLikelyConnectionError(error: unknown): boolean {
  if (isAbortError(error)) return true
  if (error instanceof TypeError) return true
  return false
}
