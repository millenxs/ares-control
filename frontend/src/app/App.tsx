import { MissionOverview } from "../features/mission/MissionOverview";
import { useMissionControl } from "../features/mission/useMissionControl";
import { CommandDeck } from "../features/probes/CommandDeck";
import { LaunchProbeForm } from "../features/probes/LaunchProbeForm";
import { ProbeList } from "../features/probes/ProbeList";
import {
  type ProbesApiClient,
  defaultProbesApiClient,
} from "../shared/api/probesApi";
import { Badge, Button, Panel } from "../shared/ui/Primitives";

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
            <Badge tone="mars">Marte · Órbita</Badge>
          </div>
          <p className="app-subtitle">
            Observatório cartográfico e uplink de comando para sondas na
            superfície de Marte.
          </p>
        </div>

        <div className="header-actions">
          <Badge tone="dark">{mission.probes.length} sonda(s) ativas</Badge>
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

      <main className="app-board-layout">
        {/* Asa Esquerda: Controle de Comando e Frota */}
        <aside className="wing-column">
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

        {/* Palco Central: Observatório Cartográfico e Globo 3D de Marte em Espaço Puro */}
        <div className="center-stage-column">
          {mission.isLoadingInitial ? (
            <div className="loading-banner" role="status">
              Sincronizando telemetria com o satélite orbital de Marte...
            </div>
          ) : (
            <MissionOverview
              selectedProbe={mission.selectedProbe}
              probes={mission.probes}
            />
          )}
        </div>

        {/* Asa Direita: Lançamento de Sonda e Protocolo */}
        <aside className="wing-column">
          <LaunchProbeForm
            isSubmitting={mission.isLaunching}
            errorMessage={mission.launchError}
            onLaunch={mission.launchProbe}
          />

          <Panel
            title="Protocolo de Missão"
            subtitle="Parâmetros cinemáticos da missão espacial a Marte."
          >
            <dl className="protocol-list">
              <div className="protocol-row">
                <dt>Pouso inicial</dt>
                <dd>Sempre em (0, 0)</dd>
              </div>
              <div className="protocol-row">
                <dt>Giro L / R</dt>
                <dd>90° sem mudar de célula</dd>
              </div>
              <div className="protocol-row">
                <dt>Avanço M</dt>
                <dd>1 passo na direção atual</dd>
              </div>
              <div className="protocol-row">
                <dt>Segurança</dt>
                <dd>Comando fora rejeita sequência</dd>
              </div>
            </dl>
          </Panel>
        </aside>
      </main>
    </div>
  );
}
