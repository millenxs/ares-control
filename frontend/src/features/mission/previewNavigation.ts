/**
 * Simulação local somente para feedback visual (dry-run do caminho previsto e
 * reconstrução ortogonal dos pontos intermediários do rastro).
 *
 * A fonte de verdade para persistência continua sendo exclusivamente a API Python.
 */
import type { Direction, Plateau } from "../../shared/api/probesApi";

export interface Position {
  x: number;
  y: number;
}

export interface NavigationStep {
  x: number;
  y: number;
  direction: Direction;
  command: "M" | "L" | "R";
  index: number;
}

export interface FailedStep {
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  direction: Direction;
  command: "M" | "L" | "R";
  index: number;
}

export interface PreviewResult {
  steps: NavigationStep[];
  finalPosition: Position;
  finalDirection: Direction;
  isValid: boolean;
  errorIndex: number | null;
  errorMessage: string | null;
  failedStep: FailedStep | null;
}

const ROTATION_LEFT: Record<Direction, Direction> = {
  NORTH: "WEST",
  WEST: "SOUTH",
  SOUTH: "EAST",
  EAST: "NORTH",
};

const ROTATION_RIGHT: Record<Direction, Direction> = {
  NORTH: "EAST",
  EAST: "SOUTH",
  SOUTH: "WEST",
  WEST: "NORTH",
};

const DIRECTION_DELTAS: Record<Direction, [number, number]> = {
  NORTH: [0, 1],
  EAST: [1, 0],
  SOUTH: [0, -1],
  WEST: [-1, 0],
};

const CARDINAL_ORDER: readonly Direction[] = ["NORTH", "EAST", "SOUTH", "WEST"];

function buildTurnSequence(from: Direction, to: Direction): string {
  const diff = (CARDINAL_ORDER.indexOf(to) - CARDINAL_ORDER.indexOf(from) + 4) % 4;
  if (diff === 0) return "";
  if (diff === 1) return "R";
  if (diff === 3) return "L";
  return "RR";
}

/**
 * Gera a menor sequência de comandos (`L`, `R`, `M`) para levar a sonda de
 * `startPos`/`startDir` até a célula clicada `targetPos`, preenchendo o buffer
 * de instruções sem enviar requisição automática para a API.
 */
export function buildCommandsToTarget(
  startPos: Position,
  startDir: Direction,
  targetPos: Position,
): string {
  const dx = targetPos.x - startPos.x;
  const dy = targetPos.y - startPos.y;
  if (dx === 0 && dy === 0) {
    return "";
  }

  const horizontalDir: Direction | null =
    dx > 0 ? "EAST" : dx < 0 ? "WEST" : null;
  const verticalDir: Direction | null =
    dy > 0 ? "NORTH" : dy < 0 ? "SOUTH" : null;

  const moveHorizontalFirst =
    horizontalDir !== null &&
    (verticalDir === null || startDir === horizontalDir);

  const legs: Array<{ dir: Direction; steps: number }> = [];
  if (moveHorizontalFirst) {
    if (horizontalDir) legs.push({ dir: horizontalDir, steps: Math.abs(dx) });
    if (verticalDir) legs.push({ dir: verticalDir, steps: Math.abs(dy) });
  } else {
    if (verticalDir) legs.push({ dir: verticalDir, steps: Math.abs(dy) });
    if (horizontalDir) legs.push({ dir: horizontalDir, steps: Math.abs(dx) });
  }

  let currentDir = startDir;
  let sequence = "";
  for (const leg of legs) {
    sequence += buildTurnSequence(currentDir, leg.dir) + "M".repeat(leg.steps);
    currentDir = leg.dir;
  }
  return sequence;
}

export function simulateNavigationPreview(
  startPos: Position,
  startDir: Direction,
  plateau: Plateau,
  commands: string,
): PreviewResult {
  let x = startPos.x;
  let y = startPos.y;
  let dir = startDir;
  const steps: NavigationStep[] = [];

  const cleanCommands = commands.toUpperCase().trim();
  if (!cleanCommands) {
    return {
      steps: [],
      finalPosition: startPos,
      finalDirection: startDir,
      isValid: true,
      errorIndex: null,
      errorMessage: null,
      failedStep: null,
    };
  }

  for (let i = 0; i < cleanCommands.length; i++) {
    const char = cleanCommands[i];
    if (char === "L") {
      dir = ROTATION_LEFT[dir];
      steps.push({ x, y, direction: dir, command: "L", index: i });
    } else if (char === "R") {
      dir = ROTATION_RIGHT[dir];
      steps.push({ x, y, direction: dir, command: "R", index: i });
    } else if (char === "M") {
      const [dx, dy] = DIRECTION_DELTAS[dir];
      const nextX = x + dx;
      const nextY = y + dy;

      if (nextX < 0 || nextX > plateau.max_x || nextY < 0 || nextY > plateau.max_y) {
        return {
          steps,
          finalPosition: { x, y },
          finalDirection: dir,
          isValid: false,
          errorIndex: i,
          errorMessage: `O comando '${char}' no índice ${i} levaria a sonda a (${nextX}, ${nextY}), fora da malha [0..${plateau.max_x}, 0..${plateau.max_y}].`,
          failedStep: {
            fromX: x,
            fromY: y,
            targetX: nextX,
            targetY: nextY,
            direction: dir,
            command: "M",
            index: i,
          },
        };
      }

      x = nextX;
      y = nextY;
      steps.push({ x, y, direction: dir, command: "M", index: i });
    } else {
      return {
        steps,
        finalPosition: { x, y },
        finalDirection: dir,
        isValid: false,
        errorIndex: i,
        errorMessage: `Caractere inválido '${char}' no índice ${i}. Comandos aceitos: M, L, R.`,
        failedStep: null,
      };
    }
  }

  return {
    steps,
    finalPosition: { x, y },
    finalDirection: dir,
    isValid: true,
    errorIndex: null,
    errorMessage: null,
    failedStep: null,
  };
}
