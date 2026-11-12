import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/app/App";
import {
  ApiClientError,
  type LaunchProbeInput,
  type Probe,
  type ProbesApiClient,
} from "../src/shared/api/probesApi";

function makeProbe(overrides: Partial<Probe> = {}): Probe {
  return {
    id: "probe-alpha-1234",
    x: 0,
    y: 0,
    direction: "NORTH",
    plateau: { max_x: 5, max_y: 5 },
    ...overrides,
  };
}

const findTelemetryPanel = () =>
  screen.findByRole("region", {
    name: "Observatório Cartográfico e Telemetria",
  });

function makeMockApiClient(
  overrides: Partial<ProbesApiClient> = {},
): ProbesApiClient {
  return {
    listProbes: vi.fn<() => Promise<Probe[]>>().mockResolvedValue([]),
    launchProbe: vi
      .fn<(input: LaunchProbeInput) => Promise<Probe>>()
      .mockImplementation(async (input) =>
        makeProbe({
          direction: input.direction,
          plateau: { max_x: input.x, max_y: input.y },
        }),
      ),
    executeCommands: vi
      .fn<(probeId: string, commands: string) => Promise<Probe>>()
      .mockResolvedValue(
        makeProbe({
          x: 1,
          y: 1,
          direction: "EAST",
        }),
      ),
    ...overrides,
  };
}

