import { type FormEvent, useState } from "react";
import type { Probe } from "../../shared/api/probesApi";

interface CommandDeckProps {
  selectedProbe: Probe | null;
  isExecuting: boolean;
  errorMessage: string | null;
  onExecuteCommands: (probeId: string, commands: string) => Promise<boolean>;
}

export function CommandDeck({
  selectedProbe,
  isExecuting,
  errorMessage,
  onExecuteCommands,
}: CommandDeckProps) {
  const [commands, setCommands] = useState("");

  function appendCommand(symbol: "L" | "R" | "M") {
    setCommands((current) => `${current}${symbol}`);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProbe) {
      return;
    }
    const succeeded = await onExecuteCommands(selectedProbe.id, commands);
    if (succeeded) {
      setCommands("");
    }
  }

  const disabled = !selectedProbe || isExecuting;
  const commandTokens = [...commands];

  const probeX = selectedProbe ? selectedProbe.x : 0;
  const probeY = selectedProbe ? selectedProbe.y : 0;
  const probeDir = selectedProbe ? selectedProbe.direction : "NORTH";
  const maxX = selectedProbe ? selectedProbe.plateau.max_x : 5;
  const maxY = selectedProbe ? selectedProbe.plateau.max_y : 5;

  return (
    <div className="sci-card" aria-label="Comandos da Sonda">
      {/* Top Header estilo Image 1 */}
      <div className="sci-card-header">
        <div className="sci-pill-badge badge-probe-nav">
          <span className="dot-green" />
          <span>PROBE NAV API</span>
          <span className="sep">•</span>
          <span>REST ENDPOINT</span>
        </div>
        <div className="sci-icon-btn" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
      </div>

      <h2 className="sci-card-title">COMANDOS DA SONDA</h2>

      {/* Caixa Preta de Posição em Tempo Real estilo Image 1 */}
      <div className="realtime-pos-box" aria-label="Posição atual em tempo real">
        <div className="pos-box-header">
          <span className="pos-label">POSIÇÃO ATUAL EM TEMPO REAL</span>
          <span className="pos-status-green">STATUS: POUSADO</span>
        </div>
        <div className="pos-coords-display">
          ({probeX}, {probeY}, {probeDir})
        </div>
        <div className="pos-box-footer">
          <span className="bounds-info">
            LIMITES: {maxX}x{maxY} [0..{maxX}, 0..{maxY}]
          </span>
          <span className="sensor-safe">SENSOR DE BORDA: SEGURO</span>
        </div>
      </div>

      {/* Buffer de Instruções estilo Image 1 */}
      <form onSubmit={handleSubmit} noValidate className="buffer-form">
        <div className="buffer-section">
          <div className="buffer-header">
            <span className="buffer-title">BUFFER DE INSTRUÇÕES</span>
            <span className="buffer-sub-legend">
              L: -90° | R: +90° | M: +1 CASA
            </span>
          </div>

          <div className="buffer-input-wrapper">
            <input
              type="text"
              placeholder="Ex.: MMRMMRMRRM"
              value={commands}
              onChange={(e) => setCommands(e.target.value)}
              disabled={disabled}
              className="buffer-input"
              aria-label="Sequência de comandos"
            />
            <span className="ops-counter-pill">
              <span className="sr-only">Fila de instruções ({commandTokens.length})</span>
              {commandTokens.length}_OPS
            </span>
          </div>

          <div className="quick-command-buttons" role="group" aria-label="Inserir comandos rápidos">
            <button
              type="button"
              className="quick-btn"
              disabled={disabled}
              onClick={() => appendCommand("L")}
              aria-label="+ L (Esquerda)"
            >
              [L] ESQ
            </button>
            <button
              type="button"
              className="quick-btn"
              disabled={disabled}
              onClick={() => appendCommand("M")}
              aria-label="+ M (Mover)"
            >
              [M] MOVER
            </button>
            <button
              type="button"
              className="quick-btn"
              disabled={disabled}
              onClick={() => appendCommand("R")}
              aria-label="+ R (Direita)"
            >
              [R] DIR
            </button>
            <button
              type="button"
              className="quick-btn clear-btn"
              disabled={disabled || commands.length === 0}
              onClick={() => setCommands("")}
            >
              Limpar
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {/* Botão Laranja Transmitir Comandos estilo Image 1 */}
        <button
          type="submit"
          className="btn-exec-api"
          disabled={disabled}
          aria-label="Transmitir comandos"
        >
          <span className="pulse-white-dot" />
          <span className="btn-exec-title">
            {isExecuting ? "TRANSMITINDO..." : "TRANSMITIR COMANDOS"}
          </span>
          <span className="btn-exec-arrow">DISPARAR ➤</span>
        </button>
      </form>
    </div>
  );
}
