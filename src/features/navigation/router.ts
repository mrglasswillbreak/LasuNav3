import { distanceMeters, nearestPointOnSegment, type Position } from "@/lib/geo/geometry";
import type { GraphEdge, RoutingGraph } from "@/features/offline-pack/types";

export type Route = { nodeIds: string[]; coordinates: Position[]; distance: number; edges: GraphEdge[] };

function nearestNode(graph: RoutingGraph, position: Position) {
  return graph.nodes.reduce((best, node) => distanceMeters(node.position, position) < distanceMeters(best.position, position) ? node : best, graph.nodes[0]);
}

export function findRoute(graph: RoutingGraph, from: Position, to: Position): Route | undefined {
  if (!graph.nodes.length) return undefined;
  const start = nearestNode(graph, from); const goal = nearestNode(graph, to);
  const adjacency = new Map<string, GraphEdge[]>();
  for (const edge of graph.edges) {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), { ...edge, from: edge.to, to: edge.from }]);
  }
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const open = new Set([start.id]); const cost = new Map([[start.id, 0]]); const score = new Map([[start.id, distanceMeters(start.position, goal.position)]]); const previous = new Map<string, GraphEdge>();
  while (open.size) {
    const current = [...open].reduce((best, id) => (score.get(id) ?? Infinity) < (score.get(best) ?? Infinity) ? id : best);
    if (current === goal.id) {
      const nodeIds = [current]; const edges: GraphEdge[] = [];
      while (previous.has(nodeIds[0])) { const edge = previous.get(nodeIds[0])!; edges.unshift(edge); nodeIds.unshift(edge.from); }
      return { nodeIds, edges, coordinates: nodeIds.map((id) => byId.get(id)!.position), distance: cost.get(current) ?? 0 };
    }
    open.delete(current);
    for (const edge of adjacency.get(current) ?? []) {
      const tentative = (cost.get(current) ?? Infinity) + edge.distance;
      if (tentative < (cost.get(edge.to) ?? Infinity)) {
        previous.set(edge.to, edge); cost.set(edge.to, tentative); score.set(edge.to, tentative + distanceMeters(byId.get(edge.to)!.position, goal.position)); open.add(edge.to);
      }
    }
  }
  return undefined;
}

export function distanceFromRoute(position: Position, route: Route) {
  let closest = Infinity;
  for (let i = 0; i < route.coordinates.length - 1; i++) {
    const point = nearestPointOnSegment(position, route.coordinates[i], route.coordinates[i + 1]).point;
    closest = Math.min(closest, distanceMeters(position, point));
  }
  return closest;
}
