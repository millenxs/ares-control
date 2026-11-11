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

  return (
    <div className="observatory-viewport">
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

      <main className="observatory-stage-grid">
        {/* Asa Esquerda: CONTROLE DE COMANDO */}
        <aside className="wing-column wing-left">
          <CommandDeck
            selectedProbe={mission.selectedProbe}
            isExecuting={mission.isExecuting}
            errorMessage={mission.commandError}
            onExecuteCommands={mission.executeCommands}
          />
          <ProbeList
            probes={mission.probes}
            selectedProbeId={mission.selectedProbeId}
            onSelectProbe={mission.selectProbe}
          />
        </aside>

        {/* Centro: MARTE EM 3D NO ESPAÇO TOTAL COM ÓRBITAS E HUD CARTOGRÁFICO */}
        <div className="center-stage-column">
          <MissionOverview
            selectedProbe={mission.selectedProbe}
            probes={mission.probes}
          />
        </div>

        {/* Asa Direita: LANÇAMENTO DE SONDA */}
        <aside className="wing-column wing-right">
          <LaunchProbeForm
            isSubmitting={mission.isLaunching}
            errorMessage={mission.launchError}
            onLaunch={mission.launchProbe}
          />
        </aside>
      </main>
    </div>
  );
}
