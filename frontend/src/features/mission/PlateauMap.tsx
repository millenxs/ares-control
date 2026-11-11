import { useState } from "react";
import type { Direction, Probe } from "../../shared/api/probesApi";
import { Button } from "../../shared/ui/Primitives";
import { MarsCanvas3D } from "./MarsCanvas3D";
import type { PreviewResult } from "./previewNavigation";

interface PlateauMapProps {
  selectedProbe: Probe;
  probes: Probe[];
  trail?: Array<{ x: number; y: number }>;
  previewResult?: PreviewResult | null;
}

const DIRECTION_ROTATION_DEG: Record<Direction, number> = {
  NORTH: 0,
  EAST: 90,
  SOUTH: 180,
  WEST: 270,
};

function buildAxisTicks(maxCoordinate: number): number[] {
  if (maxCoordinate <= 7) {
    return Array.from({ length: maxCoordinate + 1 }, (_, index) => index);
  }
  let step = 5;
  if (maxCoordinate <= 12) {
    step = 2;
  } else if (maxCoordinate <= 20) {
    step = 5;
  } else {
    step = 10;
  }

  const ticks: number[] = [];
  for (let value = 0; value <= maxCoordinate; value += step) {
    ticks.push(value);
  }
  if (ticks[ticks.length - 1] !== maxCoordinate) {
    ticks.push(maxCoordinate);
  }
  return ticks;
}

