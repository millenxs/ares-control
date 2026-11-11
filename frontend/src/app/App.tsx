import { MissionOverview } from "../features/mission/MissionOverview";
import { useMissionControl } from "../features/mission/useMissionControl";
import { CommandDeck } from "../features/probes/CommandDeck";
import { LaunchProbeForm } from "../features/probes/LaunchProbeForm";
import { ProbeList } from "../features/probes/ProbeList";
import {
  type ProbesApiClient,
  defaultProbesApiClient,
} from "../shared/api/probesApi";
import { Badge, Button } from "../shared/ui/Primitives";

interface AppProps {
  apiClient?: ProbesApiClient;
}

export function App({ apiClient = defaultProbesApiClient }: AppProps) {
  const mission = useMissionControl(apiClient);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-title-row">
            <h1 className="app-title">Ares Control</h1>
            <Badge tone="amber">Missão Marte</Badge>
          </div>
          <p className="app-subtitle">
            Console cartográfico de lançamento, comando e telemetria de sondas
            em superfície.
          </p>
        </div>

        <div className="header-actions">
          <Badge tone="teal">{mission.probes.length} sonda(s) na malha</Badge>
          <Button
            variant="secondary"
            onClick={() => void mission.reloadProbes()}
            disabled={mission.isLoadingInitial}
          >
            {mission.isLoadingInitial
              ? "Sincronizando..."
              : "Sincronizar estado"}
          </Button>
        </div>
      </header>

      {mission.initialError ? (
        <div className="alert alert-danger" role="alert">
          <span>{mission.initialError}</span>
          <Button
            variant="secondary"
            onClick={() => void mission.reloadProbes()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      <main className="app-layout">
        <div className="sidebar-column">
          <LaunchProbeForm
            isSubmitting={mission.isLaunching}
            errorMessage={mission.launchError}
            onLaunch={mission.launchProbe}
          />
          <ProbeList
            probes={mission.probes}
            selectedProbeId={mission.selectedProbeId}
            onSelectProbe={mission.selectProbe}
          />
          <CommandDeck
            selectedProbe={mission.selectedProbe}
            isExecuting={mission.isExecuting}
            errorMessage={mission.commandError}
            onExecuteCommands={mission.executeCommands}
          />
        </div>

        <div className="main-column">
          {mission.isLoadingInitial ? (
            <div className="panel loading-panel" role="status">
              Sincronizando telemetria das sondas com a estação orbital...
            </div>
          ) : (
            <MissionOverview
              selectedProbe={mission.selectedProbe}
              probes={mission.probes}
            />
          )}
        </div>
      </main>
    </div>
  );
}
