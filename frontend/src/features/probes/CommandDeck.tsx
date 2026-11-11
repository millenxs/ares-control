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

  return (
    <Panel
      title="Console de Comandos"
      subtitle="Comandos aceitos: L (girar à esquerda), R (girar à direita) e M (avançar 1 posição)."
      badge={
        selectedProbe ? (
          <Badge tone="amber">ID {selectedProbe.id.slice(0, 8)}</Badge>
        ) : (
          <Badge tone="neutral">Sem seleção</Badge>
        )
      }
    >
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

        <div className="quick-commands" role="group" aria-label="Inserir comandos rápidos">
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => appendCommand("L")}
          >
            + L (Esquerda)
          </Button>
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => appendCommand("M")}
          >
            + M (Mover)
          </Button>
          <Button
            variant="secondary"
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

        {errorMessage ? (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <Button type="submit" variant="primary" disabled={disabled}>
          {isExecuting ? "Transmitindo..." : "Transmitir comandos"}
        </Button>
      </form>
    </Panel>
  );
}
