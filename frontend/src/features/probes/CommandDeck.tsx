import { type FormEvent, type KeyboardEvent, useState } from "react";
import type { Probe } from "../../shared/api/probesApi";
import type { CommandHistoryEntry } from "../mission/useMissionControl";
import type { PreviewResult } from "../mission/previewNavigation";

interface CommandDeckProps {
  selectedProbe: Probe | null;
  isExecuting: boolean;
  errorMessage: string | null;
  previewResult?: PreviewResult | null;
  commandHistory?: CommandHistoryEntry[];
  onExecuteCommands: (probeId: string, commands: string) => Promise<boolean>;
  onPreviewChange?: (commands: string) => void;
}

export function CommandDeck({
  selectedProbe,
  isExecuting,
  errorMessage,
  previewResult,
  commandHistory = [],
  onExecuteCommands,
  onPreviewChange,
}: CommandDeckProps) {
  const [commands, setCommands] = useState("");
  const [hasInputShake, setHasInputShake] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  function triggerShake() {
    setHasInputShake(true);
    setTimeout(() => setHasInputShake(false), 500);
  }

  function handleInputChange(value: string) {
    const sanitized = value.toUpperCase().replace(/[^LMR]/g, "");
    setCommands(sanitized);
    onPreviewChange?.(sanitized);
  }

  function appendCommand(symbol: "L" | "R" | "M") {
    const next = `${commands}${symbol}`;
    setCommands(next);
    onPreviewChange?.(next);
  }

  function clearCommands() {
    setCommands("");
    onPreviewChange?.("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      clearCommands();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProbe || !commands.trim()) {
      triggerShake();
      return;
    }
    const succeeded = await onExecuteCommands(selectedProbe.id, commands);
    if (succeeded) {
      clearCommands();
    } else {
      triggerShake();
    }
  }

  const disabled = !selectedProbe || isExecuting;
  const isBufferEmpty = commands.trim().length === 0;
  const commandTokens = [...commands];

  const probeX = selectedProbe ? selectedProbe.x : 0;
  const probeY = selectedProbe ? selectedProbe.y : 0;
  const probeDir = selectedProbe ? selectedProbe.direction : "NORTH";
  const maxX = selectedProbe ? selectedProbe.plateau.max_x : 5;
  const maxY = selectedProbe ? selectedProbe.plateau.max_y : 5;

  const displayError = errorMessage;

  return (
    <div className="sci-card" aria-label="Comandos da Sonda">
      {/* Header do Card */}
      <div className="sci-card-header">
        <div className="sci-pill-badge badge-probe-nav">
          <span className="dot-green" />
          <span>PROBE NAV</span>
          <span className="sep">•</span>
          <span>ESTAÇÃO CENTRAL</span>
        </div>
        <div className="sci-icon-btn" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </div>
      </div>

      <h2 className="sci-card-title">COMANDOS DA SONDA</h2>

      {/* Caixa de Posição em Tempo Real (Fonte Principal de Posição) */}
      <div
        className="realtime-pos-box"
        aria-label="Posição atual em tempo real"
        aria-live="polite"
      >
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
          <span className="sensor-safe">SENSOR DE BORDA: ATIVO</span>
        </div>
      </div>

      {/* Buffer de Instruções */}
      <form onSubmit={handleSubmit} noValidate className="buffer-form">
        <div className="buffer-section">
          <div className="buffer-header">
            <span className="buffer-title">BUFFER DE INSTRUÇÕES</span>
          </div>

          <div className={`buffer-input-wrapper ${hasInputShake ? "input-shake" : ""}`}>
            <input
              type="text"
              placeholder="Ex.: MMRMMRMRRM"
              value={commands}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className={`buffer-input ${displayError ? "input-has-error" : ""}`}
              aria-label="Sequência de comandos"
              maxLength={64}
            />
            <span className="ops-counter-pill">
              <span className="sr-only">Fila de instruções ({commandTokens.length})</span>
              {commandTokens.length}_OPS
            </span>
          </div>

          {/* Legenda dos comandos movida para baixo do input como helper text */}
          <div className="buffer-helper-text">
            <span><strong>L:</strong> girar 90° esq</span>
            <span className="sep">•</span>
            <span><strong>R:</strong> girar 90° dir</span>
            <span className="sep">•</span>
            <span><strong>M:</strong> avançar 1 casa</span>
            <span className="sep">•</span>
            <button
              type="button"
              className="quick-example-link"
              onClick={() => handleInputChange("MRM")}
              disabled={disabled}
            >
              Exemplo: MRM
            </button>
          </div>

          {/* Teclas rápidas táteis */}
          <div
            className="quick-command-buttons"
            role="group"
            aria-label="Inserir comandos rápidos"
          >
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
              disabled={disabled || isBufferEmpty}
              onClick={clearCommands}
            >
              Limpar
            </button>
          </div>
        </div>

        {/* Alerta de erro com mensagem humanizada */}
        {displayError ? (
          <div className="alert alert-danger" role="alert">
            <span>{displayError}</span>
          </div>
        ) : null}

        {/* Preview da previsão do percurso (dry-run) */}
        {previewResult && previewResult.isValid && previewResult.steps.length > 0 ? (
          <div className="preview-indicator-box">
            <span className="preview-dot" />
            <span>
              Previsão de destino: ({previewResult.finalPosition.x},{" "}
              {previewResult.finalPosition.y}, {previewResult.finalDirection})
            </span>
          </div>
        ) : null}

        {/* Botão de Transmissão sem textos redundantes da API */}
        <button
          type="submit"
          className="btn-exec-api"
          disabled={disabled || isBufferEmpty}
          aria-label="Transmitir comandos"
        >
          <span className="pulse-white-dot" />
          <span className="btn-exec-title">
            {isExecuting ? "TRANSMITINDO..." : "TRANSMITIR COMANDOS"}
          </span>
          <span className="btn-exec-arrow">➤</span>
        </button>
      </form>

      {/* Histórico de Comandos por Sonda */}
      {commandHistory.length > 0 && (
        <div className="history-accordion">
          <button
            type="button"
            className="history-toggle-btn"
            onClick={() => setShowHistory((v) => !v)}
          >
            <span>Histórico de transmissões ({commandHistory.length})</span>
            <span>{showHistory ? "▲" : "▼"}</span>
          </button>
          {showHistory && (
            <ul className="history-list">
              {commandHistory.map((item) => (
                <li key={item.id} className="history-item">
                  <div className="history-item-top">
                    <span className="history-cmd">{item.commands}</span>
                    <span className="history-time">{item.timestamp}</span>
                  </div>
                  <div className="history-item-coords">
                    ({item.from.x}, {item.from.y}, {item.from.direction}) ➔ (
                    {item.to.x}, {item.to.y}, {item.to.direction})
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
