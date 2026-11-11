import type { Direction, Probe } from "../../shared/api/probesApi";
import { Badge, Panel } from "../../shared/ui/Primitives";
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
      subtitle="Projeção tática sobre o hemisfério marciano e estado confirmado pela API."
      badge={
        selectedProbe ? (
          <Badge tone="teal">
            Malha {selectedProbe.plateau.max_x} × {selectedProbe.plateau.max_y}
          </Badge>
        ) : (
          <Badge tone="neutral">Órbita livre</Badge>
        )
      }
    >
      {!selectedProbe ? (
        <div className="empty-observatory">
          <div className="empty-mars-showcase" aria-hidden="true">
            <div className="mars-atmosphere-glow" />
            <div className="mars-sphere mars-sphere-idle" />
            <svg className="empty-observatory-svg" viewBox="0 0 280 280">
              <circle cx="140" cy="140" r="126" className="orbital-ring" />
              <circle
                cx="140"
                cy="140"
                r="96"
                className="orbital-ring orbital-ring-dashed"
              />
              <circle cx="140" cy="140" r="56" className="orbital-ring" />
              <line
                x1="140"
                y1="8"
                x2="140"
                y2="272"
                className="orbital-axis"
              />
              <line
                x1="8"
                y1="140"
                x2="272"
                y2="140"
                className="orbital-axis"
              />
              <circle cx="140" cy="140" r="5" className="empty-beacon" />
            </svg>
          </div>
          <h3 className="empty-observatory-title">
            Nenhum sinal de sonda na superfície
          </h3>
          <p className="empty-state">
            Marte aguarda o primeiro pouso. Configure os limites máximos (X, Y)
            e a direção inicial no card à esquerda para lançar uma sonda em (0,
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
