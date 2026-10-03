const DEFAULT_NHI_HC_BASE = 'https://localhost:5066/api/hc/v1'

function getNhiHcBase(): string {
  const fromEnv = import.meta.env.VITE_NHI_HC_BASE?.trim()
  return fromEnv || DEFAULT_NHI_HC_BASE
}

export type NhiBasicPayload = {
  name?: string
  idNo?: string
  birthDate?: string
  sex?: string
  cardNo?: string
  cardId?: string
  issueDate?: string
  dateIssue?: string
  identityStatus?: string
  status?: string
  [key: string]: unknown
}

async function fetchNhiJson<T>(path: string, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${getNhiHcBase()}${path}`, {
      method: 'GET',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`NHI API HTTP ${response.status}`)
    }

    return (await response.json()) as T
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export async function initializeNhiControlSoftware(timeoutMs = 8000): Promise<void> {
  await fetchNhiJson<{ ok?: boolean }>('/Initialize', timeoutMs)
}

export async function getNhiReaderStatus(timeoutMs = 5000): Promise<{ ready?: boolean; status?: string }> {
  return fetchNhiJson('/ReaderStatus', timeoutMs)
}

export async function getNhiCardStatus(timeoutMs = 5000): Promise<{ inserted?: boolean; status?: string }> {
  return fetchNhiJson('/CardStatus', timeoutMs)
}

export async function getNhiBasicInfo(timeoutMs = 10000): Promise<NhiBasicPayload> {
  return fetchNhiJson('/Basic', timeoutMs)
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function isLikelyConnectionError(error: unknown): boolean {
  if (isAbortError(error)) return true
  if (error instanceof TypeError) return true
  return false
}
