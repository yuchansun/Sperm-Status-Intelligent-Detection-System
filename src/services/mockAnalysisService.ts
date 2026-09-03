import type { AnalysisResult, DetectionResult } from '../types/analysis'

function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

function createDetections(totalCount: number, seed: number): DetectionResult[] {
  const random = seededRandom(seed)
  const visualCount = Math.min(totalCount, 18)

  return Array.from({ length: visualCount }, (_, index) => {
    const width = 0.07 + random() * 0.08
    const height = 0.05 + random() * 0.06
    const x = random() * (0.96 - width)
    const y = random() * (0.94 - height)

    return {
      id: `d-${index + 1}`,
      label: 'sperm',
      confidence: 0.82 + random() * 0.16,
      boundingBox: {
        x,
        y,
        width,
        height,
      },
    }
  })
}

export async function runMockImageAnalysis(file: File): Promise<AnalysisResult> {
  const seed = Number(file.size % 10000)
  const totalSperm = 26 + (seed % 41)
  const abnormal = totalSperm % 7
  const normal = totalSperm - abnormal
  const confidence = 88 + (seed % 100) / 10
  const analysisStatus = abnormal > totalSperm * 0.3 ? 'Abnormal' : 'Normal'

  await new Promise((resolve) => {
    setTimeout(resolve, 1800)
  })

  return {
    analysisId: `SV-${Date.now()}`,
    analyzedAt: new Date().toISOString(),
    totalSperm,
    normal,
    abnormal,
    confidence,
    analysisStatus,
    detections: createDetections(totalSperm, seed),
  }
}