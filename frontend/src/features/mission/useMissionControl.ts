import { useCallback, useEffect, useState } from "react";
import {
  ApiClientError,
  type Direction,
  type LaunchProbeInput,
  type Probe,
  type ProbesApiClient,
} from "../../shared/api/probesApi";
import { formatHumanDomainError } from "./errorFormatter";
import {
  type PreviewResult,
  simulateNavigationPreview,
} from "./previewNavigation";

export interface CommandHistoryEntry {
  id: string;
  probeId: string;
  timestamp: string;
  commands: string;
  from: { x: number; y: number; direction: string };
  to: { x: number; y: number; direction: string };
  status: "success" | "rejected";
  errorHttpCode?: number;
  errorCode?: string;
}

export interface MissionControlState {
  probes: Probe[];
  selectedProbe: Probe | null;
  selectedProbeId: string | null;
  probeTrails: Record<string, Array<{ x: number; y: number }>>;
  commandHistory: CommandHistoryEntry[];
  previewCommands: string;
  previewResult: PreviewResult | null;
  isLoadingInitial: boolean;
  initialError: string | null;
  isLaunching: boolean;
  launchError: string | null;
  isExecuting: boolean;
  commandError: string | null;
  commandErrorIndex: number | null;
  reloadProbes: () => Promise<void>;
  selectProbe: (probeId: string) => void;
  launchProbe: (input: LaunchProbeInput) => Promise<void>;
  executeCommands: (probeId: string, commands: string) => Promise<boolean>;
  setPreviewCommands: (commands: string) => void;
}

/**
 * Hook central de orquestração da missão (módulo profundo): concentra a sincronização
 * com a API REST, a seleção da sonda ativa, a construção do rastro ortogonal após
 * confirmações 200 OK e a preservação atômica do estado quando a API rejeita (422)
 * uma sequência inválida.
 */
