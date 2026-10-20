import { translateText as tr } from '../../i18n/translate.js'
export function BoundingBoxView({ result }) {
  const { image, boxes, summary } = result

  return (
    <div className="analysis-visual">
      <div className="panel-header">
        <h3>{tr("YOLO 辨識結果")}</h3>
        <div className="toggle-group">
          <span className="chip success">{tr("原圖")}</span>
          <span className="chip neutral">{tr("標註層")}</span>
        </div>
      </div>

      <div className="image-stage">
        <img src={image} alt={tr('顯微鏡影像')} />
        {boxes.map((box) => (
          <span
            key={box.id}
            className="bounding-box"
            style={{
              left: `${box.x}%`,
              top: `${box.y}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
          />
        ))}
      </div>

      <div className="summary-row">
        <div>
          <span>{tr("辨識精子")}</span>
          <strong>{summary.detected}</strong>
        </div>
        <div>
          <span>{tr("密度")}</span>
          <strong>{summary.density}</strong>
        </div>
        <div>
          <span>{tr("正常率")}</span>
          <strong>{summary.normalRate}</strong>
        </div>
      </div>
    </div>
  )
}
