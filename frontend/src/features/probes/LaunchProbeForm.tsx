import { type FormEvent, useState } from "react";
import type { Direction, LaunchProbeInput } from "../../shared/api/probesApi";

const DIRECTIONS: readonly { value: Direction; label: string }[] = [
  { value: "NORTH", label: "NORTH (Norte)" },
  { value: "EAST", label: "EAST (Leste)" },
  { value: "SOUTH", label: "SOUTH (Sul)" },
  { value: "WEST", label: "WEST (Oeste)" },
];

interface LaunchProbeFormProps {
  isSubmitting: boolean;
  errorMessage: string | null;
  onLaunch: (input: LaunchProbeInput) => Promise<void>;
}

export function LaunchProbeForm({
  isSubmitting,
  errorMessage,
  onLaunch,
}: LaunchProbeFormProps) {
  const [maxX, setMaxX] = useState("5");
  const [maxY, setMaxY] = useState("5");
  const [direction, setDirection] = useState<Direction>("NORTH");
  const [safetyLock, setSafetyLock] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

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

  return (
    <div className="sci-card" aria-label="Lançamento de Sonda">
      {/* Top Header estilo Image 1 */}
      <div className="sci-card-header">
        <div className="sci-pill-badge badge-amber-payload">
          <span className="dot-teal" />
          <span>PAYLOAD</span>
          <span className="sep">•</span>
          <span>PRONTO</span>
        </div>
        <div className="sci-icon-btn" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
          </svg>
        </div>
      </div>

      <h2 className="sci-card-title">LANÇAMENTO DE SONDA</h2>

      {/* Visor de Telemetria de Carga e Propulsão estilo Image 1 */}
      <div className="telemetry-box" aria-hidden="true">
        <div className="telemetry-box-header">
          <span>ARES EXPLORER V</span>
          <span className="green-val">100% OK</span>
        </div>
        <div className="telemetry-progress-line">
          <div className="progress-label-row">
            <span>CARGA RTG</span>
            <span className="bold-val">98.4%</span>
          </div>
          <div className="progress-track">
            <div className="progress-bar-fill progress-blue" style={{ width: "98.4%" }} />
          </div>
        </div>

        <div className="status-duo-grid">
          <div className="status-chip">
            <span className="chip-label">DESACOPLAMENTO</span>
            <span className="chip-value-green">ARMADO</span>
          </div>
          <div className="status-chip">
            <span className="chip-label">RETROFOGUETES</span>
            <span className="chip-value-green">PRESSURIZ.</span>
          </div>
        </div>
      </div>

      {/* Janela de Ejeção e Delta-V estilo Image 1 */}
      <div className="ejection-window-box" aria-hidden="true">
        <div className="ejection-stat">
          <span className="ejection-label">JANELA DE EJEÇÃO</span>
          <span className="ejection-timer">00:04:35</span>
        </div>
        <div className="ejection-stat text-right">
          <span className="ejection-label">DELTA-V</span>
          <span className="delta-val">1.420 <small>m/s</small></span>
        </div>
      </div>

      {/* Trava de Segurança Toggle estilo Image 1 */}
      <div className="safety-lock-bar">
        <div className="lock-label-group">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>TRAVA DE SEGURANÇA</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={safetyLock}
          onClick={() => setSafetyLock((v) => !v)}
          className={`toggle-switch ${safetyLock ? "toggle-on" : "toggle-off"}`}
        >
          <span className="toggle-thumb" />
        </button>
      </div>

      {/* Formulário Operacional de Lançamento */}
      <form className="launch-operational-form" onSubmit={handleSubmit} noValidate>
        <div className="field-row">
          <label className="field-mini">
            <span className="field-mini-label">Limite X máximo</span>
            <input
              type="number"
              min={0}
              step={1}
              value={maxX}
              onChange={(event) => setMaxX(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </label>

          <label className="field-mini">
            <span className="field-mini-label">Limite Y máximo</span>
            <input
              type="number"
              min={0}
              step={1}
              value={maxY}
              onChange={(event) => setMaxY(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </label>
        </div>

        <label className="field-mini">
          <span className="field-mini-label">Direção inicial</span>
          <select
            value={direction}
            onChange={(event) => setDirection(event.target.value as Direction)}
            disabled={isSubmitting}
          >
            {DIRECTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {displayedError ? (
          <div className="alert alert-danger" role="alert">
            {displayedError}
          </div>
        ) : null}

        {/* Botão de Lançamento estilo botão claro com ícone de foguete */}
        <button
          type="submit"
          className="btn-launch-rocket"
          disabled={isSubmitting}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          </svg>
          <span>{isSubmitting ? "LANÇANDO..." : "Lançar sonda em (0, 0)"}</span>
        </button>
      </form>
    </div>
  );
}
