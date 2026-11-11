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
      subtitle="Estado confirmado pela API para a sonda ativa e representação espacial da malha."
      badge={
        selectedProbe ? (
          <Badge tone="teal">
            Malha {selectedProbe.plateau.max_x} × {selectedProbe.plateau.max_y}
          </Badge>
        ) : (
          <Badge tone="neutral">Sem sonda ativa</Badge>
        )
      }
    >
      {!selectedProbe ? (
        <div className="empty-observatory">
          <svg
            className="empty-observatory-svg"
            viewBox="0 0 240 240"
            aria-hidden="true"
          >
            <circle cx="120" cy="120" r="96" className="orbital-ring" />
            <circle
              cx="120"
              cy="120"
              r="64"
              className="orbital-ring orbital-ring-dashed"
            />
            <circle cx="120" cy="120" r="28" className="orbital-ring" />
            <line
              x1="120"
              y1="12"
              x2="120"
              y2="228"
              className="orbital-axis"
            />
            <line
              x1="12"
              y1="120"
              x2="228"
              y2="120"
              className="orbital-axis"
            />
            <circle cx="120" cy="120" r="5" className="empty-beacon" />
          </svg>
          <h3 className="empty-observatory-title">
            Nenhum sinal de sonda na superfície
          </h3>
          <p className="empty-state">
            Configure os limites máximos (X, Y) e a direção inicial no painel à
            esquerda para lançar a primeira sonda em (0, 0).
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
