"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { bearingDegrees, lerpPosition, type Position } from "@/lib/geo/geometry";

export type LocationState = { position?: Position; heading?: number; accuracy?: number; error?: string; following: boolean };

export function useGeolocation() {
  const [state, setState] = useState<LocationState>({ following: false });
  const watch = useRef<number | undefined>(undefined); const previous = useRef<Position | undefined>(undefined); const animated = useRef<Position | undefined>(undefined);
  const stop = useCallback(() => { if (watch.current !== undefined) navigator.geolocation.clearWatch(watch.current); watch.current = undefined; setState((current) => ({ ...current, following: false })); }, []);
  const start = useCallback(() => {
    if (!navigator.geolocation) { setState((current) => ({ ...current, error: "Geolocation is not supported by this browser." })); return; }
    watch.current = navigator.geolocation.watchPosition((fix) => {
      const next: Position = [fix.coords.longitude, fix.coords.latitude];
      const position = animated.current ? lerpPosition(animated.current, next, 0.58) : next;
      const moved = previous.current && Math.abs(previous.current[0] - next[0]) + Math.abs(previous.current[1] - next[1]) > 0.00001;
      const heading = fix.coords.heading ?? (moved && previous.current ? bearingDegrees(previous.current, next) : undefined);
      previous.current = next; animated.current = position;
      setState({ position, heading: heading ?? undefined, accuracy: fix.coords.accuracy, following: true });
    }, (error) => setState((current) => ({ ...current, error: error.code === error.PERMISSION_DENIED ? "Location permission was denied. Choose a start point to route manually." : error.message, following: false })), { enableHighAccuracy: true, maximumAge: 4_000, timeout: 12_000 });
  }, []);
  useEffect(() => stop, [stop]);
  return { ...state, start, stop };
}