export function useMissionControl(
  apiClient: ProbesApiClient,
): MissionControlState {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [selectedProbeId, setSelectedProbeId] = useState<string | null>(null);
  const [probeTrails, setProbeTrails] = useState<Record<string, Array<{ x: number; y: number }>>>({});
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([]);
  const [previewCommands, setPreviewCommands] = useState("");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [commandErrorIndex, setCommandErrorIndex] = useState<number | null>(null);

  const selectedProbe =
    probes.find((probe) => probe.id === selectedProbeId) ?? null;

  const reloadProbes = useCallback(async () => {
    setIsLoadingInitial(true);
    setInitialError(null);
    try {
      const loaded = await apiClient.listProbes();
      setProbes(loaded);
      setSelectedProbeId((currentId) => {
        if (currentId && loaded.some((probe) => probe.id === currentId)) {
          return currentId;
        }
        return loaded[0]?.id ?? null;
      });
        setProbeTrails((prev) => {
          const next = { ...prev };
          for (const p of loaded) {
            if (!next[p.id]) {
              next[p.id] = [{ x: p.x, y: p.y }];
            }
          }
          return next;
        });
    } catch (error) {
      if (error instanceof ApiClientError) {
        setInitialError(formatHumanDomainError(error.code, error.details, null, error.message));
      } else if (error instanceof Error) {
        setInitialError(error.message);
      } else {
        setInitialError("Não foi possível conectar com o centro de controle.");
      }
    } finally {
      setIsLoadingInitial(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void reloadProbes();
  }, [reloadProbes]);

  const launchProbe = useCallback(
    async (input: LaunchProbeInput) => {
      setIsLaunching(true);
      setLaunchError(null);
      setCommandError(null);
      setCommandErrorIndex(null);
      try {
        const created = await apiClient.launchProbe(input);
        setProbes((current) => [...current, created]);
        setSelectedProbeId(created.id);
        setProbeTrails((prev) => ({
          ...prev,
          [created.id]: [{ x: created.x, y: created.y }],
        }));
      } catch (error) {
        if (error instanceof ApiClientError) {
          setLaunchError(formatHumanDomainError(error.code, error.details, null, error.message));
        } else if (error instanceof Error) {
          setLaunchError(error.message);
        } else {
          setLaunchError("Falha ao lançar a sonda.");
        }
      } finally {
        setIsLaunching(false);
      }
    },
    [apiClient],
  );

  const executeCommands = useCallback(
    async (probeId: string, commands: string): Promise<boolean> => {
      setIsExecuting(true);
      setCommandError(null);
      setCommandErrorIndex(null);
      const currentProbe = probes.find((p) => p.id === probeId);
      const fromState = currentProbe
        ? { x: currentProbe.x, y: currentProbe.y, direction: currentProbe.direction }
        : { x: 0, y: 0, direction: "NORTH" };

      try {
        const updated = await apiClient.executeCommands(probeId, commands);

        const pathSimulation = simulateNavigationPreview(
          { x: fromState.x, y: fromState.y },
          fromState.direction as Direction,
          currentProbe ? currentProbe.plateau : updated.plateau,
          commands,
        );
        const intermediateSteps = pathSimulation.steps
          .filter((st) => st.command === "M")
          .map((st) => ({ x: st.x, y: st.y }));

        setProbes((current) =>
          current.map((probe) => (probe.id === updated.id ? updated : probe)),
        );

        setProbeTrails((prev) => {
          const existing = prev[probeId] ?? [{ x: fromState.x, y: fromState.y }];
          return {
            ...prev,
            [probeId]: [
              ...existing,
              ...intermediateSteps,
              { x: updated.x, y: updated.y },
            ],
          };
        });

        setCommandHistory((prev) => [
          {
            id: String(Date.now()),
            probeId,
            timestamp: new Date().toLocaleTimeString("pt-BR"),
            commands,
            from: fromState,
            to: { x: updated.x, y: updated.y, direction: updated.direction },
            status: "success",
          },
          ...prev.slice(0, 19),
        ]);

        setPreviewCommands("");
        return true;
      } catch (error) {
        if (error instanceof ApiClientError) {
          const formatted = formatHumanDomainError(
            error.code,
            error.details,
            fromState,
            error.message,
          );
          setCommandError(formatted);
          const errIndex =
            typeof error.details.index === "number" ? error.details.index : null;
          setCommandErrorIndex(errIndex);

          setCommandHistory((prev) => [
            {
              id: String(Date.now()),
              probeId,
              timestamp: new Date().toLocaleTimeString("pt-BR"),
              commands,
              from: fromState,
              to: fromState,
              status: "rejected",
              errorHttpCode: error.status,
              errorCode: error.code,
            },
            ...prev.slice(0, 19),
          ]);
        } else if (error instanceof Error) {
          setCommandError(error.message);
        } else {
          setCommandError("Falha na comunicação com o servidor.");
        }
        return false;
      } finally {
        setIsExecuting(false);
      }
    },
    [apiClient, probes],
  );

  const selectProbe = useCallback((probeId: string) => {
    setSelectedProbeId(probeId);
    setCommandError(null);
    setCommandErrorIndex(null);
    setPreviewCommands("");
  }, []);

  const previewResult = selectedProbe && previewCommands
    ? simulateNavigationPreview(
        { x: selectedProbe.x, y: selectedProbe.y },
        selectedProbe.direction,
        selectedProbe.plateau,
        previewCommands,
      )
    : null;

  return {
    probes,
    selectedProbe,
    selectedProbeId,
    probeTrails,
    commandHistory,
    previewCommands,
    previewResult,
    isLoadingInitial,
    initialError,
    isLaunching,
    launchError,
    isExecuting,
    commandError,
    commandErrorIndex,
    reloadProbes,
    selectProbe,
    launchProbe,
    executeCommands,
    setPreviewCommands,
  };
}
