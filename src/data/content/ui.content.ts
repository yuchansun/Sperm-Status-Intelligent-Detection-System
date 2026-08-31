import type { UiLanguage } from '../../types/analysis'

export const navigationByLanguage: Record<
  UiLanguage,
  Array<{ label: string; description: string; path: string }>
> = {
  'zh-TW': [
    { label: '儀表板', description: '系統概況與指標摘要', path: '/' },
    { label: '新增分析', description: '建立新的顯微影像分析流程', path: '/new-analysis' },
    { label: '分析歷史', description: '檢視過往分析紀錄', path: '/analysis-history' },
    { label: '設定', description: '管理前端系統偏好', path: '/settings' },
  ],
  en: [
    { label: 'Dashboard', description: 'System overview and summary metrics', path: '/' },
    {
      label: 'New Analysis',
      description: 'Prepare a new microscopy analysis workflow',
      path: '/new-analysis',
    },
    {
      label: 'Analysis History',
      description: 'Review previous analysis records',
      path: '/analysis-history',
    },
    { label: 'Settings', description: 'Configure future system preferences', path: '/settings' },
  ],
}

export const pageTitlesByLanguage: Record<
  UiLanguage,
  Record<string, { title: string; subtitle: string }>
> = {
  'zh-TW': {
    '/': {
      title: '儀表板',
      subtitle: 'SpermVision 系統概況',
    },
    '/new-analysis': {
      title: '新增分析',
      subtitle: '可擴充的 AI 影像分析操作介面',
    },
    '/analysis-history': {
      title: '分析歷史',
      subtitle: '跨裝置可讀的分析紀錄檢視',
    },
    '/settings': {
      title: '設定',
      subtitle: '前端系統設定與語言偏好',
    },
  },
  en: {
    '/': {
      title: 'Dashboard',
      subtitle: 'Operational overview for SpermVision',
    },
    '/new-analysis': {
      title: 'New Analysis',
      subtitle: 'Scalable AI image analysis workflow interface',
    },
    '/analysis-history': {
      title: 'Analysis History',
      subtitle: 'Cross-device view for historical analysis records',
    },
    '/settings': {
      title: 'Settings',
      subtitle: 'Frontend preferences and language options',
    },
  },
}

export const headerContentByLanguage: Record<
  UiLanguage,
  {
    menuAriaLabel: string
    statusText: string
  }
> = {
  'zh-TW': {
    menuAriaLabel: '開啟導覽選單',
    statusText: '前端原型',
  },
  en: {
    menuAriaLabel: 'Open navigation menu',
    statusText: 'Frontend Prototype',
  },
}

export const sidebarContentByLanguage: Record<
  UiLanguage,
  {
    navAriaLabel: string
    footerTitle: string
    footerDetail: string
  }
> = {
  'zh-TW': {
    navAriaLabel: '主要導覽',
    footerTitle: '以 Responsive-first 建構',
    footerDetail: '手機抽屜 • 平板精簡 • 桌機完整側欄',
  },
  en: {
    navAriaLabel: 'Primary navigation',
    footerTitle: 'Responsive-first UI architecture',
    footerDetail: 'Mobile drawer • Tablet compact • Desktop full sidebar',
  },
}

export const recentAnalysisTableContentByLanguage: Record<
  UiLanguage,
  {
    analysisId: string
    dateTime: string
    totalSperm: string
    status: string
    confidence: string
  }
> = {
  'zh-TW': {
    analysisId: '分析編號',
    dateTime: '日期 / 時間',
    totalSperm: '精蟲總數',
    status: '狀態',
    confidence: '信心值',
  },
  en: {
    analysisId: 'Analysis ID',
    dateTime: 'Date / Time',
    totalSperm: 'Total Sperm',
    status: 'Status',
    confidence: 'Confidence',
  },
}

export const analysisStatusLabelByLanguage: Record<
  UiLanguage,
  {
    Normal: string
    Pending: string
    Abnormal: string
    success: string
    warning: string
    danger: string
  }
