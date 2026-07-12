import { angleDelta, bearingDegrees, distanceMeters } from "@/lib/geo/geometry";
import type { Route } from "./router";

export type Instruction = { at: number; text: string; distanceFromStart: number };

const direction = (delta: number) => Math.abs(delta) < 25 ? "Continue straight" : delta > 0 ? "Turn right" : "Turn left";
export function makeInstructions(route: Route): Instruction[] {
  if (route.coordinates.length < 2) return [];
  let travelled = 0; const result: Instruction[] = [{ at: 0, text: "Start walking", distanceFromStart: 0 }];
  for (let i = 1; i < route.coordinates.length - 1; i++) {
    travelled += distanceMeters(route.coordinates[i - 1], route.coordinates[i]);
    const delta = angleDelta(bearingDegrees(route.coordinates[i - 1], route.coordinates[i]), bearingDegrees(route.coordinates[i], route.coordinates[i + 1]));
    if (Math.abs(delta) >= 25) result.push({ at: i, text: direction(delta), distanceFromStart: travelled });
  }
  result.push({ at: route.coordinates.length - 1, text: "You have arrived", distanceFromStart: route.distance });
  return result;
}
