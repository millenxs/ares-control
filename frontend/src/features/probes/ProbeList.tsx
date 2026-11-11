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
    <div className="sci-card sci-card-compact" aria-label="Sondas em Operação">
      <div className="compact-header">
        <span className="compact-title">SONDAS ATIVAS ({probes.length})</span>
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
                  className={`probe-item ${isSelected ? "probe-item-selected" : ""}`.trim()}
                  aria-pressed={isSelected}
                  onClick={() => onSelectProbe(probe.id)}
                >
                  <div className="probe-item-header">
                    <span className="probe-name">
                      Sonda #{index + 1} · <span className="mono-sub">{probe.id.slice(0, 6)}</span>
                    </span>
                    <span className={`probe-dir-tag ${isSelected ? "tag-active" : ""}`}>
                      {probe.direction}
                    </span>
                  </div>
                  <div className="probe-item-meta">
                    <span>
                      Posição: <strong className="mono-inline">({probe.x}, {probe.y})</strong>
                    </span>
                    <span>
                      Malha: <strong className="mono-inline">0..{probe.plateau.max_x} × 0..{probe.plateau.max_y}</strong>
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
