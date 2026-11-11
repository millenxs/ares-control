import { useEffect, useRef } from "react";
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
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof selectedItemRef.current?.scrollIntoView === "function") {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedProbeId]);

  return (
    <div className="sci-card sci-card-probes" aria-label="Sondas em Operação">
      <div className="probes-card-header">
        <div className="probes-title-group">
          <span className="dot-green" />
          <span className="probes-card-title">
            SONDAS ATIVAS ({probes.length})
          </span>
        </div>
        <span className="grid-sync-tag">SINCRONIZADAS</span>
      </div>

      {probes.length === 0 ? (
        <p className="empty-fleet">
          Nenhuma sonda pousada na superfície.
        </p>
      ) : (
        <ul className="probe-list" aria-label="Lista de sondas">
          {probes.map((probe, index) => {
            const isSelected = probe.id === selectedProbeId;
            const shortId = probe.id.slice(0, 6).toLowerCase();
            return (
              <li key={probe.id}>
                <button
                  ref={isSelected ? selectedItemRef : null}
                  type="button"
                  className={`probe-row-btn ${isSelected ? "probe-row-selected" : ""}`.trim()}
                  aria-pressed={isSelected}
                  onClick={() => onSelectProbe(probe.id)}
                >
                  <div className="probe-row-top">
                    <span className="probe-name">
                      <span className="probe-bullet">•</span> Sonda #{index + 1} · {shortId}
                    </span>
                    <span className="probe-coord-badge">
                      ({probe.x}, {probe.y}) {probe.direction}
                    </span>
                  </div>
                  <div className="probe-row-bottom">
                    Limites: {probe.plateau.max_x} × {probe.plateau.max_y} ({probe.plateau.max_x + 1}×{probe.plateau.max_y + 1} casas)
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
