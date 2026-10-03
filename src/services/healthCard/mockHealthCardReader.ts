import { HealthCardReadError, type HealthCardPatient, type HealthCardReader } from '../../types/healthCard'

export type MockHealthCardScenario = 'success' | 'no_card' | 'connection_failed' | 'timeout'

const mockPatient: HealthCardPatient = {
  name: '測試病患',
  nationalId: 'A123456789',
  birthday: '1990-05-20',
  sex: 'M',
  cardId: '1234567890123456',
  dateIssue: '2020-01-15',
  identityStatus: '一般',
  source: 'health_card',
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export class MockHealthCardReader implements HealthCardReader {
  constructor(private readonly scenario: MockHealthCardScenario = 'success') {}

  async readBasicInfo(): Promise<HealthCardPatient> {
    await delay(80)

    switch (this.scenario) {
      case 'success':
        return { ...mockPatient }
      case 'no_card':
        throw new HealthCardReadError('no_card', '尚未插入健保卡（測試情境）')
      case 'connection_failed':
        throw new HealthCardReadError('connection_failed', '無法連線健保卡服務（測試情境）')
      case 'timeout':
        throw new HealthCardReadError('timeout', '讀取健保卡逾時（測試情境）')
      default:
        throw new HealthCardReadError('unknown', '未知讀卡錯誤')
    }
  }
}
