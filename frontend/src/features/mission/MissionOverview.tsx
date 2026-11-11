import type { ReactNode } from "react";
import type { Probe } from "../../shared/api/probesApi";
import { Badge, Panel } from "../../shared/ui/Primitives";

interface MissionOverviewProps {
  selectedProbe: Probe | null;
  totalProbes: number;
  children?: ReactNode;
}

export function MissionOverview({
  selectedProbe,
  totalProbes,
  children,
}: MissionOverviewProps) {
  return (
    <Panel
      title="Telemetria e Malha da Sonda"
      subtitle="Estado confirmado pela API para a sonda selecionada."
      badge={
        selectedProbe ? (
          <Badge tone="teal">
            Malha {selectedProbe.plateau.max_x} × {selectedProbe.plateau.max_y}
          </Badge>
        ) : (
          <Badge tone="neutral">Aguardando lançamento</Badge>
        )
      }
    >
      {!selectedProbe ? (
        <div className="empty-state">
          <p>
            Lance uma sonda no painel lateral para visualizar sua posição,
            orientação e limites de navegação.
          </p>
        </div>
      ) : (
        <div className="mission-overview">
          <dl className="telemetry-grid" aria-label="Telemetria da sonda selecionada">
            <div className="telemetry-card">
              <dt>Identificador</dt>
              <dd title={selectedProbe.id}>{selectedProbe.id}</dd>
            </div>
            <div className="telemetry-card">
              <dt>Posição atual (X, Y)</dt>
              <dd>
                ({selectedProbe.x}, {selectedProbe.y})
              </dd>
            </div>
            <div className="telemetry-card">
              <dt>Orientação</dt>
              <dd>{selectedProbe.direction}</dd>
            </div>
            <div className="telemetry-card">
              <dt>Limites da malha</dt>
              <dd>
                X: 0..{selectedProbe.plateau.max_x} · Y: 0..
                {selectedProbe.plateau.max_y} ({totalProbes} sonda(s) na missão)
              </dd>
            </div>
          </dl>

          {children}
        </div>
      )}
    </Panel>
  );
}
