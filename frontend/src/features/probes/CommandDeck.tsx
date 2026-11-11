import { type FormEvent, useState } from "react";
import type { Probe } from "../../shared/api/probesApi";
import { Button } from "../../shared/ui/Primitives";

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
  const [rcsChecked, setRcsChecked] = useState(true);
  const [shieldChecked, setShieldChecked] = useState(true);
  const [solarChecked, setSolarChecked] = useState(true);

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

  return (
    <div className="sci-card" aria-label="Controle de Comando">
      {/* Top Header estilo Image 1 */}
      <div className="sci-card-header">
        <div className="sci-pill-badge badge-dark-mod">
          <span className="dot-active" />
          <span>{selectedProbe ? `MOD-${selectedProbe.id.slice(0, 2).toUpperCase()}` : "MOD-01"}</span>
          <span className="sep">•</span>
          <span>{selectedProbe ? "ATIVO" : "STANDBY"}</span>
        </div>
        <div className="sci-icon-btn" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        </div>
      </div>

      <h2 className="sci-card-title">CONTROLE DE COMANDO</h2>

      {/* Visor de Telemetria de Voo Orbital */}
      <div className="telemetry-box" aria-hidden="true">
        <div className="telemetry-box-header">
          <span>VOO ORBITAL</span>
          <span className="alt-tag">420.2 km ALT</span>
        </div>
        <div className="telemetry-split-stats">
          <div className="stat-unit">
            <span className="stat-label">VELOCIDADE</span>
            <div className="stat-num-row">
              <span className="stat-val">24.150</span>
              <span className="stat-dim">km/h</span>
            </div>
          </div>
          <div className="stat-unit text-right">
            <span className="stat-label">ALINHAMENTO</span>
            <div className="stat-num-row">
              <span className="stat-val">99.8%</span>
              <span className="stat-dim green">NOM</span>
            </div>
          </div>
        </div>

        <div className="telemetry-progress-line">
          <div className="progress-label-row">
            <span>EMPUXO IÔNICO</span>
            <span className="green-val">84%</span>
          </div>
          <div className="progress-track">
            <div className="progress-bar-fill" style={{ width: "84%" }} />
          </div>
        </div>
      </div>

      {/* Sistemas Ativos (Checkboxes como na imagem) */}
      <div className="systems-section">
        <span className="section-mini-heading">SISTEMAS ATIVOS</span>
        <div className="systems-list">
          <label className="system-row">
            <span className="system-info">
              <svg className="sys-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>GIROSCÓPIOS RCS</span>
            </span>
            <input
              type="checkbox"
              checked={rcsChecked}
              onChange={(e) => setRcsChecked(e.target.checked)}
              className="system-checkbox"
            />
          </label>
          <label className="system-row">
            <span className="system-info">
              <svg className="sys-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>ESCUDO TÉRMICO</span>
            </span>
            <input
              type="checkbox"
              checked={shieldChecked}
              onChange={(e) => setShieldChecked(e.target.checked)}
              className="system-checkbox"
            />
          </label>
          <label className="system-row">
            <span className="system-info">
              <svg className="sys-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
              </svg>
              <span>PAINÉIS SOLARES</span>
            </span>
            <input
              type="checkbox"
              checked={solarChecked}
              onChange={(e) => setSolarChecked(e.target.checked)}
              className="system-checkbox"
            />
          </label>
        </div>
      </div>

      {/* Faixa Preta de Sensores da Superfície (Estilo Imagem) */}
      <div className="surface-stats-strip" aria-hidden="true">
        <div className="surface-item">
          <span className="surf-key">SUPERFÍCIE</span>
          <span className="surf-val">-63°C</span>
        </div>
        <div className="surface-item">
          <span className="surf-key">PRESSÃO</span>
          <span className="surf-val">108 kPa</span>
        </div>
        <div className="surface-item">
          <span className="surf-key">RADAR</span>
          <span className="surf-val radar-active">VAR 120°</span>
        </div>
      </div>

      {/* Formulário Operacional de Movimentação da Sonda */}
      <form className="command-operational-form" onSubmit={handleSubmit} noValidate>
        <label className="field-mini">
          <span className="field-mini-label">Sequência de comandos (M, L, R)</span>
          <input
            type="text"
            placeholder="Ex.: MRM"
            value={commands}
            onChange={(event) => setCommands(event.target.value)}
            disabled={disabled}
            aria-label="Sequência de comandos"
          />
        </label>

        <div className="quick-command-tiles" role="group" aria-label="Inserir comandos rápidos">
          <Button
            variant="secondary"
            className="tile-btn"
            disabled={disabled}
            onClick={() => appendCommand("L")}
          >
            + L (Esquerda)
          </Button>
          <Button
            variant="secondary"
            className="tile-btn"
            disabled={disabled}
            onClick={() => appendCommand("M")}
          >
            + M (Mover)
          </Button>
          <Button
            variant="secondary"
            className="tile-btn"
            disabled={disabled}
            onClick={() => appendCommand("R")}
          >
            + R (Direita)
          </Button>
          <Button
            variant="ghost"
            className="tile-clear"
            disabled={disabled || commands.length === 0}
            onClick={() => setCommands("")}
          >
            Limpar
          </Button>
        </div>

        <div className="token-strip" aria-live="polite">
          <span className="token-strip-label">Fila de instruções ({commandTokens.length})</span>
          {commandTokens.length === 0 ? (
            <span className="token-strip-empty">Use as teclas acima ou digite a sequência.</span>
          ) : (
            <div className="token-chip-list">
              {commandTokens.map((token, idx) => (
                <span key={`${idx}-${token}`} className="token-chip">
                  {token}
                </span>
              ))}
            </div>
          )}
        </div>

        {errorMessage ? (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        ) : null}

        {/* Botão de Transmissão estilo botão escuro SINCRONIZAR VETOR */}
        <button
          type="submit"
          className="btn-vector-sync"
          disabled={disabled}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          <span>{isExecuting ? "Transmitindo..." : "Transmitir comandos"}</span>
        </button>
      </form>
    </div>
  );
}