export function PlateauMap({
  selectedProbe,
  probes,
  trail = [],
  previewResult,
}: PlateauMapProps) {
  const [is3DView, setIs3DView] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  const { max_x: maxX, max_y: maxY } = selectedProbe.plateau;
  const cols = maxX + 1;
  const rows = maxY + 1;

  const boardSize = 480;
  const padLeft = 46;
  const padRight = 32;
  const padTop = 32;
  const padBottom = 44;

  const usableWidth = boardSize - padLeft - padRight;
  const usableHeight = boardSize - padTop - padBottom;
  const cellSize = Math.min(usableWidth / cols, usableHeight / rows, 68);

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
  const markerRadius = Math.max(Math.min(cellSize * 0.44, 26), 12);

  const otherVisibleProbes = probes.filter(
    (p) =>
      p.id !== selectedProbe.id &&
      p.x <= maxX &&
      p.y <= maxY &&
      !(p.x === selectedProbe.x && p.y === selectedProbe.y),
  );

  const colocatedCount = probes.filter(
    (p) => p.x === selectedProbe.x && p.y === selectedProbe.y,
  ).length;

  const showInternalCellNumbers = cols <= 6 && rows <= 6;

  return (
    <div className="planalto-hud-container">
      {/* Top Orbit Tag estilo Image 1 */}
      <div className="explorer-orbit-pill" aria-label="Status orbital da sonda">
        <span className="dot-cyan" />
        <span>
          EXPLORER SONDA // PLANALTO ({selectedProbe.x}, {selectedProbe.y},{" "}
          {selectedProbe.direction})
        </span>
        <span className="sep-line">|</span>
        <span className="malha-highlight">
          MALHA {maxX}x{maxY}
        </span>
        {hoveredCell ? (
          <span className="hover-readout-pill">
            Cursor: ({hoveredCell.x}, {hoveredCell.y})
          </span>
        ) : null}
      </div>

      <div
        className={`mars-arena-viewport ${is3DView ? "view-perspective-3d" : "view-perspective-2d"}`}
      >
        {/* Globo 3D de Marte e anéis orbitais no fundo */}
        <div className="mars-space-backdrop" aria-hidden="true">
          <MarsCanvas3D />
          <svg className="space-orbits-svg" viewBox="0 0 600 600">
            <ellipse
              cx="300"
              cy="300"
              rx="285"
              ry="140"
              transform="rotate(-26 300 300)"
              className="orbit-dashed-teal"
            />
            <ellipse
              cx="300"
              cy="300"
              rx="285"
              ry="140"
              transform="rotate(26 300 300)"
              className="orbit-dashed-orange"
            />
            <circle cx="300" cy="18" r="4.5" className="orbit-cyan-node" />
            <circle cx="300" cy="582" r="4.5" className="orbit-cyan-node" />
          </svg>
        </div>

        {/* HUD Box Central estilo Image 1 */}
        <div className="planalto-hud-box">
          {/* Header do HUD */}
          <div className="hud-box-header">
            <span className="hud-title-grid">
              PLANALTO MARCIANO // GRID {maxX}x{maxY}
            </span>
            <div className="hud-safe-tag">
              <span className="dot-green" />
              <span>LIMITE SEGURO [0..{maxX}]</span>
            </div>
          </div>

          {/* Abas Cardinais discretas no topo e na base (sem sobrepor os números do eixo Y) */}
          <div className="hud-cardinal-bar-top">
            <span className="hud-cardinal-lbl">◄ OESTE (X: 0)</span>
            <span className="hud-cardinal-badge">▲ NORTE (Y max: {maxY})</span>
            <span className="hud-cardinal-lbl">LESTE (X: {maxX}) ►</span>
          </div>

          {/* SVG da Malha Tática */}
          <div className="hud-grid-wrapper">
            <svg
              className="planalto-svg"
              viewBox={`0 0 ${boardSize} ${boardSize}`}
              role="img"
              aria-label={`Malha da sonda ${selectedProbe.id} com limites (${maxX}, ${maxY}), posição (${selectedProbe.x}, ${selectedProbe.y}) e direção ${selectedProbe.direction}`}
            >
              {/* Superfície do platô */}
              <rect
                x={originX}
                y={originY}
                width={gridWidth}
                height={gridHeight}
                className="plateau-surface-clean"
                rx={4}
              />

              {/* Grid Lines */}
              {cols <= 25 &&
                Array.from({ length: cols + 1 }, (_, cIdx) => {
                  const xPos = originX + cIdx * cellSize;
                  return (
                    <line
                      key={`vl-${cIdx}`}
                      x1={xPos}
                      y1={originY}
                      x2={xPos}
                      y2={originY + gridHeight}
                      className="hud-grid-line"
                    />
                  );
                })}

              {rows <= 25 &&
                Array.from({ length: rows + 1 }, (_, rIdx) => {
                  const yPos = originY + rIdx * cellSize;
                  return (
                    <line
                      key={`hl-${rIdx}`}
                      x1={originX}
                      y1={yPos}
                      x2={originX + gridWidth}
                      y2={yPos}
                      className="hud-grid-line"
                    />
                  );
                })}

              {/* Coordenadas e áreas de hover em cada célula */}
              {Array.from({ length: rows }, (_, rIdx) => {
                const yCoord = maxY - rIdx;
                return Array.from({ length: cols }, (_, cIdx) => {
                  const xCoord = cIdx;
                  const xPos = originX + cIdx * cellSize;
                  const yPos = originY + rIdx * cellSize;
                  const isActive =
                    xCoord === selectedProbe.x && yCoord === selectedProbe.y;

                  return (
                    <g
                      key={`cell-${xCoord}-${yCoord}`}
                      onMouseEnter={() => setHoveredCell({ x: xCoord, y: yCoord })}
                      onMouseLeave={() => setHoveredCell(null)}
                      className="cell-hover-group"
                    >
                      <rect
                        x={xPos}
                        y={yPos}
                        width={cellSize}
                        height={cellSize}
                        className="cell-hitbox"
                      />
                      {showInternalCellNumbers && !isActive && (
                        <text
                          x={xPos + cellSize / 2}
                          y={yPos + cellSize / 2 + 3.5}
                          textAnchor="middle"
                          className="hud-cell-coords"
                        >
                          {xCoord},{yCoord}
                        </text>
                      )}
                    </g>
                  );
                });
              })}

              {/* Rastro do percurso percorrido (visited trail) */}
              {trail.length > 1 && (
                <polyline
                  points={trail
                    .map((pt) => {
                      const c = cellCenter(pt.x, pt.y);
                      return `${c.cx},${c.cy}`;
                    })
                    .join(" ")}
                  className="probe-trail-path"
                />
              )}
              {trail.map((pt, tIdx) => {
                const c = cellCenter(pt.x, pt.y);
                const opacity = Math.max(0.2, (tIdx + 1) / trail.length);
                return (
                  <circle
                    key={`trail-dot-${tIdx}`}
                    cx={c.cx}
                    cy={c.cy}
                    r={Math.max(cellSize * 0.12, 3)}
                    style={{ opacity }}
                    className="probe-trail-dot"
                  />
                );
              })}

              {/* Pré-visualização fantasma do comando antes de transmitir (Dry-run preview) */}
              {previewResult && (
                <g className="preview-ghost-layer">
                  {/* Trajeto válido percorrido na previsão */}
                  {previewResult.steps.length > 0 && (
                    <polyline
                      points={[
                        `${activeCell.cx},${activeCell.cy}`,
                        ...previewResult.steps.map((st) => {
                          const c = cellCenter(st.x, st.y);
                          return `${c.cx},${c.cy}`;
                        }),
                      ].join(" ")}
                      className="preview-ghost-path"
                    />
                  )}

                  {/* Sonda fantasma no destino previsto */}
                  {previewResult.isValid && previewResult.steps.length > 0 && (() => {
                    const finalC = cellCenter(
                      previewResult.finalPosition.x,
                      previewResult.finalPosition.y,
                    );
                    const finalDeg = DIRECTION_ROTATION_DEG[previewResult.finalDirection];
                    return (
                      <g transform={`translate(${finalC.cx}, ${finalC.cy})`}>
                        <circle r={markerRadius * 0.9} className="ghost-probe-ring" />
                        <g transform={`rotate(${finalDeg})`}>
                          <polygon
                            points={`0,${-markerRadius * 0.7} ${markerRadius * 0.45},${markerRadius * 0.5} 0,${markerRadius * 0.2} ${-markerRadius * 0.45},${markerRadius * 0.5}`}
                            className="ghost-probe-arrow"
                          />
                        </g>
                      </g>
                    );
                  })()}

                  {/* Alerta de colisão visual caso um comando saia da malha */}
                  {previewResult.failedStep && (() => {
                    const fromC = cellCenter(
                      previewResult.failedStep.fromX,
                      previewResult.failedStep.fromY,
                    );
                    const invRow = maxY - previewResult.failedStep.targetY;
                    const targetCx = originX + (previewResult.failedStep.targetX + 0.5) * cellSize;
                    const targetCy = originY + (invRow + 0.5) * cellSize;
                    return (
                      <g className="preview-crash-group">
                        <line
                          x1={fromC.cx}
                          y1={fromC.cy}
                          x2={targetCx}
                          y2={targetCy}
                          className="preview-crash-line"
                        />
                        <g transform={`translate(${targetCx}, ${targetCy})`}>
                          <circle r={markerRadius * 0.85} className="crash-pulse-circle" />
                          <text y={4} textAnchor="middle" className="crash-x-icon">
                            ✖
                          </text>
                        </g>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* Ticks dos eixos numéricos nas bordas externas */}
              {xTicks.map((xVal) => {
                const c = cellCenter(xVal, 0);
                return (
                  <text
                    key={`xtick-${xVal}`}
                    x={c.cx}
                    y={originY + gridHeight + 16}
                    textAnchor="middle"
                    className="axis-tick-clean"
                  >
                    {xVal}
                  </text>
                );
              })}
              {yTicks.map((yVal) => {
                const c = cellCenter(0, yVal);
                return (
                  <text
                    key={`ytick-${yVal}`}
                    x={originX - 10}
                    y={c.cy + 4}
                    textAnchor="end"
                    className="axis-tick-clean"
                  >
                    {yVal}
                  </text>
                );
              })}

              {/* Sondas secundárias na mesma malha */}
              {otherVisibleProbes.map((p) => {
                const c = cellCenter(p.x, p.y);
                return (
                  <circle
                    key={p.id}
                    cx={c.cx}
                    cy={c.cy}
                    r={Math.max(markerRadius * 0.45, 5)}
                    className="secondary-probe-dot"
                  />
                );
              })}

              {/* Célula Ativa e Ícone da Sonda Ampliado com Rotação Suave */}
              <g
                transform={`translate(${activeCell.cx}, ${activeCell.cy})`}
                data-testid="active-probe-marker"
              >
                <circle r={markerRadius * 1.5} className="probe-pulse-wave" />
                <circle r={markerRadius} className="probe-body-core" />
                <g
                  style={{
                    transform: `rotate(${rotationDeg}deg)`,
                    transformOrigin: "center",
                    transition: "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <polygon
                    points={`0,${-markerRadius * 0.76} ${markerRadius * 0.5},${markerRadius * 0.54} 0,${markerRadius * 0.22} ${-markerRadius * 0.5},${markerRadius * 0.54}`}
                    className="probe-heading-pointer"
                  />
                </g>
              </g>

              {colocatedCount > 1 ? (
                <g
                  transform={`translate(${activeCell.cx + markerRadius * 0.85}, ${activeCell.cy - markerRadius * 0.85})`}
                >
                  <circle r={8} className="colocated-badge-circle" />
                  <text y={3} textAnchor="middle" className="colocated-badge-txt">
                    {colocatedCount}
                  </text>
                </g>
              ) : null}
            </svg>
          </div>

          {/* Footer do HUD limpo sem fundo de seleção */}
          <div className="hud-box-footer">
            <span className="hud-origin-tag">
              ORIGEM: (0, 0) · ATUAL: ({selectedProbe.x}, {selectedProbe.y})
            </span>
            <span className="hud-probe-id">
              PROBE: {selectedProbe.id.slice(0, 6).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="hud-view-toggle">
        <Button
          variant="secondary"
          className="btn-hud-toggle"
          aria-pressed={is3DView}
          onClick={() => setIs3DView((v) => !v)}
        >
          {is3DView ? "Perspectiva: 3D" : "Perspectiva: 2D"}
        </Button>
      </div>
    </div>
  );
}
