import { useCallback, useEffect, useState } from "react";
import { MissionOverview } from "../features/mission/MissionOverview";
import { CommandDeck } from "../features/probes/CommandDeck";
import { LaunchProbeForm } from "../features/probes/LaunchProbeForm";
import { ProbeList } from "../features/probes/ProbeList";
import {
  ApiClientError,
  type LaunchProbeInput,
  type Probe,
  type ProbesApiClient,
  defaultProbesApiClient,
} from "../shared/api/probesApi";
import { Button } from "../shared/ui/Primitives";

interface AppProps {
  apiClient?: ProbesApiClient;
}

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

export function App({ apiClient = defaultProbesApiClient }: AppProps) {
  const [probes, setProbes] = useState<Probe[]>([]);
  const [selectedProbeId, setSelectedProbeId] = useState<string | null>(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);

  const loadProbes = useCallback(async () => {
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
    void loadProbes();
  }, [loadProbes]);

  async function handleLaunchProbe(input: LaunchProbeInput) {
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
  }

  async function handleExecuteCommands(
    probeId: string,
    commands: string,
  ): Promise<boolean> {
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
  }

  function handleSelectProbe(probeId: string) {
    setSelectedProbeId(probeId);
    setCommandError(null);
  }

  const selectedProbe =
    probes.find((probe) => probe.id === selectedProbeId) ?? null;

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="app-eyebrow">ARES CONTROL · DEEP SPACE TELEMETRY</span>
          <h1 className="app-title">Controle de Sondas em Marte</h1>
        </div>
        <Button
          variant="secondary"
          onClick={() => void loadProbes()}
          disabled={isLoadingInitial}
        >
          {isLoadingInitial ? "Sincronizando..." : "Atualizar estado"}
        </Button>
      </header>

      {initialError ? (
        <div className="alert alert-danger" role="alert">
          <span>{initialError}</span>
          <Button variant="secondary" onClick={() => void loadProbes()}>
            Tentar novamente
          </Button>
        </div>
      ) : null}

      <main className="app-layout">
        <div className="sidebar-column">
          <LaunchProbeForm
            isSubmitting={isLaunching}
            errorMessage={launchError}
            onLaunch={handleLaunchProbe}
          />
          <ProbeList
            probes={probes}
            selectedProbeId={selectedProbeId}
            onSelectProbe={handleSelectProbe}
          />
          <CommandDeck
            selectedProbe={selectedProbe}
            isExecuting={isExecuting}
            errorMessage={commandError}
            onExecuteCommands={handleExecuteCommands}
          />
        </div>

        <div className="main-column">
          {isLoadingInitial ? (
            <div className="panel loading-panel" role="status">
              Carregando telemetria das sondas...
            </div>
          ) : (
            <MissionOverview
              selectedProbe={selectedProbe}
              totalProbes={probes.length}
            />
          )}
        </div>
      </main>
    </div>
  );
}
