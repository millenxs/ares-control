import { describe, expect, it } from "vitest";
import { simulateNavigationPreview } from "../src/features/mission/previewNavigation";

describe("simulateNavigationPreview (single navigation source of truth)", () => {
  it("computes MRM from (0, 0, NORTH) reaching (1, 1, EAST) matching challenge specification", () => {
    const result = simulateNavigationPreview(
      { x: 0, y: 0 },
      "NORTH",
      { max_x: 5, max_y: 5 },
      "MRM",
    );

    expect(result.isValid).toBe(true);
    expect(result.finalPosition).toEqual({ x: 1, y: 1 });
    expect(result.finalDirection).toBe("EAST");
    expect(result.steps).toEqual([
      { x: 0, y: 1, direction: "NORTH", command: "M", index: 0 },
      { x: 0, y: 1, direction: "EAST", command: "R", index: 1 },
      { x: 1, y: 1, direction: "EAST", command: "M", index: 2 },
    ]);
    expect(result.failedStep).toBeNull();
  });

  it("identifies out-of-bounds at exact index when moving WEST from origin", () => {
    const result = simulateNavigationPreview(
      { x: 0, y: 0 },
      "WEST",
      { max_x: 5, max_y: 5 },
      "M",
    );

    expect(result.isValid).toBe(false);
    expect(result.errorIndex).toBe(0);
    expect(result.failedStep).toEqual({
      fromX: 0,
      fromY: 0,
      targetX: -1,
      targetY: 0,
      direction: "WEST",
      command: "M",
      index: 0,
    });
    expect(result.errorMessage).toContain("(-1, 0)");
  });

  it("handles full 360-degree rotations without changing position", () => {
    const resultR = simulateNavigationPreview(
      { x: 2, y: 2 },
      "NORTH",
      { max_x: 5, max_y: 5 },
      "RRRR",
    );
    expect(resultR.isValid).toBe(true);
    expect(resultR.finalPosition).toEqual({ x: 2, y: 2 });
    expect(resultR.finalDirection).toBe("NORTH");

    const resultL = simulateNavigationPreview(
      { x: 2, y: 2 },
      "NORTH",
      { max_x: 5, max_y: 5 },
      "LLLL",
    );
    expect(resultL.isValid).toBe(true);
    expect(resultL.finalPosition).toEqual({ x: 2, y: 2 });
    expect(resultL.finalDirection).toBe("NORTH");
  });

  it("preserves valid intermediate steps before encountering an out-of-bounds command", () => {
    const result = simulateNavigationPreview(
      { x: 0, y: 0 },
      "NORTH",
      { max_x: 2, max_y: 2 },
      "MMMM",
    );

    expect(result.isValid).toBe(false);
    expect(result.errorIndex).toBe(2);
    expect(result.steps).toHaveLength(2);
    expect(result.steps[0]).toEqual({
      x: 0,
      y: 1,
      direction: "NORTH",
      command: "M",
      index: 0,
    });
    expect(result.steps[1]).toEqual({
      x: 0,
      y: 2,
      direction: "NORTH",
      command: "M",
      index: 1,
    });
    expect(result.failedStep).toEqual({
      fromX: 0,
      fromY: 2,
      targetX: 0,
      targetY: 3,
      direction: "NORTH",
      command: "M",
      index: 2,
    });
  });
});