> = {
  'zh-TW': {
    Normal: '正常',
    Pending: '等待中',
    Abnormal: '異常',
    success: '正常',
    warning: '注意',
    danger: '警示',
  },
  en: {
    Normal: 'Normal',
    Pending: 'Pending',
    Abnormal: 'Abnormal',
    success: 'Success',
    warning: 'Warning',
    danger: 'Danger',
  },
}

export const dashboardContentByLanguage: Record<
  UiLanguage,
  {
    overviewEyebrow: string
    overviewTitle: string
    overviewSubtitle: string
    recentEyebrow: string
    recentTitle: string
    recentSubtitle: string
    statusEyebrow: string
    statusTitle: string
  }
> = {
  'zh-TW': {
    overviewEyebrow: '總覽',
    overviewTitle: '系統快照',
    overviewSubtitle: '同一套卡片在桌機、平板、手機自動調整版面。',
    recentEyebrow: '近期分析',
    recentTitle: '最新紀錄',
    recentSubtitle: '桌機顯示表格，手機顯示卡片列表。',
    statusEyebrow: '系統狀態',
    statusTitle: '目前環境',
  },
  en: {
    overviewEyebrow: 'Overview',
    overviewTitle: 'System Snapshot',
    overviewSubtitle: 'Cards adapt automatically across desktop, tablet, and mobile.',
    recentEyebrow: 'Recent Analysis',
    recentTitle: 'Latest Records',
    recentSubtitle: 'Desktop uses table view while mobile uses card list view.',
    statusEyebrow: 'System Status',
    statusTitle: 'Current Environment',
  },
}

export const historyContentByLanguage: Record<
  UiLanguage,
  {
    eyebrow: string
    title: string
    subtitle: string
  }
> = {
  'zh-TW': {
    eyebrow: '分析歷史',
    title: '可回顧的分析紀錄',
    subtitle: '桌機用表格呈現，手機改為易讀的卡片排版。',
  },
  en: {
    eyebrow: 'Analysis History',
    title: 'Responsive Record Archive',
    subtitle: 'Desktop uses table layout while mobile switches to cards.',
  },
}

export const settingsContentByLanguage: Record<
  UiLanguage,
  {
    sectionEyebrow: string
    sectionTitle: string
    sectionSubtitle: string
    languageCardTitle: string
    languageCardDesc: string
    languageLabel: string
    zhLabel: string
    enLabel: string
    themeTitle: string
    themeDesc: string
    navigationTitle: string
    navigationDesc: string
    dataLayerTitle: string
    dataLayerDesc: string
  }
> = {
  'zh-TW': {
    sectionEyebrow: '設定',
    sectionTitle: '前端系統設定',
    sectionSubtitle: '在此管理全站語言，切換後所有頁面會同步更新。',
    languageCardTitle: '語言偏好',
    languageCardDesc: '目前支援繁體中文與英文。',
    languageLabel: '顯示語言',
    zhLabel: '繁體中文',
    enLabel: 'English',
    themeTitle: '主題風格',
    themeDesc: '介面採用醫療科技與 AI 系統導向設計。',
    navigationTitle: '導覽模式',
    navigationDesc: '支援手機抽屜、平板精簡、桌機完整側欄。',
    dataLayerTitle: '資料層',
    dataLayerDesc: 'Mock data 已獨立，方便後續替換為 API。',
  },
  en: {
    sectionEyebrow: 'Settings',
    sectionTitle: 'Frontend Configuration',
    sectionSubtitle: 'Manage global language here. All pages update immediately.',
    languageCardTitle: 'Language Preference',
    languageCardDesc: 'Traditional Chinese and English are currently supported.',
    languageLabel: 'Display Language',
    zhLabel: 'Traditional Chinese',
    enLabel: 'English',
    themeTitle: 'Theme',
    themeDesc: 'UI style follows a medical-technology and AI-system direction.',
    navigationTitle: 'Navigation',
    navigationDesc: 'Supports mobile drawer, compact tablet mode, and full desktop sidebar.',
    dataLayerTitle: 'Data Layer',
    dataLayerDesc: 'Mock data remains isolated for future API replacement.',
  },
}
