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
            Central de comando e cartografia espacial para controle de sondas na
            superfície de Marte.
          </p>
        </div>

        <div className="header-actions">
          <Badge tone="neutral">{mission.probes.length} sonda(s) ativas</Badge>
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
        <aside className="wing-column">
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

        <div className="center-stage-column">
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

        <aside className="wing-column">
          <CommandDeck
            selectedProbe={mission.selectedProbe}
            isExecuting={mission.isExecuting}
            errorMessage={mission.commandError}
            onExecuteCommands={mission.executeCommands}
          />

          <Panel
            title="Protocolo de Navegação"
            subtitle="Regras físicas de exploração da superfície marciana."
          >
            <dl className="protocol-list">
              <div className="protocol-row">
                <dt>Pouso inicial</dt>
                <dd>Sempre na coordenada (0, 0)</dd>
              </div>
              <div className="protocol-row">
                <dt>Rotação L / R</dt>
                <dd>Gira 90° sem sair da célula</dd>
              </div>
              <div className="protocol-row">
                <dt>Avanço M</dt>
                <dd>Avança 1 posição na direção atual</dd>
              </div>
              <div className="protocol-row">
                <dt>Segurança de borda</dt>
                <dd>Comando fora da malha rejeita a sequência</dd>
              </div>
            </dl>
          </Panel>
        </aside>
      </main>
    </div>
  );
}
