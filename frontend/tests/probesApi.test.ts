import { describe, expect, it, vi } from "vitest";
import {
  ApiClientError,
  createProbesApiClient,
  type Probe,
} from "../src/shared/api/probesApi";

const sampleProbe: Probe = {
  id: "probe-1",
  x: 0,
  y: 0,
  direction: "NORTH",
  plateau: { max_x: 5, max_y: 5 },
};

describe("createProbesApiClient", () => {
  it("lists, launches, and moves probes through the REST endpoints", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ probes: [sampleProbe] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(sampleProbe), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ...sampleProbe,
            x: 1,
            y: 1,
            direction: "EAST",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    const client = createProbesApiClient("http://localhost:8000/", fetchMock);

    const listed = await client.listProbes();
    expect(listed).toEqual([sampleProbe]);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8000/api/v1/probes",
      { method: "GET" },
    );

    const launched = await client.launchProbe({
      x: 5,
      y: 5,
      direction: "NORTH",
    });
    expect(launched).toEqual(sampleProbe);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8000/api/v1/probes",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x: 5, y: 5, direction: "NORTH" }),
      },
    );

    const moved = await client.executeCommands("probe-1", "MRM");
    expect(moved.x).toBe(1);
    expect(moved.y).toBe(1);
    expect(moved.direction).toBe("EAST");
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:8000/api/v1/probes/probe-1/commands",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands: "MRM" }),
      },
    );
  });

  it("translates structured API error envelopes into ApiClientError", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "invalid_command",
            message: "Invalid command 'X' at index 2.",
            details: { index: 2, command: "X" },
          },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    const client = createProbesApiClient("http://localhost:8000", fetchMock);

    await expect(client.executeCommands("probe-1", "MRX")).rejects.toEqual(
      new ApiClientError(
        422,
        "invalid_command",
        "Invalid command 'X' at index 2.",
        { index: 2, command: "X" },
      ),
    );
  });
});
