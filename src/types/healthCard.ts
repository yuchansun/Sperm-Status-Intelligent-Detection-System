export type HealthCardSex = 'M' | 'F' | 'UNKNOWN'

export type HealthCardPatient = {
  name: string
  nationalId: string
  birthday: string
  sex: HealthCardSex
  cardId?: string
  dateIssue?: string
  identityStatus?: string
  source: 'health_card'
}

export type HealthCardReadErrorCode =
  | 'software_not_installed'
  | 'reader_not_found'
  | 'no_card'
  | 'card_error'
  | 'connection_failed'
  | 'timeout'
  | 'unknown'

export class HealthCardReadError extends Error {
  readonly code: HealthCardReadErrorCode

  constructor(code: HealthCardReadErrorCode, message: string) {
    super(message)
    this.name = 'HealthCardReadError'
    this.code = code
  }
}

export interface HealthCardReader {
  readBasicInfo(): Promise<HealthCardPatient>
}
