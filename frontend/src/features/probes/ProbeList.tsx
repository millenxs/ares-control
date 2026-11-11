import type { Probe } from "../../shared/api/probesApi";
import { Badge, Panel } from "../../shared/ui/Primitives";

interface ProbeListProps {
  probes: Probe[];
  selectedProbeId: string | null;
  onSelectProbe: (probeId: string) => void;
}

export function ProbeList({
  probes,
  selectedProbeId,
  onSelectProbe,
}: ProbeListProps) {
  return (
    <Panel
      title="Sondas em Operação"
      subtitle="Selecione uma sonda para inspecionar sua malha e enviar comandos."
      badge={<Badge tone="neutral">{probes.length} ativa(s)</Badge>}
    >
      {probes.length === 0 ? (
        <p className="empty-state">
          Nenhuma sonda lançada ainda. Configure os limites acima para iniciar o
          pouso.
        </p>
      ) : (
        <ul className="probe-list" aria-label="Lista de sondas">
          {probes.map((probe, index) => {
            const isSelected = probe.id === selectedProbeId;
            return (
              <li key={probe.id}>
                <button
                  type="button"
                  className={`probe-item ${isSelected ? "probe-item-selected" : ""}`.trim()}
                  aria-pressed={isSelected}
                  onClick={() => onSelectProbe(probe.id)}
                >
                  <div className="probe-item-header">
                    <div className="probe-title-group">
                      <span className="probe-name">Sonda #{index + 1}</span>
                      <span className="probe-short-id">
                        {probe.id.slice(0, 8)}
                      </span>
                    </div>
                    <Badge tone={isSelected ? "mars" : "neutral"}>
                      {probe.direction}
                    </Badge>
                  </div>
                  <div className="probe-item-meta">
                    <span>
                      Posição:{" "}
                      <strong className="mono-inline">
                        ({probe.x}, {probe.y})
                      </strong>
                    </span>
                    <span>
                      Malha:{" "}
                      <strong className="mono-inline">
                        0..{probe.plateau.max_x} × 0..{probe.plateau.max_y}
                      </strong>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
