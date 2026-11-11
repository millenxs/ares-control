import type { Direction, Probe } from "../../shared/api/probesApi";
import { MarsCanvas3D } from "./MarsCanvas3D";
import { PlateauMap } from "./PlateauMap";

interface MissionOverviewProps {
  selectedProbe: Probe | null;
  probes: Probe[];
}

const DIRECTION_LABELS: Record<Direction, string> = {
  NORTH: "NORTH · Norte (↑)",
  EAST: "EAST · Leste (→)",
  SOUTH: "SOUTH · Sul (↓)",
  WEST: "WEST · Oeste (←)",
};

export function MissionOverview({
  selectedProbe,
  probes,
}: MissionOverviewProps) {
  return (
    <section
      role="region"
      aria-label="Observatório Cartográfico e Telemetria"
      className="observatory-stage-region"
    >
      <div className="observatory-top-tag" aria-hidden="true">
        . Authentic Photograph .
      </div>

      {!selectedProbe ? (
        <div className="observatory-orbit-view">
          <div className="orbit-pill-tag">• ARES ORBITER // 3.4 km/s</div>

          <div className="mars-orbit-canvas-wrapper" aria-hidden="true">
            <MarsCanvas3D />
          </div>

          <div className="orbit-target-beacon">
            <span className="beacon-ring" />
            <span className="beacon-label">VALLES MARINERIS</span>
          </div>

          <div className="orbit-idle-caption">
            <h3 className="orbit-idle-title">Nenhum sinal de sonda na superfície</h3>
            <p className="orbit-idle-desc">
              Utilize o painel à direita para configurar a malha e efetuar o
              pouso nas coordenadas (0, 0).
            </p>
          </div>
        </div>
      ) : (
        <div className="observatory-active-view">
          <div
            className="observatory-telemetry-hud"
            aria-label="Telemetria da sonda selecionada"
          >
            <div className="hud-pill">
              <span className="hud-key">POSIÇÃO</span>
              <span className="hud-val hud-mono">({selectedProbe.x}, {selectedProbe.y})</span>
            </div>
            <div className="hud-pill">
              <span className="hud-key">DIREÇÃO</span>
              <span className="hud-val hud-accent">
                {DIRECTION_LABELS[selectedProbe.direction]}
              </span>
            </div>
            <div className="hud-pill">
              <span className="hud-key">DIMENSÃO</span>
              <span className="hud-val hud-mono">
                Malha {selectedProbe.plateau.max_x} × {selectedProbe.plateau.max_y}
              </span>
            </div>
            <div className="hud-pill hud-pill-id" title={selectedProbe.id}>
              <span className="hud-key">ID</span>
              <span className="hud-val hud-id">{selectedProbe.id.slice(0, 8)}</span>
            </div>
          </div>

          <PlateauMap selectedProbe={selectedProbe} probes={probes} />
        </div>
      )}
    </section>
  );
}
