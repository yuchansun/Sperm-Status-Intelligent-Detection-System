import type { UiLanguage } from '../../types/analysis'

type NewAnalysisCopy = {
  languageLabel: string
  pageEyebrow: string
  pageTitle: string
  pageSubtitle: string
  uploadTitle: string
  uploadHint: string
  uploadFormats: string
  dragActiveHint: string
  clickSelect: string
  fileNameLabel: string
  fileSizeLabel: string
  removeImage: string
  replaceImage: string
  startAnalysis: string
  processing: string
  processingHint: string
  resultTitle: string
  resultSubtitle: string
  originalImage: string
  detectionResult: string
  totalSperm: string
  normal: string
  abnormal: string
  confidence: string
  analysisStatus: string
  analyzedAt: string
  noImageState: string
}

export const newAnalysisContent: Record<UiLanguage, NewAnalysisCopy> = {
  'zh-TW': {
    languageLabel: '語言',
    pageEyebrow: 'New Analysis',
    pageTitle: 'AI 影像篩檢流程',
    pageSubtitle: '此階段僅實作前端流程，使用 mock API 模擬分析。',
    uploadTitle: 'Upload Image',
    uploadHint: '點擊選擇圖片或拖曳圖片到此區域',
    uploadFormats: '支援格式: JPG, JPEG, PNG, WEBP',
    dragActiveHint: '放開滑鼠以上傳圖片',
    clickSelect: '選擇圖片',
    fileNameLabel: '檔案名稱',
    fileSizeLabel: '檔案大小',
    removeImage: '移除圖片',
    replaceImage: '重新選擇',
    startAnalysis: '開始分析',
    processing: '分析中',
    processingHint: 'AI screening 正在處理影像，請稍候。',
    resultTitle: 'Analysis Result',
    resultSubtitle: '以下為 AI screening result（模擬資料）。',
    originalImage: 'Original Image',
    detectionResult: 'Detection Result',
    totalSperm: 'Total Sperm',
    normal: 'Normal',
    abnormal: 'Abnormal',
    confidence: 'Confidence',
    analysisStatus: 'Analysis Status',
    analyzedAt: '分析時間',
    noImageState: '尚未選擇圖片，請先上傳影像。',
  },
  en: {
    languageLabel: 'Language',
    pageEyebrow: 'New Analysis',
    pageTitle: 'AI Image Screening Workflow',
    pageSubtitle: 'This stage focuses on frontend flow with a mock analysis API.',
    uploadTitle: 'Upload Image',
    uploadHint: 'Click to select an image or drag and drop here',
    uploadFormats: 'Supported formats: JPG, JPEG, PNG, WEBP',
    dragActiveHint: 'Drop image to upload',
    clickSelect: 'Select Image',
    fileNameLabel: 'File Name',
    fileSizeLabel: 'File Size',
    removeImage: 'Remove Image',
    replaceImage: 'Replace Image',
    startAnalysis: 'Start Analysis',
    processing: 'Processing',
    processingHint: 'AI screening is processing this image. Please wait.',
    resultTitle: 'Analysis Result',
    resultSubtitle: 'The following data is from a mock AI screening result.',
    originalImage: 'Original Image',
    detectionResult: 'Detection Result',
    totalSperm: 'Total Sperm',
    normal: 'Normal',
    abnormal: 'Abnormal',
    confidence: 'Confidence',
    analysisStatus: 'Analysis Status',
    analyzedAt: 'Analyzed At',
    noImageState: 'No image selected. Please upload one to continue.',
  },
}
