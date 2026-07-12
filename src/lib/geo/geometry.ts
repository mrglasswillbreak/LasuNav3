export type Position = [number, number]; // [longitude, latitude]

const R = 6_371_000;
const radians = (value: number) => (value * Math.PI) / 180;
const degrees = (value: number) => (value * 180) / Math.PI;

export function distanceMeters(a: Position, b: Position) {
  const dLat = radians(b[1] - a[1]);
  const dLng = radians(b[0] - a[0]);
  const lat1 = radians(a[1]);
  const lat2 = radians(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bearingDegrees(a: Position, b: Position) {
  const lngDelta = radians(b[0] - a[0]);
  const lat1 = radians(a[1]);
  const lat2 = radians(b[1]);
  const y = Math.sin(lngDelta) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lngDelta);
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

export function angleDelta(from: number, to: number) { return ((to - from + 540) % 360) - 180; }
export function lerpPosition(a: Position, b: Position, t: number): Position { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

export function nearestPointOnSegment(point: Position, start: Position, end: Position) {
  const cosLat = Math.cos(radians(point[1]));
  const scale = 111_320;
  const p: Position = [point[0] * cosLat * scale, point[1] * scale];
  const a: Position = [start[0] * cosLat * scale, start[1] * scale];
  const b: Position = [end[0] * cosLat * scale, end[1] * scale];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return { point: lerpPosition(start, end, t), t };
}
