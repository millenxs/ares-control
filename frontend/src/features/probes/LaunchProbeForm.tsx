import { type FormEvent, useEffect, useState } from "react";
import type { Direction, LaunchProbeInput, Probe } from "../../shared/api/probesApi";

const DIRECTIONS: readonly { value: Direction; key: string; label: string }[] = [
  { value: "NORTH", key: "N", label: "NORTH" },
  { value: "EAST", key: "E", label: "EAST" },
  { value: "SOUTH", key: "S", label: "SOUTH" },
  { value: "WEST", key: "W", label: "WEST" },
];

interface LaunchProbeFormProps {
  selectedProbe: Probe | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onLaunch: (input: LaunchProbeInput) => Promise<void>;
}

export function LaunchProbeForm({
  selectedProbe,
  isSubmitting,
  errorMessage,
  onLaunch,
}: LaunchProbeFormProps) {
  const [maxX, setMaxX] = useState("5");
  const [maxY, setMaxY] = useState("5");
  const [direction, setDirection] = useState<Direction>("NORTH");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProbe) {
      setMaxX(String(selectedProbe.plateau.max_x));
      setMaxY(String(selectedProbe.plateau.max_y));
    }
  }, [selectedProbe]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedX = Number(maxX);
    const parsedY = Number(maxY);

    if (
      maxX.trim() === "" ||
      maxY.trim() === "" ||
      !Number.isInteger(parsedX) ||
      !Number.isInteger(parsedY) ||
      parsedX < 0 ||
      parsedY < 0
    ) {
      setValidationError(
        "Informe limites inteiros não negativos para X máximo e Y máximo.",
      );
      return;
    }

    setValidationError(null);
    await onLaunch({ x: parsedX, y: parsedY, direction });
  }

  const displayedError = validationError ?? errorMessage;
  const numX = Number(maxX) || 0;
  const numY = Number(maxY) || 0;

  return (
    <div className="sci-card" aria-label="Telemetria & Matriz">
      <div className="sci-card-header">
        <div className="sci-pill-badge badge-dark-mod">
          <span className="dot-green" />
          <span>SONDA // ROVER</span>
          <span className="sep">•</span>
          <span>POUSO EM (0,0)</span>
        </div>
        <div className="sci-icon-btn" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        </div>
      </div>

      <h2 className="sci-card-title">TELEMETRIA & MATRIZ</h2>

      <div className="compass-section">
        <div className="compass-header">
          <span className="compass-label">BÚSSOLA DIGITAL</span>
          <span className="compass-active-tag">POUSO: {direction}</span>
        </div>

        <div className="compass-tiles-row" role="radiogroup" aria-label="Direção inicial">
          {DIRECTIONS.map((dir) => {
            const isSelected = direction === dir.value;
            return (
              <button
                key={dir.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`compass-tile ${isSelected ? "tile-selected" : ""}`}
                onClick={() => setDirection(dir.value)}
              >
                <span className="tile-letter">{dir.key}</span>
                <span className="tile-sub">{dir.label}</span>
              </button>
            );
          })}
        </div>

        <div className="compass-stats-row">
          <div className="stat-col">
            <span className="stat-micro-lbl">ORIGEM DE POUSO</span>
            <span className="stat-micro-val">(0, 0)</span>
          </div>
          <div className="stat-col text-right">
            <span className="stat-micro-lbl">LIMITES CONFIGURADOS</span>
            <span className="stat-micro-val">
              X 0–{numX} · Y 0–{numY}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="matrix-form">
        <div className="field-row">
          <label className="field-mini">
            <span className="field-mini-label">LIMITE X MÁXIMO</span>
            <input
              type="number"
              min={0}
              step={1}
              value={maxX}
              onChange={(e) => setMaxX(e.target.value)}
              disabled={isSubmitting}
              aria-label="Limite X máximo"
              required
            />
          </label>
          <label className="field-mini">
            <span className="field-mini-label">LIMITE Y MÁXIMO</span>
            <input
              type="number"
              min={0}
              step={1}
              value={maxY}
              onChange={(e) => setMaxY(e.target.value)}
              disabled={isSubmitting}
              aria-label="Limite Y máximo"
              required
            />
          </label>
        </div>

        <div className="coord-black-strip" aria-hidden="true">
          <div className="coord-item">
            <span className="coord-k">LANÇAMENTO X</span>
            <span className="coord-v">00 / {String(numX).padStart(2, "0")}</span>
          </div>
          <div className="coord-item">
            <span className="coord-k">LANÇAMENTO Y</span>
            <span className="coord-v">00 / {String(numY).padStart(2, "0")}</span>
          </div>
          <div className="coord-item">
            <span className="coord-k">DIREÇÃO</span>
            <span className="coord-v green-face">{direction}</span>
          </div>
        </div>

        {displayedError ? (
          <div className="alert alert-danger" role="alert">
            {displayedError}
          </div>
        ) : null}

        <button
          type="submit"
          className="btn-sync-coords"
          disabled={isSubmitting}
          aria-label="Lançar sonda em (0, 0)"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>{isSubmitting ? "Lançando sonda..." : `LANÇAR SONDA EM (0, 0) · ${numX}×${numY}`}</span>
        </button>
      </form>
    </div>
  );
}
