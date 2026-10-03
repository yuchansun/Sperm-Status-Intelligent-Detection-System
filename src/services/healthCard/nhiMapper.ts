import type { HealthCardPatient, HealthCardSex } from '../../types/healthCard'
import { rocYyyMmDdToGregorian } from '../../utils/rocDate'
import type { NhiBasicPayload } from './nhiApi'

function mapSex(raw: string | undefined): HealthCardSex {
  const value = (raw ?? '').trim().toUpperCase()
  if (value === 'M' || value === '1' || value === '男') return 'M'
  if (value === 'F' || value === '2' || value === '女') return 'F'
  return 'UNKNOWN'
}

function mapDateField(raw: string | undefined, fieldLabel: string): string | undefined {
  if (!raw?.trim()) return undefined
  try {
    return rocYyyMmDdToGregorian(raw)
  } catch {
    throw new Error(`${fieldLabel}格式無法轉換`)
  }
}

export function mapNhiBasicToPatient(payload: NhiBasicPayload): HealthCardPatient {
  const name = String(payload.name ?? '').trim()
  const nationalId = String(payload.idNo ?? '').trim()
  const birthdayRaw = String(payload.birthDate ?? '').trim()
  const cardId = String(payload.cardNo ?? payload.cardId ?? '').trim()

  if (!name || !nationalId || !birthdayRaw) {
    throw new Error('健保卡基本資料不完整')
  }

  const birthday = mapDateField(birthdayRaw, '出生日期')
  if (!birthday) {
    throw new Error('健保卡出生日期缺失')
  }

  const issueRaw = payload.issueDate ?? payload.dateIssue
  const dateIssue = issueRaw ? mapDateField(String(issueRaw), '發卡日期') : undefined

  return {
    name,
    nationalId,
    birthday,
    sex: mapSex(String(payload.sex ?? '')),
    cardId: cardId || undefined,
    dateIssue,
    identityStatus: payload.identityStatus ? String(payload.identityStatus) : undefined,
    source: 'health_card',
  }
}
