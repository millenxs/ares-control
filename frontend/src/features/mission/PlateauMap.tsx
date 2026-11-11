import type { Direction, Probe } from "../../shared/api/probesApi";

interface PlateauMapProps {
  selectedProbe: Probe;
  probes: Probe[];
}

const DIRECTION_ROTATION_DEG: Record<Direction, number> = {
  NORTH: 0,
  EAST: 90,
  SOUTH: 180,
  WEST: 270,
};

function buildAxisTicks(maxCoordinate: number): number[] {
  const totalPositions = maxCoordinate + 1;
  if (totalPositions <= 12) {
    return Array.from({ length: totalPositions }, (_, index) => index);
  }
  const step = Math.ceil(maxCoordinate / 10);
  const ticks: number[] = [];
  for (let value = 0; value < maxCoordinate; value += step) {
    ticks.push(value);
  }
  ticks.push(maxCoordinate);
  return ticks;
}

export function PlateauMap({ selectedProbe, probes }: PlateauMapProps) {
  const { max_x: maxX, max_y: maxY } = selectedProbe.plateau;
  const cols = maxX + 1;
  const rows = maxY + 1;

  const boardSize = 520;
  const padLeft = 56;
  const padRight = 36;
  const padTop = 40;
  const padBottom = 54;

  const usableWidth = boardSize - padLeft - padRight;
  const usableHeight = boardSize - padTop - padBottom;
  const cellSize = Math.min(usableWidth / cols, usableHeight / rows, 76);

  const gridWidth = cellSize * cols;
  const gridHeight = cellSize * rows;
  const originX = padLeft + (usableWidth - gridWidth) / 2;
  const originY = padTop + (usableHeight - gridHeight) / 2;

  const xTicks = buildAxisTicks(maxX);
  const yTicks = buildAxisTicks(maxY);

  function cellCenter(x: number, y: number): { cx: number; cy: number } {
    const invertedRow = maxY - y;
    return {
      cx: originX + (x + 0.5) * cellSize,
      cy: originY + (invertedRow + 0.5) * cellSize,
    };
  }

  const activeCell = cellCenter(selectedProbe.x, selectedProbe.y);
  const rotationDeg = DIRECTION_ROTATION_DEG[selectedProbe.direction];
  const markerRadius = Math.max(Math.min(cellSize * 0.34, 20), 8);

  const colocatedCount = probes.filter(
    (probe) => probe.x === selectedProbe.x && probe.y === selectedProbe.y,
  ).length;

  const otherVisibleProbes = probes.filter(
    (probe) =>
      probe.id !== selectedProbe.id &&
      probe.x <= maxX &&
      probe.y <= maxY &&
      !(probe.x === selectedProbe.x && probe.y === selectedProbe.y),
  );

  return (
    <div className="plateau-stage">
      <div className="plateau-stage-bar">
        <span className="plateau-stage-caption">
          Cartografia de Superfície · Origem (0, 0) no canto inferior esquerdo ·
          Norte (↑) no topo
        </span>
        <span className="plateau-stage-bounds">
          ({selectedProbe.x}, {selectedProbe.y}, {selectedProbe.direction}) em
          [0..{maxX}, 0..{maxY}]
        </span>
      </div>

      <svg
        className="plateau-svg"
        viewBox={`0 0 ${boardSize} ${boardSize}`}
        role="img"
        aria-label={`Malha da sonda ${selectedProbe.id} com limites (${maxX}, ${maxY}), posição (${selectedProbe.x}, ${selectedProbe.y}) e direção ${selectedProbe.direction}`}
      >
        <g className="orbital-backdrop" aria-hidden="true">
          <circle
            cx={boardSize / 2}
            cy={boardSize / 2}
            r={230}
            className="orbital-ring"
          />
          <circle
            cx={boardSize / 2}
            cy={boardSize / 2}
            r={165}
            className="orbital-ring orbital-ring-dashed"
          />
          <line
            x1={boardSize / 2}
            y1={12}
            x2={boardSize / 2}
            y2={boardSize - 12}
            className="orbital-axis"
          />
          <line
            x1={12}
            y1={boardSize / 2}
            x2={boardSize - 12}
            y2={boardSize / 2}
            className="orbital-axis"
          />
        </g>

        <rect
          x={originX}
          y={originY}
          width={gridWidth}
          height={gridHeight}
          className="plateau-surface"
          rx={4}
        />

        {cols <= 20 &&
          Array.from({ length: cols + 1 }, (_, colIndex) => {
            const xPos = originX + colIndex * cellSize;
            return (
              <line
                key={`v-${colIndex}`}
                x1={xPos}
                y1={originY}
                x2={xPos}
                y2={originY + gridHeight}
                className="grid-line"
              />
            );
          })}

        {rows <= 20 &&
          Array.from({ length: rows + 1 }, (_, rowIndex) => {
            const yPos = originY + rowIndex * cellSize;
            return (
              <line
                key={`h-${rowIndex}`}
                x1={originX}
                y1={yPos}
                x2={originX + gridWidth}
                y2={yPos}
                className="grid-line"
              />
            );
          })}

        <rect
          x={activeCell.cx - cellSize / 2}
          y={activeCell.cy - cellSize / 2}
          width={cellSize}
          height={cellSize}
          className="active-cell"
        />

        {xTicks.map((xValue) => {
          const { cx } = cellCenter(xValue, 0);
          return (
            <text
              key={`xlabel-${xValue}`}
              x={cx}
              y={originY + gridHeight + 22}
              textAnchor="middle"
              className="axis-tick"
            >
              {xValue}
            </text>
          );
        })}

        {yTicks.map((yValue) => {
          const { cy } = cellCenter(0, yValue);
          return (
            <text
              key={`ylabel-${yValue}`}
              x={originX - 14}
              y={cy + 4}
              textAnchor="end"
              className="axis-tick"
            >
              {yValue}
            </text>
          );
        })}

        <text
          x={originX + gridWidth / 2}
          y={boardSize - 10}
          textAnchor="middle"
          className="axis-title"
        >
          Eixo X (0 → {maxX})
        </text>

        <text
          x={16}
          y={originY + gridHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${originY + gridHeight / 2})`}
          className="axis-title"
        >
          Eixo Y (0 → {maxY})
        </text>

        <text
          x={originX + gridWidth}
          y={originY - 10}
          textAnchor="end"
          className="corner-coordinate"
        >
          ({maxX}, {maxY})
        </text>

        {otherVisibleProbes.map((other) => {
          const pos = cellCenter(other.x, other.y);
          return (
            <g
              key={other.id}
              transform={`translate(${pos.cx}, ${pos.cy})`}
              className="secondary-probe-marker"
            >
              <circle r={Math.max(markerRadius * 0.45, 4)} />
            </g>
          );
        })}

        <g
          transform={`translate(${activeCell.cx}, ${activeCell.cy})`}
          data-testid="active-probe-marker"
        >
          <circle r={markerRadius * 1.35} className="probe-pulse-ring" />
          <circle r={markerRadius} className="probe-core" />
          <g transform={`rotate(${rotationDeg})`}>
            <polygon
              points={`0,${-markerRadius * 0.78} ${markerRadius * 0.56},${markerRadius * 0.58} 0,${markerRadius * 0.25} ${-markerRadius * 0.56},${markerRadius * 0.58}`}
              className="probe-heading-arrow"
            />
          </g>
        </g>

        {colocatedCount > 1 ? (
          <g
            transform={`translate(${activeCell.cx + markerRadius * 0.95}, ${activeCell.cy - markerRadius * 0.95})`}
          >
            <circle r={9} className="colocated-badge-bg" />
            <text
              y={3.5}
              textAnchor="middle"
              className="colocated-badge-text"
            >
              {colocatedCount}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
