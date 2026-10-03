/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HEALTH_CARD_MOCK_SCENARIO?: string
  readonly VITE_HEALTH_CARD_BACKEND?: 'nhi_cs6' | 'tw_nhi_icc'
  readonly VITE_NHI_HC_BASE?: string
  readonly VITE_NHI_ICC_SERVICE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
