type ProcessingStateProps = {
  title: string
  hint: string
}

function ProcessingState({ title, hint }: ProcessingStateProps) {
  return (
    <section className="panel-card processing-state" aria-live="polite">
      <div className="processing-state__spinner" aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
    </section>
  )
}

export default ProcessingState