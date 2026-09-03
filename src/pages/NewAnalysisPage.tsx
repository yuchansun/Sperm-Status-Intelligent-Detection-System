import { useEffect, useMemo, useRef, useState } from 'react'

import { useLanguage } from '../app/LanguageContext'
import AnalysisResultView from '../components/analysis/AnalysisResultView'
import ImagePreviewCard from '../components/analysis/ImagePreviewCard'
import ImageUploadZone from '../components/analysis/ImageUploadZone'
import ProcessingState from '../components/analysis/ProcessingState'
import { newAnalysisContent } from '../data/content/newAnalysis.content'
import { runMockImageAnalysis } from '../services/mockAnalysisService'
import type { AnalysisResult, WorkflowStage } from '../types/analysis'

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

function formatFileSize(fileSize: number) {
  if (fileSize < 1024) return `${fileSize} B`
  if (fileSize < 1024 * 1024) return `${(fileSize / 1024).toFixed(1)} KB`
  return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`
}

function NewAnalysisPage() {
  const { language } = useLanguage()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>('idle')
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const previewUrlRef = useRef<string | null>(null)

  const content = newAnalysisContent[language]

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
    }
  }, [])

  const fileMeta = useMemo(() => {
    if (!selectedFile) return null

    return {
      name: selectedFile.name,
      size: formatFileSize(selectedFile.size),
    }
  }, [selectedFile])

  const canStartAnalysis = selectedFile !== null && workflowStage !== 'processing'

  const updateSelectedFile = (file: File | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }

    setSelectedFile(file)

    if (!file) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    previewUrlRef.current = objectUrl
    setPreviewUrl(objectUrl)
  }

  const selectImage = (file: File) => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) return
    updateSelectedFile(file)
    setAnalysisResult(null)
    setWorkflowStage('idle')
  }

  const removeImage = () => {
    updateSelectedFile(null)
    setAnalysisResult(null)
    setWorkflowStage('idle')
    setIsDragActive(false)
  }

  const startAnalysis = async () => {
    if (!selectedFile || workflowStage === 'processing') return

    setWorkflowStage('processing')

    try {
      const result = await runMockImageAnalysis(selectedFile)
      setAnalysisResult(result)
      setWorkflowStage('completed')
    } catch {
      setWorkflowStage('error')
    }
  }

  return (
    <div className="page-stack">
      <section className="panel-card panel-card--hero new-analysis-flow">
        <div className="section-heading">
          <div>
            <p className="section-heading__eyebrow">{content.pageEyebrow}</p>
            <h2>{content.pageTitle}</h2>
          </div>
          <div className="new-analysis-flow__head-tools">
            <p className="section-heading__subtitle">{content.pageSubtitle}</p>
          </div>
        </div>

        <div className="new-analysis-flow__grid">
          <ImageUploadZone
            isDragActive={isDragActive}
            accept="image/png,image/jpeg,image/jpg,image/webp"
            disabled={workflowStage === 'processing'}
            fileName={fileMeta?.name}
            fileSize={fileMeta?.size}
            labels={{
              title: content.uploadTitle,
              hint: content.uploadHint,
              formats: content.uploadFormats,
              dragActiveHint: content.dragActiveHint,
              clickSelect: content.clickSelect,
              fileNameLabel: content.fileNameLabel,
              fileSizeLabel: content.fileSizeLabel,
            }}
            onFileSelect={selectImage}
            onDragStateChange={setIsDragActive}
          />

          <ImagePreviewCard
            src={previewUrl}
            alt={content.noImageState}
            removeLabel={content.removeImage}
            replaceLabel={content.replaceImage}
            disabled={workflowStage === 'processing'}
            onReplace={selectImage}
            onRemove={removeImage}
          />

          <section className="panel-card new-analysis-actions">
            <button
              type="button"
              className="new-analysis-actions__primary"
              disabled={!canStartAnalysis}
              onClick={startAnalysis}
            >
              {workflowStage === 'processing' ? content.processing : content.startAnalysis}
            </button>
          </section>
        </div>
      </section>

      {workflowStage === 'processing' ? (
        <ProcessingState title={content.processing} hint={content.processingHint} />
      ) : null}

      {analysisResult && previewUrl && workflowStage === 'completed' ? (
        <AnalysisResultView
          result={analysisResult}
          originalImageSrc={previewUrl}
          labels={{
            resultTitle: content.resultTitle,
            resultSubtitle: content.resultSubtitle,
            originalImage: content.originalImage,
            detectionResult: content.detectionResult,
            totalSperm: content.totalSperm,
            normal: content.normal,
            abnormal: content.abnormal,
            confidence: content.confidence,
            analysisStatus: content.analysisStatus,
            analyzedAt: content.analyzedAt,
          }}
        />
      ) : null}
    </div>
  )
}

export default NewAnalysisPage