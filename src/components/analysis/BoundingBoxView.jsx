export function BoundingBoxView({ result }) {
  const { image, boxes, summary } = result

  return (
    <div className="analysis-visual">
      <div className="panel-header">
        <h3>YOLO 辨識結果</h3>
        <div className="toggle-group">
          <span className="chip success">原圖</span>
          <span className="chip neutral">標註層</span>
        </div>
      </div>

      <div className="image-stage">
        <img src={image} alt="Microscope smear" />
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
          <span>辨識精子</span>
          <strong>{summary.detected}</strong>
        </div>
        <div>
          <span>密度</span>
          <strong>{summary.density}</strong>
        </div>
        <div>
          <span>正常率</span>
          <strong>{summary.normalRate}</strong>
        </div>
      </div>
    </div>
  )
}
