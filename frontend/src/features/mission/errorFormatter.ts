export function toOrdinal(n: number): string {
  return `${n + 1}º`;
}

export function formatHumanDomainError(
  code: string,
  details: Record<string, unknown>,
  currentProbe: { x: number; y: number; direction: string } | null,
  fallbackMessage?: string,
): string {
  const curPosText = currentProbe
    ? `Nenhum comando foi executado. A sonda permanece em (${currentProbe.x}, ${currentProbe.y}, ${currentProbe.direction}).`
    : "Nenhum comando foi executado. A sonda permanece em sua posição original.";

  const rawIndex = typeof details.index === "number" ? details.index : null;
  const ordinal = rawIndex !== null ? toOrdinal(rawIndex) : "desconhecido";
  const indexSuffix = rawIndex !== null ? ` (índice do comando: ${rawIndex})` : "";

  if (code === "out_of_bounds") {
    const x = details.x;
    const y = details.y;
    const maxX = details.max_x;
    const maxY = details.max_y;
    if (typeof x === "number" && typeof y === "number" && typeof maxX === "number" && typeof maxY === "number") {
      return `Falha de navegação: o ${ordinal} comando levaria a sonda a (${x}, ${y}), fora dos limites do platô [0..${maxX}, 0..${maxY}]. ${indexSuffix} ${curPosText}`;
    }
    if (fallbackMessage) {
      const baseMsg = fallbackMessage.includes("índice do comando")
        ? fallbackMessage
        : `${fallbackMessage}${indexSuffix}`;
      return `${baseMsg} ${curPosText}`;
    }
  }

  if (code === "invalid_command") {
    const cmd = details.command;
    if (cmd) {
      return `Falha de comando: o ${ordinal} comando ('${cmd}') é inválido. Apenas 'M', 'L' e 'R' são aceitos. ${indexSuffix} ${curPosText}`;
    }
    if (fallbackMessage) {
      const baseMsg = fallbackMessage.includes("índice do comando")
        ? fallbackMessage
        : `${fallbackMessage}${indexSuffix}`;
      return `${baseMsg} ${curPosText}`;
    }
  }

  if (code === "probe_not_found") {
    return `Sonda não localizada no sistema da missão. Identificador: ${details.id ?? "desconhecido"}.`;
  }

  if (fallbackMessage) {
    const baseMsg = fallbackMessage.includes("índice do comando")
      ? fallbackMessage
      : `${fallbackMessage}${indexSuffix}`;
    return `${baseMsg} ${curPosText}`;
  }

  return `Operação rejeitada pelo sistema central. ${curPosText}`;
}
