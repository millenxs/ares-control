import type { Probe } from "../../shared/api/probesApi";

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
    <div className="sci-card sci-card-probes" aria-label="Sondas em Operação">
      <div className="probes-card-header">
        <div className="probes-title-group">
          <span className="dot-green" />
          <span className="probes-card-title">
            SONDAS ATIVAS ({probes.length})
          </span>
        </div>
        <span className="grid-sync-tag">GRID SYNC OK</span>
      </div>

      {probes.length === 0 ? (
        <p className="empty-fleet">
          Nenhuma sonda pousada na superfície.
        </p>
      ) : (
        <ul className="probe-list" aria-label="Lista de sondas">
          {probes.map((probe, index) => {
            const isSelected = probe.id === selectedProbeId;
            return (
              <li key={probe.id}>
                <button
                  type="button"
                  className={`probe-row-btn ${isSelected ? "probe-row-selected" : ""}`.trim()}
                  aria-pressed={isSelected}
                  onClick={() => onSelectProbe(probe.id)}
                >
                  <span className="probe-left-info">
                    <span className="probe-bullet">•</span>
                    <span className="probe-name">
                      Sonda #{index + 1} · {probe.id.slice(0, 6)} · {probe.direction}
                    </span>
                  </span>
                  <span className="probe-right-info">
                    Pos: ({probe.x}, {probe.y}) | {probe.plateau.max_x}×
                    {probe.plateau.max_y}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
