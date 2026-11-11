import type { Direction, Probe } from "../../shared/api/probesApi";
import { Badge, Panel } from "../../shared/ui/Primitives";
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
    <Panel
      title="Observatório Cartográfico e Telemetria"
      subtitle="Superfície de Marte em 3D e estado confirmado pela API para a sonda ativa."
      variant="transparent"
      badge={
        selectedProbe ? (
          <Badge tone="mars">
            Malha {selectedProbe.plateau.max_x} × {selectedProbe.plateau.max_y}
          </Badge>
        ) : (
          <Badge tone="dark">Órbita de Marte</Badge>
        )
      }
    >
      {!selectedProbe ? (
        <div className="empty-observatory">
          <div className="empty-mars-stage" aria-hidden="true">
            <div className="orbit-pill-tag">• ARES ORBITER // 3.4 km/s</div>
            <MarsCanvas3D className="mars-canvas-empty" />
            <div className="orbit-target-beacon">
              <span className="beacon-ring" />
              <span className="beacon-label">VALLES MARINERIS</span>
            </div>
          </div>
          <h3 className="empty-observatory-title">
            Nenhum sinal de sonda na superfície
          </h3>
          <p className="empty-state">
            Aguardando lançamento de sonda. Configure os limites máximos (X, Y)
            e a direção inicial no card à direita para iniciar o pouso em (0,
            0).
          </p>
        </div>
      ) : (
        <div className="mission-overview">
          <dl
            className="telemetry-grid"
            aria-label="Telemetria da sonda selecionada"
          >
            <div className="telemetry-card">
              <dt>Coordenadas (X, Y)</dt>
              <dd className="telemetry-value-mono">
                ({selectedProbe.x}, {selectedProbe.y})
              </dd>
            </div>
            <div className="telemetry-card">
              <dt>Orientação Atual</dt>
              <dd className="telemetry-value-accent">
                {DIRECTION_LABELS[selectedProbe.direction]}
              </dd>
            </div>
            <div className="telemetry-card">
              <dt>Limites da Malha</dt>
              <dd className="telemetry-value-mono">
                0..{selectedProbe.plateau.max_x} × 0..
                {selectedProbe.plateau.max_y}
              </dd>
            </div>
            <div className="telemetry-card">
              <dt>Identificador da Sonda</dt>
              <dd
                className="telemetry-value-mono telemetry-id"
                title={selectedProbe.id}
              >
                {selectedProbe.id}
              </dd>
            </div>
          </dl>

          <PlateauMap selectedProbe={selectedProbe} probes={probes} />
        </div>
      )}
    </Panel>
  );
}
