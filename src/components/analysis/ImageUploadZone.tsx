import type { ChangeEvent, DragEvent } from 'react'

type ImageUploadZoneProps = {
  isDragActive: boolean
  accept: string
  fileName?: string
  fileSize?: string
  disabled?: boolean
  labels: {
    title: string
    hint: string
    formats: string
    dragActiveHint: string
    clickSelect: string
    fileNameLabel: string
    fileSizeLabel: string
  }
  onFileSelect: (file: File) => void
  onDragStateChange: (isActive: boolean) => void
}

function ImageUploadZone({
  isDragActive,
  accept,
  fileName,
  fileSize,
  disabled,
  labels,
  onFileSelect,
  onDragStateChange,
}: ImageUploadZoneProps) {
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    onFileSelect(selectedFile)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    onDragStateChange(false)
    const droppedFile = event.dataTransfer.files?.[0]
    if (!droppedFile) return
    onFileSelect(droppedFile)
  }

  return (
    <section className="panel-card new-analysis-upload">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="section-heading__eyebrow">{labels.title}</p>
          <h2>{labels.title}</h2>
        </div>
      </div>

      <label
        className={`upload-zone ${isDragActive ? 'upload-zone--active' : ''} ${disabled ? 'upload-zone--disabled' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) onDragStateChange(true)
        }}
        onDragLeave={() => onDragStateChange(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          className="upload-zone__input"
          onChange={handleInputChange}
          disabled={disabled}
        />

        <div className="upload-zone__content">
          <p className="upload-zone__title">{isDragActive ? labels.dragActiveHint : labels.hint}</p>
          <p className="upload-zone__formats">{labels.formats}</p>
          <span className="upload-zone__button">{labels.clickSelect}</span>
        </div>
      </label>

      {fileName && fileSize ? (
        <div className="upload-zone__meta">
          <p>
            {labels.fileNameLabel}: <strong>{fileName}</strong>
          </p>
          <p>
            {labels.fileSizeLabel}: <strong>{fileSize}</strong>
          </p>
        </div>
      ) : null}
    </section>
  )
}

export default ImageUploadZone