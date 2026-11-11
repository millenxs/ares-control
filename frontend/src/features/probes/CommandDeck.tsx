import { type FormEvent, useState } from "react";
import type { Probe } from "../../shared/api/probesApi";
import { Badge, Button, Panel } from "../../shared/ui/Primitives";

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

  return (
    <Panel
      title="Controle de Comando"
      subtitle="Instruções de navegação em tempo real transmitidas via uplink orbital."
      badge={
        selectedProbe ? (
          <Badge tone="dark">MOD-01 • ATIVO</Badge>
        ) : (
          <Badge tone="neutral">STANDBY</Badge>
        )
      }
    >
      <div className="card-instrument-box" aria-hidden="true">
        <div className="instrument-readout-row">
          <div className="readout-item">
            <span className="readout-label">VELOCIDADE</span>
            <span className="readout-value">24.150 <small>km/h</small></span>
          </div>
          <div className="readout-item text-right">
            <span className="readout-label">ALINHAMENTO</span>
            <span className="readout-value">99.8% <small>NOM</small></span>
          </div>
        </div>
        <div className="instrument-progress-bar">
          <div className="instrument-progress-fill" style={{ width: "84%" }} />
        </div>
      </div>

      <form className="stack-form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="field-label">Sequência de comandos (M, L, R)</span>
          <input
            type="text"
            placeholder="Ex.: MRM"
            value={commands}
            onChange={(event) => setCommands(event.target.value)}
            disabled={disabled}
            aria-label="Sequência de comandos"
          />
        </label>

        <div
          className="quick-commands"
          role="group"
          aria-label="Inserir comandos rápidos"
        >
          <Button
            variant="secondary"
            className="btn-tile"
            disabled={disabled}
            onClick={() => appendCommand("L")}
          >
            + L (Esquerda)
          </Button>
          <Button
            variant="secondary"
            className="btn-tile"
            disabled={disabled}
            onClick={() => appendCommand("M")}
          >
            + M (Mover)
          </Button>
          <Button
            variant="secondary"
            className="btn-tile"
            disabled={disabled}
            onClick={() => appendCommand("R")}
          >
            + R (Direita)
          </Button>
          <Button
            variant="ghost"
            disabled={disabled || commands.length === 0}
            onClick={() => setCommands("")}
          >
            Limpar
          </Button>
        </div>

        <div className="token-strip" aria-live="polite">
          <span className="token-strip-label">
            Fila de instruções ({commandTokens.length})
          </span>
          {commandTokens.length === 0 ? (
            <span className="token-strip-empty">
              Use as teclas acima ou digite a sequência.
            </span>
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

        <Button
          type="submit"
          variant="primary"
          className="btn-transmit"
          disabled={disabled}
        >
          {isExecuting ? "Transmitindo..." : "Transmitir comandos"}
        </Button>
      </form>
    </Panel>
  );
}
