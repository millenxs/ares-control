import { useState } from "react";
import type { Direction, Probe } from "../../shared/api/probesApi";
import { Button } from "../../shared/ui/Primitives";
import { MarsCanvas3D } from "./MarsCanvas3D";

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
  const [is3DView, setIs3DView] = useState(true);

  const { max_x: maxX, max_y: maxY } = selectedProbe.plateau;
  const cols = maxX + 1;
  const rows = maxY + 1;

  const boardSize = 540;
  const padLeft = 60;
  const padRight = 44;
  const padTop = 44;
  const padBottom = 58;

  const usableWidth = boardSize - padLeft - padRight;
  const usableHeight = boardSize - padTop - padBottom;
  const cellSize = Math.min(usableWidth / cols, usableHeight / rows, 74);

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
        <div className="plateau-stage-meta">
          <span className="plateau-stage-caption">
            Malha Cartográfica · Origem (0, 0) no canto inferior esquerdo ·
            Norte (↑) no topo
          </span>
          <span className="plateau-stage-bounds">
            Posição ({selectedProbe.x}, {selectedProbe.y}, {selectedProbe.direction}) ·
            Limites [0..{maxX}, 0..{maxY}]
          </span>
        </div>

        <Button
          variant="secondary"
          aria-pressed={is3DView}
          onClick={() => setIs3DView((current) => !current)}
        >
          {is3DView ? "Perspectiva: 3D" : "Perspectiva: 2D"}
        </Button>
      </div>

      <div
        className={`mars-arena ${is3DView ? "mars-arena-3d" : "mars-arena-2d"}`}
      >
        <div className="mars-backdrop-orbit" aria-hidden="true">
          <MarsCanvas3D />
        </div>

        <div className="plateau-board-deck">
          <svg
            className="plateau-svg"
            viewBox={`0 0 ${boardSize} ${boardSize}`}
            role="img"
            aria-label={`Malha da sonda ${selectedProbe.id} com limites (${maxX}, ${maxY}), posição (${selectedProbe.x}, ${selectedProbe.y}) e direção ${selectedProbe.direction}`}
          >
            <rect
              x={originX}
              y={originY}
              width={gridWidth}
              height={gridHeight}
              className="plateau-surface"
              rx={6}
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

            <line
              x1={activeCell.cx}
              y1={originY}
              x2={activeCell.cx}
              y2={originY + gridHeight}
              className="target-crosshair"
              aria-hidden="true"
            />
            <line
              x1={originX}
              y1={activeCell.cy}
              x2={originX + gridWidth}
              y2={activeCell.cy}
              className="target-crosshair"
              aria-hidden="true"
            />

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
                  x={originX - 12}
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
              y={boardSize - 12}
              textAnchor="middle"
              className="axis-title"
            >
              Eixo X (0 → {maxX})
            </text>

            <text
              x={18}
              y={originY + gridHeight / 2}
              textAnchor="middle"
              transform={`rotate(-90 18 ${originY + gridHeight / 2})`}
              className="axis-title"
            >
              Eixo Y (0 → {maxY})
            </text>

            <text
              x={originX + gridWidth}
              y={originY - 12}
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
              <g transform={`rotate(${rotationDeg})`}>
                <polygon
                  points={`0,0 ${-markerRadius * 1.1},${-markerRadius * 2.1} ${markerRadius * 1.1},${-markerRadius * 2.1}`}
                  className="probe-sensor-cone"
                />
              </g>
              <circle r={markerRadius * 1.38} className="probe-pulse-ring" />
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
      </div>
    </div>
  );
}
