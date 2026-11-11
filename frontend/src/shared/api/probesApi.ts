export type Direction = "NORTH" | "EAST" | "SOUTH" | "WEST";

export interface Plateau {
  max_x: number;
  max_y: number;
}

export interface Probe {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  plateau: Plateau;
}

export interface LaunchProbeInput {
  x: number;
  y: number;
  direction: Direction;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ProbesApiClient {
  listProbes(): Promise<Probe[]>;
  launchProbe(input: LaunchProbeInput): Promise<Probe>;
  executeCommands(probeId: string, commands: string): Promise<Probe>;
}

function resolveDefaultApiBaseUrl(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "https://ares-control.vercel.app";
  }
  return "http://localhost:8000";
}

const DEFAULT_API_BASE_URL = resolveDefaultApiBaseUrl();

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error as ApiErrorDetail | undefined;
    if (error && typeof error.code === "string" && typeof error.message === "string") {
      throw new ApiClientError(
        response.status,
        error.code,
        error.message,
        error.details ?? {},
      );
    }
    throw new ApiClientError(
      response.status,
      "http_error",
      `Falha na comunicação com a API (HTTP ${response.status}).`,
    );
  }
  return payload as T;
}

export function createProbesApiClient(
  baseUrl: string = DEFAULT_API_BASE_URL,
  fetchImpl: typeof fetch = fetch,
): ProbesApiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return {
    async listProbes(): Promise<Probe[]> {
      const response = await fetchImpl(`${normalizedBaseUrl}/api/v1/probes`, {
        method: "GET",
      });
      const data = await parseResponse<{ probes: Probe[] }>(response);
      return data.probes;
    },

    async launchProbe(input: LaunchProbeInput): Promise<Probe> {
      const response = await fetchImpl(`${normalizedBaseUrl}/api/v1/probes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseResponse<Probe>(response);
    },

    async executeCommands(probeId: string, commands: string): Promise<Probe> {
      const response = await fetchImpl(
        `${normalizedBaseUrl}/api/v1/probes/${encodeURIComponent(probeId)}/commands`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commands }),
        },
      );
      return parseResponse<Probe>(response);
    },
  };
}

export const defaultProbesApiClient = createProbesApiClient();
export const { listProbes, launchProbe, executeCommands } = defaultProbesApiClient;
