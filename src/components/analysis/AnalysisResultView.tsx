import type { AnalysisResult } from '../../types/analysis'

type AnalysisResultViewProps = {
  result: AnalysisResult
  originalImageSrc: string
  labels: {
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
  }
}

function AnalysisResultView({ result, originalImageSrc, labels }: AnalysisResultViewProps) {
  return (
    <section className="panel-card analysis-result-card">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="section-heading__eyebrow">{labels.resultTitle}</p>
          <h2>{labels.resultTitle}</h2>
        </div>
        <p className="section-heading__subtitle">{labels.resultSubtitle}</p>
      </div>

      <div className="analysis-result-card__visuals">
        <article className="analysis-image-panel">
          <h3>{labels.originalImage}</h3>
          <div className="analysis-image-panel__frame">
            <img src={originalImageSrc} alt={labels.originalImage} />
          </div>
        </article>

        <article className="analysis-image-panel">
          <h3>{labels.detectionResult}</h3>
          <div className="analysis-image-panel__frame analysis-image-panel__frame--overlay">
            <img src={originalImageSrc} alt={labels.detectionResult} />
            <div className="detection-overlay">
              {result.detections.map((detection) => (
                <span
                  key={detection.id}
                  className="detection-overlay__box"
                  style={{
                    left: `${detection.boundingBox.x * 100}%`,
                    top: `${detection.boundingBox.y * 100}%`,
                    width: `${detection.boundingBox.width * 100}%`,
                    height: `${detection.boundingBox.height * 100}%`,
                  }}
                  title={`${detection.label} ${(detection.confidence * 100).toFixed(1)}%`}
                />
              ))}
            </div>
          </div>
        </article>
      </div>

      <div className="analysis-result-summary">
        <article>
          <span>{labels.totalSperm}</span>
          <strong>{result.totalSperm}</strong>
        </article>
        <article>
          <span>{labels.normal}</span>
          <strong>{result.normal}</strong>
        </article>
        <article>
          <span>{labels.abnormal}</span>
          <strong>{result.abnormal}</strong>
        </article>
        <article>
          <span>{labels.confidence}</span>
          <strong>{result.confidence.toFixed(1)}%</strong>
        </article>
        <article>
          <span>{labels.analysisStatus}</span>
          <strong>{result.analysisStatus}</strong>
        </article>
        <article>
          <span>{labels.analyzedAt}</span>
          <strong>{new Date(result.analyzedAt).toLocaleString()}</strong>
        </article>
      </div>
    </section>
  )
}

export default AnalysisResultView