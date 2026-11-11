import { useState } from "react";
import type { Direction, Probe } from "../../shared/api/probesApi";
import { Button } from "../../shared/ui/Primitives";
import { MarsCanvas3D } from "./MarsCanvas3D";

interface PlateauMapProps {
  selectedProbe: Probe;
  probes: Probe[];
}

const DIRECTION_ARROWS: Record<Direction, string> = {
  NORTH: "▲",
  EAST: "►",
  SOUTH: "▼",
  WEST: "◄",
};

export function PlateauMap({ selectedProbe, probes }: PlateauMapProps) {
  const [is3DView, setIs3DView] = useState(true);

  const { max_x: maxX, max_y: maxY } = selectedProbe.plateau;
  const cols = maxX + 1;
  const rows = maxY + 1;

  const boardSize = 480;
  const cellSize = Math.min(boardSize / Math.max(cols, rows), 72);
  const gridWidth = cellSize * cols;
  const gridHeight = cellSize * rows;

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

          {/* Abas Cardinais nas Bordas */}
          <div className="hud-cardinal-tag tag-north">
            ▲ NORTH (Y max: {maxY})
          </div>
          <div className="hud-cardinal-tag tag-west">
            ◄ WEST (X: 0)
          </div>
          <div className="hud-cardinal-tag tag-east">
            EAST (X: {maxX}) ►
          </div>
          <div className="hud-cardinal-tag tag-south">
            ▼ SOUTH (Y: 0)
          </div>

          {/* SVG com as células numeradas e o marcador ativo estilo Image 1 */}
          <div className="hud-grid-wrapper">
            <svg
              className="planalto-svg"
              viewBox={`0 0 ${gridWidth} ${gridHeight}`}
              role="img"
              aria-label={`Malha da sonda ${selectedProbe.id} com limites (${maxX}, ${maxY}), posição (${selectedProbe.x}, ${selectedProbe.y}) e direção ${selectedProbe.direction}`}
            >
              {/* Células da malha (da linha maxY até 0) */}
              {Array.from({ length: rows }, (_, rIdx) => {
                const yCoord = maxY - rIdx;
                return Array.from({ length: cols }, (_, cIdx) => {
                  const xCoord = cIdx;
                  const xPos = cIdx * cellSize;
                  const yPos = rIdx * cellSize;
                  const isActive =
                    xCoord === selectedProbe.x && yCoord === selectedProbe.y;

                  if (isActive) {
                    return null;
                  }

                  return (
                    <g key={`cell-${xCoord}-${yCoord}`}>
                      <rect
                        x={xPos + 2}
                        y={yPos + 2}
                        width={cellSize - 4}
                        height={cellSize - 4}
                        className="hud-cell-bg"
                        rx={3}
                      />
                      <text
                        x={xPos + cellSize / 2}
                        y={yPos + cellSize / 2 + 4}
                        textAnchor="middle"
                        className="hud-cell-coords"
                      >
                        {xCoord},{yCoord}
                      </text>
                    </g>
                  );
                });
              })}

              {/* Sondas secundárias */}
              {otherVisibleProbes.map((p) => {
                const xPos = p.x * cellSize + cellSize / 2;
                const yPos = (maxY - p.y) * cellSize + cellSize / 2;
                return (
                  <circle
                    key={p.id}
                    cx={xPos}
                    cy={yPos}
                    r={Math.max(cellSize * 0.22, 6)}
                    className="secondary-probe-dot"
                  />
                );
              })}

              {/* Célula Ativa da Sonda em Destaque Neon estilo Image 1 */}
              {(() => {
                const activeXPos = selectedProbe.x * cellSize;
                const activeYPos = (maxY - selectedProbe.y) * cellSize;
                const arrow = DIRECTION_ARROWS[selectedProbe.direction];
                const dirCode = selectedProbe.direction[0];

                return (
                  <g
                    transform={`translate(${activeXPos}, ${activeYPos})`}
                    data-testid="active-probe-marker"
                  >
                    <rect
                      x={2}
                      y={2}
                      width={cellSize - 4}
                      height={cellSize - 4}
                      className="hud-cell-active"
                      rx={4}
                    />
                    <circle cx={4} cy={4} r={2} className="corner-pip" />
                    <text
                      x={cellSize / 2}
                      y={cellSize / 2 - 3}
                      textAnchor="middle"
                      className="active-arrow-text"
                    >
                      {arrow}
                    </text>
                    <text
                      x={cellSize / 2}
                      y={cellSize / 2 + 13}
                      textAnchor="middle"
                      className="active-coord-text"
                    >
                      {selectedProbe.x},{selectedProbe.y}-{dirCode}
                    </text>

                    {colocatedCount > 1 ? (
                      <g transform={`translate(${cellSize - 12}, 6)`}>
                        <circle r={7} className="colocated-pip" />
                        <text y={3} textAnchor="middle" className="colocated-txt">
                          {colocatedCount}
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Footer do HUD */}
          <div className="hud-box-footer">
            <span className="hud-origin-tag">
              ORIGEM: POUSO CONCLUÍDO (0, 0)
            </span>
            <span className="hud-probe-id">
              PROBE: {selectedProbe.id.slice(0, 6).toUpperCase()} ACTIVE
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
