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
  const [fallLock, setFallLock] = useState(true);
  const [fixedOrigin, setFixedOrigin] = useState(true);
  const [boundsRule, setBoundsRule] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProbe) {
      setMaxX(String(selectedProbe.plateau.max_x));
      setMaxY(String(selectedProbe.plateau.max_y));
      setDirection(selectedProbe.direction);
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

  const currentX = selectedProbe ? selectedProbe.x : 0;
  const currentY = selectedProbe ? selectedProbe.y : 0;
  const currentFace = selectedProbe ? selectedProbe.direction : direction;

  return (
    <div className="sci-card" aria-label="Telemetria & Matriz">
      {/* Top Header estilo Image 1 */}
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

      {/* Bússola Digital estilo Image 1 */}
      <div className="compass-section">
        <div className="compass-header">
          <span className="compass-label">BÚSSOLA DIGITAL</span>
          <span className="compass-active-tag">DIREÇÃO ATIVA</span>
        </div>

        <div className="compass-tiles-row" role="radiogroup" aria-label="Direção inicial">
          {DIRECTIONS.map((dir) => {
            const isSelected = currentFace === dir.value;
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
            <span className="stat-micro-lbl">ALTITUDE SOLO</span>
            <span className="stat-micro-val">
              0.0 m <span className="green-txt">POUSADO</span>
            </span>
          </div>
          <div className="stat-col text-right">
            <span className="stat-micro-lbl">VETOR TRAÇÃO</span>
            <span className="stat-micro-val">
              {numX + 1}x{numY + 1} <span className="nom-txt">NOMINAL</span>
            </span>
          </div>
        </div>
      </div>

      {/* Matriz de Regras e Segurança estilo Image 1 */}
      <form onSubmit={handleSubmit} noValidate className="matrix-form">
        <div className="rules-section">
          <span className="section-mini-heading">MATRIZ DE REGRAS E SEGURANÇA</span>
          <div className="rules-list">
            <label className="rule-row">
              <span className="rule-info">
                <svg className="rule-icon check-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>TRAVA CONTRA QUEDA</span>
              </span>
              <input
                type="checkbox"
                checked={fallLock}
                onChange={(e) => setFallLock(e.target.checked)}
                className="system-checkbox"
              />
            </label>

            <label className="rule-row">
              <span className="rule-info">
                <svg className="rule-icon pin-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>ORIGEM FIXA (0,0)</span>
              </span>
              <input
                type="checkbox"
                checked={fixedOrigin}
                onChange={(e) => setFixedOrigin(e.target.checked)}
                className="system-checkbox"
              />
            </label>

            <label className="rule-row">
              <span className="rule-info">
                <svg className="rule-icon gear-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
                <span>LIMITE X&lt;={maxX} / Y&lt;={maxY}</span>
              </span>
              <input
                type="checkbox"
                checked={boundsRule}
                onChange={(e) => setBoundsRule(e.target.checked)}
                className="system-checkbox"
              />
            </label>
          </div>
        </div>

        {/* Inputs de Configuração dos Limites da Malha */}
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

        {/* Faixa Preta de Coordenadas em Tempo Real estilo Image 1 */}
        <div className="coord-black-strip" aria-hidden="true">
          <div className="coord-item">
            <span className="coord-k">COORD X</span>
            <span className="coord-v">
              {String(currentX).padStart(2, "0")} / {String(numX).padStart(2, "0")}
            </span>
          </div>
          <div className="coord-item">
            <span className="coord-k">COORD Y</span>
            <span className="coord-v">
              {String(currentY).padStart(2, "0")} / {String(numY).padStart(2, "0")}
            </span>
          </div>
          <div className="coord-item">
            <span className="coord-k">FACE</span>
            <span className="coord-v green-face">{currentFace}</span>
          </div>
        </div>

        {displayedError ? (
          <div className="alert alert-danger" role="alert">
            {displayedError}
          </div>
        ) : null}

        {/* Botão Sincronizar Coordenadas / Lançar estilo Image 1 */}
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
          <span>{isSubmitting ? "Lançando sonda..." : "SINCRONIZAR COORDENADAS"}</span>
        </button>
      </form>
    </div>
  );
}
