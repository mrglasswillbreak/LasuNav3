import { describe, expect, it } from "vitest";
import { angleDelta, bearingDegrees, distanceMeters } from "../src/lib/geo/geometry";

describe("campus geometry", () => {
  it("calculates walking distance and cardinal heading", () => {
    expect(distanceMeters([3.2, 6.46], [3.2, 6.461])).toBeGreaterThan(100);
    expect(bearingDegrees([3.2, 6.46], [3.2, 6.461])).toBeCloseTo(0, 0);
  });
  it("smooths bearing differences across north", () => expect(angleDelta(355, 5)).toBe(10));
});
