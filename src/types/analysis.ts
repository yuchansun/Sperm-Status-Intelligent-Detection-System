export type AnalysisStatus = 'Normal' | 'Abnormal' | 'Pending'

export type UiLanguage = 'zh-TW' | 'en'

export type WorkflowStage = 'idle' | 'processing' | 'completed' | 'error'

export interface DetectionBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface DetectionResult {
  id: string
  label: 'sperm'
  confidence: number
  boundingBox: DetectionBoundingBox
}

export interface AnalysisResult {
  analysisId: string
  analyzedAt: string
  totalSperm: number
  normal: number
  abnormal: number
  confidence: number
  analysisStatus: 'Normal' | 'Abnormal' | 'Screening Review'
  detections: DetectionResult[]
}

export type SystemStatusTone = 'success' | 'warning' | 'danger'

export interface OverviewMetric {
  label: string
  value: string
  detail: string
  tone: SystemStatusTone
}

export interface RecentAnalysisRecord {
  id: string
  dateTime: string
  totalSperm: number
  status: AnalysisStatus
  confidence: string
}

export interface SystemStatusItem {
  label: string
  value: string
  detail: string
  tone: SystemStatusTone
}

export interface AnalysisPreviewSection {
  title: string
  description: string
  metrics: Array<{
    label: string
    value: string
  }>
}

export interface AnalysisPreviewData {
  sampleId: string
  subtitle: string
  summary: string
  sections: [AnalysisPreviewSection, AnalysisPreviewSection, AnalysisPreviewSection]
}

export interface NavigationItem {
  label: string
  description: string
  path: string
}