import { type FormEvent, useState } from "react";
import type { Direction, LaunchProbeInput } from "../../shared/api/probesApi";
import { Button, Panel } from "../../shared/ui/Primitives";

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
    <Panel
      title="Lançar Sonda"
      subtitle="Define os limites máximos (X, Y) da malha da sonda e sua direção inicial em (0, 0)."
    >
      <form className="stack-form" onSubmit={handleSubmit} noValidate>
        <div className="field-row">
          <label className="field">
            <span className="field-label">Limite X máximo</span>
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

          <label className="field">
            <span className="field-label">Limite Y máximo</span>
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

        <label className="field">
          <span className="field-label">Direção inicial</span>
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

        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Lançando sonda..." : "Lançar sonda em (0, 0)"}
        </Button>
      </form>
    </Panel>
  );
}
