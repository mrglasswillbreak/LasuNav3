import { describe, expect, it } from "vitest";
import { findRoute } from "../src/features/navigation/router";

describe("offline A* router", () => {
  it("returns the shortest connected walking route", () => {
    const graph = { nodes: [{ id: "a", position: [3.2, 6.4] as [number, number] }, { id: "b", position: [3.201, 6.4] as [number, number] }, { id: "c", position: [3.202, 6.4] as [number, number] }], edges: [{ from: "a", to: "b", distance: 10 }, { from: "b", to: "c", distance: 10 }, { from: "a", to: "c", distance: 99 }] };
    expect(findRoute(graph, [3.2, 6.4], [3.202, 6.4])?.nodeIds).toEqual(["a", "b", "c"]);
  });
});
