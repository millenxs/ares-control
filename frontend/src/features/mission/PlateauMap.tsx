import { useEffect, useState } from "react";
import type { Direction, Probe } from "../../shared/api/probesApi";
import { Button } from "../../shared/ui/Primitives";
import { MarsCanvas3D } from "./MarsCanvas3D";
import type { PreviewResult } from "./previewNavigation";

interface PlateauMapProps {
  selectedProbe: Probe;
  probes: Probe[];
  trail?: Array<{ x: number; y: number }>;
  previewResult?: PreviewResult | null;
  onSelectProbe?: (probeId: string) => void;
  onSelectCell?: (x: number, y: number) => void;
}

const DIRECTION_TARGET_ANGLE: Record<Direction, number> = {
  NORTH: 0,
  EAST: 90,
  SOUTH: 180,
  WEST: 270,
};

/**
 * Calcula o menor delta angular em [-180°, +180°] entre o ângulo acumulado atual
 * e a nova direção cardinal. Isso evita que a transição CSS gire 270° para trás
 * ao passar de WEST (270°) para NORTH (0°) com o comando R (+90°).
 */
function getShortestAngleDelta(currentAngle: number, targetDirection: Direction): number {
  const targetAngle = DIRECTION_TARGET_ANGLE[targetDirection];
  const normalizedCurrent = ((currentAngle % 360) + 360) % 360;
  return (((targetAngle - normalizedCurrent + 540) % 360) - 180);
}

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
  onSelectProbe,
  onSelectCell,
}: PlateauMapProps) {
  const [is3DView, setIs3DView] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  const effectivePosition =
    previewResult && previewResult.isValid && previewResult.steps.length > 0
      ? previewResult.finalPosition
      : { x: selectedProbe.x, y: selectedProbe.y };

  const effectiveDirection =
    previewResult && previewResult.isValid && previewResult.steps.length > 0
      ? previewResult.finalDirection
      : selectedProbe.direction;

  const [accumulatedAngle, setAccumulatedAngle] = useState(
    DIRECTION_TARGET_ANGLE[effectiveDirection],
  );
  const [lastDirection, setLastDirection] = useState(effectiveDirection);

  useEffect(() => {
    if (effectiveDirection !== lastDirection) {
      const delta = getShortestAngleDelta(accumulatedAngle, effectiveDirection);
      setAccumulatedAngle((prev) => prev + delta);
      setLastDirection(effectiveDirection);
    }
  }, [effectiveDirection, lastDirection, accumulatedAngle]);

  const { max_x: maxX, max_y: maxY } = selectedProbe.plateau;
  const cols = maxX + 1;
  const rows = maxY + 1;

  const boardSize = 500;
  const padLeft = 48;
  const padRight = 36;
  const padTop = 36;
  const padBottom = 48;

  const usableWidth = boardSize - padLeft - padRight;
  const usableHeight = boardSize - padTop - padBottom;
  const cellSize = Math.min(usableWidth / cols, usableHeight / rows, 72);

  const gridWidth = cellSize * cols;
  const gridHeight = cellSize * rows;
  const originX = padLeft + (usableWidth - gridWidth) / 2;
  const originY = padTop + (usableHeight - gridHeight) / 2;

  const xTicks = buildAxisTicks(maxX);
  const yTicks = buildAxisTicks(maxY);

  /**
   * Converte coordenadas cartesianas do domínio (onde (0,0) fica no canto inferior
   * esquerdo e Y cresce para o Norte/topo) para coordenadas do canvas SVG (onde Y=0
   * fica no topo).
   */
  function cellCenter(x: number, y: number): { cx: number; cy: number } {
    const invertedRow = maxY - y;
    return {
      cx: originX + (x + 0.5) * cellSize,
      cy: originY + (invertedRow + 0.5) * cellSize,
    };
  }

  const originCell = cellCenter(selectedProbe.x, selectedProbe.y);
  const activeCell = cellCenter(effectivePosition.x, effectivePosition.y);
  const markerRadius = Math.max(Math.min(cellSize * 0.44, 26), 13);

  const otherVisibleProbes = probes.filter(
    (p) =>
      p.id !== selectedProbe.id &&
      p.x <= maxX &&
      p.y <= maxY &&
      !(p.x === selectedProbe.x && p.y === selectedProbe.y),
  );

  const colocatedProbes = probes.filter(
    (p) => p.x === selectedProbe.x && p.y === selectedProbe.y,
  );
  const colocatedCount = colocatedProbes.length;

  function cycleColocatedProbe() {
    if (colocatedCount <= 1 || !onSelectProbe) {
      return;
    }
    const currentIdx = colocatedProbes.findIndex((p) => p.id === selectedProbe.id);
    const nextProbe = colocatedProbes[(currentIdx + 1) % colocatedCount];
    if (nextProbe) {
      onSelectProbe(nextProbe.id);
    }
  }

  const showInternalCellNumbers = cols <= 6 && rows <= 6;
  const shortId = selectedProbe.id.slice(0, 6).toLowerCase();
  const selectedIndex = probes.findIndex((p) => p.id === selectedProbe.id) + 1;

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
          MALHA {maxX} × {maxY}
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
          <svg className="space-orbits-svg" viewBox="0 0 680 680">
            <ellipse
              cx="340"
              cy="340"
              rx="325"
              ry="160"
              transform="rotate(-26 340 340)"
              className="orbit-dashed-teal"
            />
            <ellipse
              cx="340"
              cy="340"
              rx="325"
              ry="160"
              transform="rotate(26 340 340)"
              className="orbit-dashed-orange"
            />
            <circle cx="340" cy="20" r="4.5" className="orbit-cyan-node" />
            <circle cx="340" cy="660" r="4.5" className="orbit-cyan-node" />
          </svg>
        </div>

        {/* HUD Box Central estilo Image 1 */}
        <div className="planalto-hud-box">
          {/* Header do HUD */}
          <div className="hud-box-header">
            <span className="hud-title-grid">
              PLANALTO MARCIANO // GRID {maxX} × {maxY}
            </span>
            <div className="hud-safe-tag">
              <span className="dot-green" />
              <span>LIMITE SEGURO [0..{maxX}, 0..{maxY}]</span>
            </div>
          </div>

          {/* Abas Cardinais no Topo */}
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
              {/* 1. Superfície do platô */}
              <rect
                x={originX}
                y={originY}
                width={gridWidth}
                height={gridHeight}
                className="plateau-surface-clean"
                rx={4}
              />

              {/* 2. Grid Lines */}
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

              {/* 3. Rastro do percurso percorrido (desenhado POR BAIXO das células e rótulos) */}
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
                    r={Math.max(cellSize * 0.1, 2.5)}
                    style={{ opacity }}
                    className="probe-trail-dot"
                  />
                );
              })}

              {/* 4. Coordenadas e áreas de hover em cada célula */}
              {Array.from({ length: rows }, (_, rIdx) => {
                const yCoord = maxY - rIdx;
                return Array.from({ length: cols }, (_, cIdx) => {
                  const xCoord = cIdx;
                  const xPos = originX + cIdx * cellSize;
                  const yPos = originY + rIdx * cellSize;
                  const isActive =
                    xCoord === selectedProbe.x && yCoord === selectedProbe.y;
                  const hasTrailDot = trail.some((t) => t.x === xCoord && t.y === yCoord);

                  return (
                    <g
                      key={`cell-${xCoord}-${yCoord}`}
                      onMouseEnter={() => setHoveredCell({ x: xCoord, y: yCoord })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => onSelectCell?.(xCoord, yCoord)}
                      data-testid={`grid-cell-${xCoord}-${yCoord}`}
                      className="cell-hover-group"
                    >
                      <title>{`Célula (${xCoord}, ${yCoord}) — clique para preencher rota no buffer`}</title>
                      <rect
                        x={xPos}
                        y={yPos}
                        width={cellSize}
                        height={cellSize}
                        className="cell-hitbox"
                      />
                      {showInternalCellNumbers && !isActive && !hasTrailDot && (
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

              {/* 5. Ticks dos eixos numéricos nas bordas externas */}
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

              {/* 6. Sondas secundárias na mesma malha (somente referência visual; clique passa para a célula) */}
              {otherVisibleProbes.map((p) => {
                const c = cellCenter(p.x, p.y);
                const pDeg = DIRECTION_TARGET_ANGLE[p.direction];
                const pRadius = Math.max(markerRadius * 0.65, 9);
                const pIndex = probes.findIndex((item) => item.id === p.id) + 1;
                const pShortId = p.id.slice(0, 6).toLowerCase();

                return (
                  <g
                    key={p.id}
                    transform={`translate(${c.cx}, ${c.cy})`}
                    className="secondary-probe-group"
                    style={{ pointerEvents: "none" }}
                  >
                    <title>{`Sonda #${pIndex} · ${pShortId} · Pos: (${p.x}, ${p.y}) · Dir: ${p.direction}`}</title>
                    <circle r={pRadius} className="secondary-probe-core" />
                    <g transform={`rotate(${pDeg})`}>
                      <polygon
                        points={`0,${-pRadius * 0.75} ${pRadius * 0.45},${pRadius * 0.45} 0,${pRadius * 0.15} ${-pRadius * 0.45},${pRadius * 0.45}`}
                        className="secondary-probe-arrow"
                      />
                    </g>
                    <text
                      y={pRadius + 10}
                      textAnchor="middle"
                      className="probe-index-tag"
                    >
                      #{pIndex}
                    </text>
                  </g>
                );
              })}

              {/* 7. Trajeto previsto e alerta de colisão (por baixo da sonda ativa, sem segunda seta duplicada) */}
              {previewResult && (
                <g className="preview-ghost-layer" style={{ pointerEvents: "none" }}>
                  {previewResult.steps.length > 0 && (
                    <polyline
                      points={[
                        `${originCell.cx},${originCell.cy}`,
                        ...previewResult.steps.map((st) => {
                          const c = cellCenter(st.x, st.y);
                          return `${c.cx},${c.cy}`;
                        }),
                      ].join(" ")}
                      className="preview-ghost-path-cyan"
                    />
                  )}

                  {previewResult.failedStep && (() => {
                    const fromC = cellCenter(
                      previewResult.failedStep.fromX,
                      previewResult.failedStep.fromY,
                    );
                    const targetXClamped = Math.max(0, Math.min(maxX, previewResult.failedStep.targetX));
                    const targetYClamped = Math.max(0, Math.min(maxY, previewResult.failedStep.targetY));
                    const targetC = cellCenter(targetXClamped, targetYClamped);

                    return (
                      <g className="preview-crash-group">
                        <line
                          x1={fromC.cx}
                          y1={fromC.cy}
                          x2={targetC.cx}
                          y2={targetC.cy}
                          className="preview-crash-line"
                        />
                        <g transform={`translate(${targetC.cx}, ${targetC.cy})`}>
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

              {/* 8. Sonda Ativa Única (gira e se move diretamente ao alterar esquerda, direita e mover) */}
              <g
                transform={`translate(${activeCell.cx}, ${activeCell.cy})`}
                data-testid="active-probe-marker"
                style={{ pointerEvents: "none" }}
              >
                <circle r={markerRadius * 1.5} className="probe-pulse-wave" />
                <circle r={markerRadius} className="probe-body-core" />
                <g
                  transform={`rotate(${accumulatedAngle})`}
                  style={{
                    transform: `rotate(${accumulatedAngle}deg)`,
                    transition: "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <polygon
                    points={`0,${-markerRadius * 0.78} ${markerRadius * 0.52},${markerRadius * 0.5} 0,${markerRadius * 0.22} ${-markerRadius * 0.52},${markerRadius * 0.5}`}
                    className="probe-heading-pointer-bright"
                  />
                </g>
                <text
                  y={markerRadius + 11}
                  textAnchor="middle"
                  className="active-probe-index-tag"
                >
                  #{selectedIndex}
                </text>
              </g>

              {/* Badge de Sondas Empilhadas com Tooltip e Clique para Alternar */}
              {colocatedCount > 1 ? (
                <g
                  transform={`translate(${activeCell.cx + markerRadius * 0.85}, ${activeCell.cy - markerRadius * 0.85})`}
                  onClick={cycleColocatedProbe}
                  style={{ cursor: "pointer" }}
                >
                  <title>{`${colocatedCount} sondas nesta posição — clique para alternar seleção`}</title>
                  <circle r={9} className="colocated-badge-circle" />
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
              SONDA #{selectedIndex} · {shortId}
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
