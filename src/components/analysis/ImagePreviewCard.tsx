import type { ChangeEvent } from 'react'

type ImagePreviewCardProps = {
  src: string | null
  alt: string
  removeLabel: string
  replaceLabel: string
  disabled?: boolean
  onReplace: (file: File) => void
  onRemove: () => void
}

function ImagePreviewCard({
  src,
  alt,
  removeLabel,
  replaceLabel,
  disabled,
  onReplace,
  onRemove,
}: ImagePreviewCardProps) {
  const handleReplace = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    onReplace(selectedFile)
    event.target.value = ''
  }

  return (
    <section className="panel-card preview-card">
      {src ? (
        <img src={src} alt={alt} className="preview-card__image" />
      ) : (
        <div className="preview-card__empty">{alt}</div>
      )}

      <div className="preview-card__actions">
        <label className={`preview-card__action ${disabled ? 'preview-card__action--disabled' : ''}`}>
          {replaceLabel}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleReplace}
            disabled={disabled}
          />
        </label>
        <button type="button" onClick={onRemove} disabled={disabled}>
          {removeLabel}
        </button>
      </div>
    </section>
  )
}

export default ImagePreviewCard