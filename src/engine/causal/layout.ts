import type { CausalGraph } from '@/engine/types';
import { nodeDegrees } from '@/utils/graph';

export type GraphLayoutMode = 'hierarchical' | 'radial' | 'circular' | 'force';

export interface LayoutPoint { x: number; y: number }
export type GraphLayout = Record<string, LayoutPoint>;

function connectionPairs(graph: CausalGraph): Array<[string, string]> {
  return graph.edges.filter((edge) => edge.enabled).map((edge) => [edge.from, edge.to]);
}

/** Deterministic graph layouts for the causal visualization. */
export function layoutGraph(graph: CausalGraph, mode: GraphLayoutMode, width = 800, height = 600): GraphLayout {
  const nodes = graph.nodes;
  const result: GraphLayout = {};
  if (nodes.length === 0) return result;
  const centerX = width / 2;
  const centerY = height / 2;

  if (mode === 'circular' || mode === 'radial') {
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2;
      const radius = mode === 'circular' ? Math.min(width, height) * 0.4 : 60 + (index % 4) * 60;
      result[node.id] = { x: centerX + Math.cos(angle) * radius, y: centerY + Math.sin(angle) * radius };
    });
    return result;
  }

  if (mode === 'hierarchical') {
    const degrees = nodeDegrees(nodes.map((node) => node.id), graph.edges);
    const layers = new Map<string, number>();
    const visit = (id: string, depth: number): void => {
      const current = layers.get(id);
      if (current !== undefined && current <= depth) return;
      layers.set(id, depth);
      for (const [from, to] of connectionPairs(graph)) {
        if (from === id) visit(to, depth + 1);
      }
    };
    const roots = nodes.filter((node) => (degrees[node.id]?.in ?? 0) === 0);
    (roots.length > 0 ? roots : nodes.slice(0, 1)).forEach((node) => visit(node.id, 0));
    nodes.forEach((node) => { if (!layers.has(node.id)) layers.set(node.id, 0); });
    const grouped = new Map<number, string[]>();
    for (const node of nodes) {
      const layer = layers.get(node.id) ?? 0;
      grouped.set(layer, [...(grouped.get(layer) ?? []), node.id]);
    }
    for (const [layer, ids] of grouped) {
      ids.forEach((id, index) => {
        result[id] = { x: centerX + (index - (ids.length - 1) / 2) * 180, y: 60 + layer * 120 };
      });
    }
    return result;
  }

  nodes.forEach((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    result[node.id] = { x: centerX + Math.cos(angle) * 180, y: centerY + Math.sin(angle) * 180 };
  });
  const pairs = connectionPairs(graph);
  for (let iteration = 0; iteration < 90; iteration += 1) {
    for (const node of nodes) {
      let fx = 0;
      let fy = 0;
      for (const other of nodes) {
        if (other.id === node.id) continue;
        const dx = result[node.id]!.x - result[other.id]!.x;
        const dy = result[node.id]!.y - result[other.id]!.y;
        const distance = Math.max(20, Math.hypot(dx, dy));
        fx += (dx / distance) * 600 / distance;
        fy += (dy / distance) * 600 / distance;
      }
      for (const [from, to] of pairs) {
        if (from !== node.id && to !== node.id) continue;
        const otherId = from === node.id ? to : from;
        const other = result[otherId];
        if (!other) continue;
        fx += (other.x - result[node.id]!.x) * 0.01;
        fy += (other.y - result[node.id]!.y) * 0.01;
      }
      fx += (centerX - result[node.id]!.x) * 0.005;
      fy += (centerY - result[node.id]!.y) * 0.005;
      result[node.id] = {
        x: Math.max(20, Math.min(width - 20, result[node.id]!.x + Math.max(-18, Math.min(18, fx)))),
        y: Math.max(20, Math.min(height - 20, result[node.id]!.y + Math.max(-18, Math.min(18, fy)))),
      };
    }
  }
  return result;
}