describe("Ares Control App", () => {
  it("renders loading state, empty mission state, and recovers from initial API failure", async () => {
    const user = userEvent.setup();
    const listProbes = vi
      .fn<() => Promise<Probe[]>>()
      .mockRejectedValueOnce(
        new ApiClientError(503, "http_error", "Estação orbital indisponível."),
      )
      .mockResolvedValueOnce([]);

    const apiClient = makeMockApiClient({ listProbes });
    render(<App apiClient={apiClient} />);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Estação orbital indisponível.");

    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    expect(
      screen.getByText("Nenhum sinal de sonda na superfície"),
    ).toBeInTheDocument();
  });

  it("completes the integrated launch and movement flow through the API client", async () => {
    const user = userEvent.setup();
    const apiClient = makeMockApiClient();

    render(<App apiClient={apiClient} />);

    await screen.findByText("Nenhum sinal de sonda na superfície");

    const maxXInput = screen.getByLabelText("Limite X máximo");
    const maxYInput = screen.getByLabelText("Limite Y máximo");
    await user.clear(maxXInput);
    await user.type(maxXInput, "5");
    await user.clear(maxYInput);
    await user.type(maxYInput, "5");

    await user.click(
      screen.getByRole("button", { name: "Lançar sonda em (0, 0)" }),
    );

    expect(apiClient.launchProbe).toHaveBeenCalledWith({
      x: 5,
      y: 5,
      direction: "NORTH",
    });

    const telemetry = await findTelemetryPanel();
    expect(within(telemetry).getByText("(0, 0)")).toBeInTheDocument();
    expect(
      within(telemetry).getByText("NORTH · Norte (↑)"),
    ).toBeInTheDocument();
    expect(within(telemetry).getByText("Malha 5 × 5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ M (Mover)" }));
    await user.click(screen.getByRole("button", { name: "+ R (Direita)" }));
    await user.click(screen.getByRole("button", { name: "+ M (Mover)" }));

    const commandInput = screen.getByLabelText("Sequência de comandos");
    expect(commandInput).toHaveValue("MRM");
    expect(screen.getByText("Fila de instruções (3)")).toBeInTheDocument();

    const perspectiveButton = screen.getByRole("button", {
      name: "Perspectiva: 3D",
    });
    expect(perspectiveButton).toHaveAttribute("aria-pressed", "true");
    await user.click(perspectiveButton);
    expect(
      screen.getByRole("button", { name: "Perspectiva: 2D" }),
    ).toHaveAttribute("aria-pressed", "false");

    await user.click(
      screen.getByRole("button", { name: "Transmitir comandos" }),
    );

    expect(apiClient.executeCommands).toHaveBeenCalledWith(
      "probe-alpha-1234",
      "MRM",
    );

    await waitFor(() => {
      expect(within(telemetry).getByText("(1, 1)")).toBeInTheDocument();
    });
    expect(
      within(telemetry).getByText("EAST · Leste (→)"),
    ).toBeInTheDocument();
    expect(commandInput).toHaveValue("");
  });

  it("preserves probe state and displays zero-based command index when movement fails", async () => {
    const user = userEvent.setup();
    const initialProbe = makeProbe({
      id: "probe-1",
      x: 0,
      y: 1,
      direction: "NORTH",
      plateau: { max_x: 2, max_y: 2 },
    });

    const apiClient = makeMockApiClient({
      listProbes: vi.fn<() => Promise<Probe[]>>().mockResolvedValue([
        initialProbe,
      ]),
      executeCommands: vi
        .fn<(probeId: string, commands: string) => Promise<Probe>>()
        .mockRejectedValue(
          new ApiClientError(
            422,
            "out_of_bounds",
            "Command at index 1 moves probe to (0, 3), outside plateau (2, 2).",
            { index: 1 },
          ),
        ),
    });

    render(<App apiClient={apiClient} />);

    const telemetry = await findTelemetryPanel();
    expect(within(telemetry).getByText("(0, 1)")).toBeInTheDocument();

    const commandInput = screen.getByLabelText("Sequência de comandos");
    await user.type(commandInput, "MM");

    const transmitButton = screen.getByRole("button", {
      name: "Transmitir comandos",
    });
    expect(transmitButton).toBeDisabled();

    const statusNotice = await screen.findByRole("status");
    expect(statusNotice).toHaveTextContent(
      "O comando 'M' no índice 1 levaria a sonda a (0, 3), fora da malha [0..2, 0..2].",
    );

    expect(within(telemetry).getByText("(0, 1)")).toBeInTheDocument();
    expect(within(telemetry).getByText("NORTH · Norte (↑)")).toBeInTheDocument();
    expect(commandInput).toHaveValue("MM");
  });

  it("recovers position, direction, and plateau bounds from the API after reload", async () => {
    const user = userEvent.setup();
    let backendProbes: Probe[] = [];

    const statefulApiClient: ProbesApiClient = {
      listProbes: vi.fn(async () => [...backendProbes]),
      launchProbe: vi.fn(async (input) => {
        const created: Probe = {
          id: "probe-persisted-1",
          x: 0,
          y: 0,
          direction: input.direction,
          plateau: { max_x: input.x, max_y: input.y },
        };
        backendProbes = [...backendProbes, created];
        return created;
      }),
      executeCommands: vi.fn(async (probeId) => {
        const updated: Probe = {
          id: probeId,
          x: 2,
          y: 3,
          direction: "WEST",
          plateau: { max_x: 6, max_y: 4 },
        };
        backendProbes = backendProbes.map((probe) =>
          probe.id === probeId ? updated : probe,
        );
        return updated;
      }),
    };

    const { unmount } = render(<App apiClient={statefulApiClient} />);

    await screen.findByText("Nenhum sinal de sonda na superfície");

    const maxXInput = screen.getByLabelText("Limite X máximo");
    const maxYInput = screen.getByLabelText("Limite Y máximo");
    await user.clear(maxXInput);
    await user.type(maxXInput, "6");
    await user.clear(maxYInput);
    await user.type(maxYInput, "4");
    await user.click(
      screen.getByRole("button", { name: "Lançar sonda em (0, 0)" }),
    );

    const firstTelemetry = await findTelemetryPanel();
    expect(within(firstTelemetry).getByText("Malha 6 × 4")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Sequência de comandos"), "MMMRMML");
    await user.click(
      screen.getByRole("button", { name: "Transmitir comandos" }),
    );
    await within(firstTelemetry).findByText("(2, 3)");

    unmount();

    render(<App apiClient={statefulApiClient} />);

    const reloadedTelemetry = await findTelemetryPanel();
    expect(within(reloadedTelemetry).getByText("(2, 3)")).toBeInTheDocument();
    expect(
      within(reloadedTelemetry).getByText("WEST · Oeste (←)"),
    ).toBeInTheDocument();
    expect(
      within(reloadedTelemetry).getByText("Malha 6 × 4"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Malha da sonda probe-persisted-1 com limites (6, 4), posição (2, 3) e direção WEST",
      }),
    ).toBeInTheDocument();
  });

  it("updates the displayed SVG plateau when switching between probes with different bounds", async () => {
    const user = userEvent.setup();
    const probeSmall = makeProbe({
      id: "probe-small-1111",
      x: 1,
      y: 2,
      direction: "NORTH",
      plateau: { max_x: 3, max_y: 3 },
    });
    const probeLarge = makeProbe({
      id: "probe-large-2222",
      x: 4,
      y: 6,
      direction: "SOUTH",
      plateau: { max_x: 8, max_y: 7 },
    });

    const apiClient = makeMockApiClient({
      listProbes: vi
        .fn<() => Promise<Probe[]>>()
        .mockResolvedValue([probeSmall, probeLarge]),
    });

    render(<App apiClient={apiClient} />);

    const telemetry = await findTelemetryPanel();
    expect(within(telemetry).getByText("Malha 3 × 3")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Malha da sonda probe-small-1111 com limites (3, 3), posição (1, 2) e direção NORTH",
      }),
    ).toBeInTheDocument();

    const probeButtons = screen
      .getByRole("list", { name: "Lista de sondas" })
      .querySelectorAll("button");
    expect(probeButtons).toHaveLength(2);

    await user.click(probeButtons[1]!);

    expect(await within(telemetry).findByText("Malha 8 × 7")).toBeInTheDocument();
    expect(within(telemetry).getByText("(4, 6)")).toBeInTheDocument();
    expect(
      within(telemetry).getByText("SOUTH · Sul (↓)"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Malha da sonda probe-large-2222 com limites (8, 7), posição (4, 6) e direção SOUTH",
      }),
    ).toBeInTheDocument();
  });

  it("populates the command buffer and preview when clicking a cell on the plateau grid", async () => {
    const user = userEvent.setup();
    const initialProbe = makeProbe({
      id: "probe-click-1",
      x: 0,
      y: 0,
      direction: "NORTH",
      plateau: { max_x: 5, max_y: 5 },
    });

    const apiClient = makeMockApiClient({
      listProbes: vi
        .fn<() => Promise<Probe[]>>()
        .mockResolvedValue([initialProbe]),
    });

    render(<App apiClient={apiClient} />);

    await screen.findByTestId("grid-cell-1-1");
    await user.click(screen.getByTestId("grid-cell-1-1"));

    expect(screen.getByLabelText("Sequência de comandos")).toHaveValue("MRM");
    expect(
      screen.getByText("Destino previsto: (1, 1, EAST)"),
    ).toBeInTheDocument();
  });

  it("allows rotating and moving directly after an out-of-bounds preview error without manually clearing the buffer", async () => {
    const user = userEvent.setup();
    const initialProbe = makeProbe({
      id: "probe-recover-1",
      x: 0,
      y: 0,
      direction: "NORTH",
      plateau: { max_x: 5, max_y: 5 },
    });

    const apiClient = makeMockApiClient({
      listProbes: vi
        .fn<() => Promise<Probe[]>>()
        .mockResolvedValue([initialProbe]),
    });

    render(<App apiClient={apiClient} />);

    await findTelemetryPanel();

    await user.click(screen.getByRole("button", { name: "+ L (Esquerda)" }));
    await user.click(screen.getByRole("button", { name: "+ M (Mover)" }));

    const commandInput = screen.getByLabelText("Sequência de comandos");
    expect(commandInput).toHaveValue("LM");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "O comando 'M' no índice 1 levaria a sonda a (-1, 0), fora da malha [0..5, 0..5].",
    );

    await user.click(screen.getByRole("button", { name: "+ R (Direita)" }));
    expect(commandInput).toHaveValue("LR");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ M (Mover)" }));
    expect(commandInput).toHaveValue("LRM");
    expect(
      screen.getByText("Destino previsto: (0, 1, NORTH)"),
    ).toBeInTheDocument();
  });
});
