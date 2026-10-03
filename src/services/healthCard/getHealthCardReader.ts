import type { HealthCardReader } from '../../types/healthCard'
import { MockHealthCardReader, type MockHealthCardScenario } from './mockHealthCardReader'
import { NhiHealthCardReader } from './nhiHealthCardReader'
import { TwNhiHealthCardReader } from './twNhiHealthCardReader'

export type HealthCardBackend = 'nhi_cs6' | 'tw_nhi_icc'

function resolveMockScenario(): MockHealthCardScenario | null {
  const fromEnv = import.meta.env.VITE_HEALTH_CARD_MOCK_SCENARIO as MockHealthCardScenario | undefined
  if (fromEnv === 'success' || fromEnv === 'no_card' || fromEnv === 'connection_failed' || fromEnv === 'timeout') {
    return fromEnv
  }
  return null
}

function resolveBackend(): HealthCardBackend {
  const fromEnv = import.meta.env.VITE_HEALTH_CARD_BACKEND
  if (fromEnv === 'nhi_cs6') return 'nhi_cs6'
  return 'tw_nhi_icc'
}

/**
 * Mock 僅限本機開發且需明確設定 VITE_HEALTH_CARD_MOCK_SCENARIO。
 * 本機 nhicard（tw-nhi-icc-service）請設 VITE_HEALTH_CARD_BACKEND=tw_nhi_icc。
 * 健保署控制軟體 6.0 Web API 為預設（nhi_cs6）。
 */
export function getHealthCardReader(): HealthCardReader {
  const mockScenario = resolveMockScenario()
  if (import.meta.env.DEV && mockScenario) {
    return new MockHealthCardReader(mockScenario)
  }
  if (resolveBackend() === 'tw_nhi_icc') {
    return new TwNhiHealthCardReader()
  }
  return new NhiHealthCardReader()
}

export function isMockHealthCardEnabled(): boolean {
  return import.meta.env.DEV && resolveMockScenario() !== null
}
