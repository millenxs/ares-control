import { useCallback, useEffect, useState } from "react";
import {
  ApiClientError,
  type LaunchProbeInput,
  type Probe,
  type ProbesApiClient,
} from "../../shared/api/probesApi";

function formatApiError(error: unknown): string {
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
  return "Não foi possível concluir a operação na API.";
}

export interface MissionControlState {
  probes: Probe[];
  selectedProbe: Probe | null;
  selectedProbeId: string | null;
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
}

export function useMissionControl(
  apiClient: ProbesApiClient,
): MissionControlState {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [selectedProbeId, setSelectedProbeId] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);

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
    } catch (error) {
      setInitialError(formatApiError(error));
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
      } catch (error) {
        setLaunchError(formatApiError(error));
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
        const updated = await apiClient.executeCommands(probeId, commands);
        setProbes((current) =>
          current.map((probe) => (probe.id === updated.id ? updated : probe)),
        );
        return true;
      } catch (error) {
        setCommandError(formatApiError(error));
        return false;
      } finally {
        setIsExecuting(false);
      }
    },
    [apiClient],
  );

  const selectProbe = useCallback((probeId: string) => {
    setSelectedProbeId(probeId);
    setCommandError(null);
  }, []);

  const selectedProbe =
    probes.find((probe) => probe.id === selectedProbeId) ?? null;

  return {
    probes,
    selectedProbe,
    selectedProbeId,
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
  };
}
