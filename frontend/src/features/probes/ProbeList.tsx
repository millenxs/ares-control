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
      badge={<Badge tone="teal">{probes.length} ativa(s)</Badge>}
    >
      {probes.length === 0 ? (
        <p className="empty-state">
          Nenhuma sonda lançada ainda. Configure os limites acima para iniciar.
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
                    <span className="probe-name">
                      Sonda #{index + 1} · {probe.id.slice(0, 8)}
                    </span>
                    <Badge tone={isSelected ? "amber" : "neutral"}>
                      {probe.direction}
                    </Badge>
                  </div>
                  <div className="probe-item-meta">
                    <span>
                      Posição: ({probe.x}, {probe.y})
                    </span>
                    <span>
                      Malha: (0, 0) até ({probe.plateau.max_x},{" "}
                      {probe.plateau.max_y})
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
