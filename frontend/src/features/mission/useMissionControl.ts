import { useCallback, useEffect, useState } from "react";
import {
  ApiClientError,
  type LaunchProbeInput,
  type Probe,
  type ProbesApiClient,
} from "../../shared/api/probesApi";
import {
  type PreviewResult,
  simulateNavigationPreview,
} from "./previewNavigation";

export interface CommandHistoryEntry {
  id: string;
  timestamp: string;
  commands: string;
  from: { x: number; y: number; direction: string };
  to: { x: number; y: number; direction: string };
}

function humanizeApiError(error: unknown): string {
  if (error instanceof ApiClientError) {
    const index = error.details.index;
    if (typeof index === "number") {
      return `${error.message} (índice do comando: ${index})`;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Não foi possível concluir a operação na estação central.";
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
  reloadProbes: () => Promise<void>;
  selectProbe: (probeId: string) => void;
  launchProbe: (input: LaunchProbeInput) => Promise<void>;
  executeCommands: (probeId: string, commands: string) => Promise<boolean>;
  setPreviewCommands: (commands: string) => void;
}

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
      // Inicializar trilhas para novas sondas
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
      setInitialError(humanizeApiError(error));
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
      try {
        const created = await apiClient.launchProbe(input);
        setProbes((current) => [...current, created]);
        setSelectedProbeId(created.id);
        setProbeTrails((prev) => ({
          ...prev,
          [created.id]: [{ x: created.x, y: created.y }],
        }));
      } catch (error) {
        setLaunchError(humanizeApiError(error));
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
      try {
        const currentProbe = probes.find((p) => p.id === probeId);
        const fromState = currentProbe
          ? { x: currentProbe.x, y: currentProbe.y, direction: currentProbe.direction }
          : { x: 0, y: 0, direction: "NORTH" };

        const updated = await apiClient.executeCommands(probeId, commands);

        setProbes((current) =>
          current.map((probe) => (probe.id === updated.id ? updated : probe)),
        );

        setProbeTrails((prev) => {
          const existing = prev[probeId] ?? [];
          return {
            ...prev,
            [probeId]: [...existing, { x: updated.x, y: updated.y }],
          };
        });

        setCommandHistory((prev) => [
          {
            id: String(Date.now()),
            timestamp: new Date().toLocaleTimeString("pt-BR"),
            commands,
            from: fromState,
            to: { x: updated.x, y: updated.y, direction: updated.direction },
          },
          ...prev.slice(0, 9),
        ]);

        setPreviewCommands("");
        return true;
      } catch (error) {
        setCommandError(humanizeApiError(error));
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
    reloadProbes,
    selectProbe,
    launchProbe,
    executeCommands,
    setPreviewCommands,
  };
}
