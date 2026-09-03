import type {
  AnalysisPreviewData,
  OverviewMetric,
  RecentAnalysisRecord,
  SystemStatusItem,
} from '../../types/analysis'

export const overviewMetrics: OverviewMetric[] = [
  {
    label: 'Total Analyses',
    value: '1,248',
    detail: 'All recorded analyses across the system',
    tone: 'success',
  },
  {
    label: 'Normal Results',
    value: '816',
    detail: 'Outputs with normal activity patterns',
    tone: 'success',
  },
  {
    label: 'Abnormal Results',
    value: '312',
    detail: 'Results requiring closer review',
    tone: 'danger',
  },
  {
    label: 'Pending Analyses',
    value: '120',
    detail: 'Queued for future AI processing',
    tone: 'warning',
  },
]

export const recentAnalyses: RecentAnalysisRecord[] = [
  {
    id: 'SV-20260831-0142',
    dateTime: '2026-08-31 09:42',
    totalSperm: 58,
    status: 'Normal',
    confidence: '96.4%',
  },
  {
    id: 'SV-20260831-0138',
    dateTime: '2026-08-31 09:18',
    totalSperm: 41,
    status: 'Pending',
    confidence: '87.2%',
  },
  {
    id: 'SV-20260831-0129',
    dateTime: '2026-08-31 08:55',
    totalSperm: 34,
    status: 'Abnormal',
    confidence: '93.1%',
  },
  {
    id: 'SV-20260831-0116',
    dateTime: '2026-08-31 08:20',
    totalSperm: 62,
    status: 'Normal',
    confidence: '95.8%',
  },
]

export const systemStatuses: SystemStatusItem[] = [
  {
    label: 'AI Model',
    value: 'Mock Pipeline',
    detail: 'Frontend placeholder for future YOLO inference',
    tone: 'warning',
  },
  {
    label: 'Backend',
    value: 'Not Connected',
    detail: 'API layer will be integrated in a later phase',
    tone: 'danger',
  },
  {
    label: 'Database',
    value: 'Mock Storage',
    detail: 'Structured mock data ready for API replacement',
    tone: 'success',
  },
]

export const analysisPreview: AnalysisPreviewData = {
  sampleId: 'SV-AN-2408-0034',
  subtitle: 'Desktop and mobile friendly result presentation concept',
  summary:
    'This layout keeps the original frame, detection overlay, and result summary readable on both large screens and mobile devices.',
  sections: [
    {
      title: 'Original Image',
      description: 'Microscope frame preview placeholder',
      metrics: [
        { label: 'Magnification', value: '400x' },
        { label: 'Frame Quality', value: 'High' },
      ],
    },
    {
      title: 'Detection Result',
      description: 'Detected sperm candidates and region overlays',
      metrics: [
        { label: 'Detected Regions', value: '58' },
        { label: 'Confidence', value: '96.4%' },
      ],
    },
    {
      title: 'Analysis Summary',
      description: 'Final interpretation and structured status output',
      metrics: [
        { label: 'Status', value: 'Normal' },
        { label: 'Review', value: 'Ready' },
      ],
    },
  ],
}