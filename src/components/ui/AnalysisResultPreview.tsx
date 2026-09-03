import type { AnalysisPreviewData } from '../../types/analysis'

type AnalysisResultPreviewProps = {
  data: AnalysisPreviewData
}

function AnalysisResultPreview({ data }: AnalysisResultPreviewProps) {
  return (
    <section className="analysis-preview">
      <div className="section-heading">
        <div>
          <p className="section-heading__eyebrow">Analysis Result</p>
          <h2>{data.sampleId}</h2>
        </div>
        <p className="section-heading__subtitle">{data.subtitle}</p>
      </div>

      <div className="analysis-preview__grid">
        {data.sections.map((section) => (
          <article key={section.title} className="analysis-panel">
            <div className="analysis-panel__visual">
              <div className="analysis-panel__overlay" />
              <span>{section.title}</span>
            </div>

            <div className="analysis-panel__content">
              <p>{section.description}</p>
              <div className="analysis-panel__metrics">
                {section.metrics.map((metric) => (
                  <div key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="analysis-preview__summary">
        <p>{data.summary}</p>
      </div>
    </section>
  )
}

export default AnalysisResultPreview