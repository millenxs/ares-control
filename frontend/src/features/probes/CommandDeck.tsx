import { type FormEvent, type KeyboardEvent, useState } from "react";
import type { Probe } from "../../shared/api/probesApi";
import type { CommandHistoryEntry } from "../mission/useMissionControl";
import type { PreviewResult } from "../mission/previewNavigation";

interface CommandDeckProps {
  selectedProbe: Probe | null;
  commands: string;
  isExecuting: boolean;
  errorMessage: string | null;
  errorIndex?: number | null;
  previewResult?: PreviewResult | null;
  commandHistory?: CommandHistoryEntry[];
  onExecuteCommands: (probeId: string, commands: string) => Promise<boolean>;
  onCommandsChange: (commands: string) => void;
}

export function CommandDeck({
  selectedProbe,
  commands,
  isExecuting,
  errorMessage,
  errorIndex = null,
  previewResult,
  commandHistory = [],
  onExecuteCommands,
  onCommandsChange,
}: CommandDeckProps) {
  const [hasInputShake, setHasInputShake] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  function triggerShake() {
    setHasInputShake(true);
    setTimeout(() => setHasInputShake(false), 500);
  }

  function handleInputChange(value: string) {
    const sanitized = value.toUpperCase().replace(/[^LMR]/g, "");
    onCommandsChange(sanitized);
  }

  function appendCommand(symbol: "L" | "R" | "M") {
    onCommandsChange(`${commands}${symbol}`);
  }

  function clearCommands() {
    onCommandsChange("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      clearCommands();
    }
  }

  const isPreviewInvalid = Boolean(previewResult && !previewResult.isValid);
  const isBufferEmpty = commands.trim().length === 0;
  const disabled = !selectedProbe || isExecuting;
  const isSubmitDisabled = disabled || isBufferEmpty || isPreviewInvalid;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProbe || !commands.trim() || isPreviewInvalid) {
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

  const commandTokens = [...commands];

  const probeX = selectedProbe ? selectedProbe.x : 0;
  const probeY = selectedProbe ? selectedProbe.y : 0;
  const probeDir = selectedProbe ? selectedProbe.direction : "NORTH";
  const maxX = selectedProbe ? selectedProbe.plateau.max_x : 5;
  const maxY = selectedProbe ? selectedProbe.plateau.max_y : 5;
  const hasMoved = probeX > 0 || probeY > 0;
  const shortId = selectedProbe ? selectedProbe.id.slice(0, 6).toLowerCase() : "";

  const displayError = errorMessage;
  const filteredHistory = commandHistory.filter(
    (h) => h.probeId === selectedProbe?.id,
  );

  return (
    <div className="sci-card" aria-label="Comandos da Sonda">
      <div className="sci-card-header">
        <div className="sci-pill-badge badge-probe-nav">
          <span className="dot-green" />
          <span>ALVO: {selectedProbe ? shortId : "NENHUMA"}</span>
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

      <div
        className="realtime-pos-box"
        aria-label="Posição atual em tempo real"
        aria-live="polite"
      >
        <div className="pos-box-header">
          <span className="pos-label">POSIÇÃO ATUAL EM TEMPO REAL</span>
          <span className="pos-status-green">
            {hasMoved ? "STATUS: EM OPERAÇÃO" : "STATUS: POUSADA (ORIGEM)"}
          </span>
        </div>
        <div className="pos-coords-display">
          ({probeX}, {probeY}, {probeDir})
        </div>

        {probeX === 0 && probeDir === "WEST" && (
          <div className="pos-notice-warning" role="note">
            ⚠ Sonda voltada para Oeste em X=0. Avançar (M) bateria na borda. Gire com R (Norte) antes de mover!
          </div>
        )}
        {probeY === 0 && probeDir === "SOUTH" && (
          <div className="pos-notice-warning" role="note">
            ⚠ Sonda voltada para Sul em Y=0. Avançar (M) bateria na borda. Gire com R ou L antes de mover!
          </div>
        )}

        <div className="pos-box-footer">
          <span className="bounds-info">
            Limites: X 0–{maxX} · Y 0–{maxY}
          </span>
          <span className="sensor-safe">BORDA PROTEGIDA</span>
        </div>
      </div>

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
              className={`buffer-input ${displayError || isPreviewInvalid ? "input-has-error" : ""}`}
              aria-label="Sequência de comandos"
              maxLength={64}
            />
            <span className="sr-only">Fila de instruções ({commandTokens.length})</span>
          </div>

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
              onClick={() => {
                if (probeDir === "NORTH") {
                  handleInputChange("MRM");
                } else if (probeDir === "WEST") {
                  handleInputChange("RMRM");
                } else if (probeDir === "SOUTH") {
                  handleInputChange("LLMRM");
                } else {
                  handleInputChange("LMRM");
                }
              }}
              disabled={disabled}
            >
              Exemplo: {probeDir === "NORTH" ? "MRM" : "RMRM"}
            </button>
          </div>

          <div className="token-chips-tray" aria-hidden="true">
            {commandTokens.map((token, idx) => {
              const activeErrorIdx =
                errorIndex !== null
                  ? errorIndex
                  : previewResult && !previewResult.isValid
                    ? previewResult.errorIndex
                    : null;

              const isOffending = activeErrorIdx !== null && activeErrorIdx === idx;
              const isPastOffending = activeErrorIdx !== null && idx > activeErrorIdx;

              return (
                <span
                  key={`${idx}-${token}`}
                  className={`token-chip ${isOffending ? "token-chip-offending" : ""} ${isPastOffending ? "token-chip-dimmed" : ""}`}
                  title={`Passo ${idx}: ${token}`}
                >
                  {token}
                </span>
              );
            })}
          </div>

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

        {displayError ? (
          <div className="alert alert-danger" role="alert">
            <span>{displayError}</span>
          </div>
        ) : null}

        {previewResult && previewResult.isValid && previewResult.steps.length > 0 ? (
          <div className="preview-indicator-box-cyan">
            <span className="preview-dot-cyan" />
            <span>
              Destino previsto: ({previewResult.finalPosition.x},{" "}
              {previewResult.finalPosition.y}, {previewResult.finalDirection})
            </span>
          </div>
        ) : null}

        {previewResult && !previewResult.isValid && previewResult.errorMessage ? (
          <div className="preview-danger-box" role="status">
            <div className="danger-row">
              <span className="danger-icon">⚠</span>
              <span>{previewResult.errorMessage}</span>
            </div>
            {probeX === 0 && probeDir === "WEST" && (
              <div className="danger-fix-row">
                <span>Dica: em X=0 voltada para Oeste (← parede).</span>
                <button
                  type="button"
                  className="btn-fix-suggestion"
                  onClick={() => handleInputChange("RMRM")}
                >
                  Usar rota segura: RMRM ➔
                </button>
              </div>
            )}
            {probeY === 0 && probeDir === "SOUTH" && (
              <div className="danger-fix-row">
                <span>Dica: em Y=0 voltada para Sul (↓ parede).</span>
                <button
                  type="button"
                  className="btn-fix-suggestion"
                  onClick={() => handleInputChange("LMRM")}
                >
                  Usar rota segura: LMRM ➔
                </button>
              </div>
            )}
          </div>
        ) : null}

        <button
          type="submit"
          className="btn-exec-api"
          disabled={isSubmitDisabled}
          aria-label="Transmitir comandos"
        >
          <span className="pulse-white-dot" />
          <span className="btn-exec-title">
            {isExecuting ? "TRANSMITINDO..." : "TRANSMITIR COMANDOS"}
          </span>
          <span className="btn-exec-arrow">➤</span>
        </button>
      </form>

      {filteredHistory.length > 0 && (
        <div className="history-accordion">
          <button
            type="button"
            className="history-toggle-btn"
            onClick={() => setShowHistory((v) => !v)}
          >
            <span>
              Histórico da Sonda {shortId} ({filteredHistory.length})
            </span>
            <span>{showHistory ? "▲" : "▼"}</span>
          </button>
          {showHistory && (
            <ul className="history-list">
              {filteredHistory.map((item) => (
                <li
                  key={item.id}
                  className={`history-item ${item.status === "rejected" ? "history-rejected" : ""}`}
                >
                  <div className="history-item-top">
                    <span className="history-cmd">{item.commands}</span>
                    <span className="history-status-tag">
                      {item.status === "rejected"
                        ? `RECUSADO (HTTP ${item.errorHttpCode ?? 422})`
                        : "CONFIRMADO (HTTP 200)"}
                    </span>
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
