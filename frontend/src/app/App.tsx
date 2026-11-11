import { MissionOverview } from "../features/mission/MissionOverview";
import { useMissionControl } from "../features/mission/useMissionControl";
import { CommandDeck } from "../features/probes/CommandDeck";
import { LaunchProbeForm } from "../features/probes/LaunchProbeForm";
import { ProbeList } from "../features/probes/ProbeList";
import {
  type ProbesApiClient,
  defaultProbesApiClient,
} from "../shared/api/probesApi";
import { Button } from "../shared/ui/Primitives";

interface AppProps {
  apiClient?: ProbesApiClient;
}

export function App({ apiClient = defaultProbesApiClient }: AppProps) {
  const mission = useMissionControl(apiClient);

  const activeTrail = mission.selectedProbeId
    ? mission.probeTrails[mission.selectedProbeId] ?? []
    : [];

  return (
    <div className="observatory-stage-frame">
      {mission.initialError ? (
        <div className="alert alert-danger global-alert" role="alert">
          <span>{mission.initialError}</span>
          <Button
            variant="secondary"
            onClick={() => void mission.reloadProbes()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : null}

      <main className="observatory-grid-layout">
        <aside className="pod-column pod-left">
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
        </aside>

        <div className="pod-center-column">
          <MissionOverview
            selectedProbe={mission.selectedProbe}
            probes={mission.probes}
            trail={activeTrail}
            previewResult={mission.previewResult}
            onSelectProbe={mission.selectProbe}
            onSelectCell={mission.planRouteToCell}
          />
        </div>

        <aside className="pod-column pod-right">
          <CommandDeck
            selectedProbe={mission.selectedProbe}
            commands={mission.previewCommands}
            isExecuting={mission.isExecuting}
            errorMessage={mission.commandError}
            errorIndex={mission.commandErrorIndex}
            previewResult={mission.previewResult}
            commandHistory={mission.commandHistory}
            onExecuteCommands={mission.executeCommands}
            onCommandsChange={mission.setPreviewCommands}
          />
        </aside>
      </main>
    </div>
  );
}
