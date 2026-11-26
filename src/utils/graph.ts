/** Generic directed graph algorithms used by the causal engine and visualizations. */

export interface GraphEdgeLike {
  id: string;
  from: string;
  to: string;
  weight?: number;
}

export function adjacency(edges: readonly GraphEdgeLike[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = map.get(edge.from) ?? [];
    targets.push(edge.to);
    map.set(edge.from, targets);
  }
  return map;
}

export function reverseAdjacency(edges: readonly GraphEdgeLike[]): Map<string, string[]> {
  return adjacency(edges.map((edge) => ({ ...edge, from: edge.to, to: edge.from })));
}

export function breadthFirst(start: string, edges: readonly GraphEdgeLike[]): string[] {
  const map = adjacency(edges);
  const visited = new Set<string>([start]);
  const queue = [start];
  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const next of map.get(node) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return order;
}

export function depthFirst(start: string, edges: readonly GraphEdgeLike[]): string[] {
  const map = adjacency(edges);
  const visited = new Set<string>();
  const order: string[] = [];
  const visit = (node: string): void => {
    if (visited.has(node)) return;
    visited.add(node);
    order.push(node);
    for (const next of map.get(node) ?? []) visit(next);
  };
  visit(start);
  return order;
}

export function findPath(start: string, goal: string, edges: readonly GraphEdgeLike[]): string[] | null {
  const map = adjacency(edges);
  const queue: string[][] = [[start]];
  const visited = new Set<string>([start]);
  while (queue.length > 0) {
    const path = queue.shift()!;
    const node = path[path.length - 1]!;
    if (node === goal) return path;
    for (const next of map.get(node) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return null;
}

/** Returns a list of node ids participating in a directed cycle (empty when acyclic). */
export function findCycle(edges: readonly GraphEdgeLike[]): string[] {
  const map = adjacency(edges);
  const state = new Map<string, 0 | 1 | 2>();
  let cycle: string[] = [];
  const stack: string[] = [];

  const visit = (node: string): void => {
    if (cycle.length > 0) return;
    state.set(node, 1);
    stack.push(node);
    for (const next of map.get(node) ?? []) {
      const nextState = state.get(next) ?? 0;
      if (nextState === 0) visit(next);
      else if (nextState === 1) {
        cycle = stack.slice(stack.indexOf(next));
        return;
      }
    }
    stack.pop();
    state.set(node, 2);
  };

  for (const node of map.keys()) if ((state.get(node) ?? 0) === 0) visit(node);
  return cycle;
}

export function hasCycle(edges: readonly GraphEdgeLike[]): boolean {
  return findCycle(edges).length > 0;
}

/** Kahn topological sort. Returns null when a cycle prevents ordering. */
export function topologicalSort(nodes: readonly string[], edges: readonly GraphEdgeLike[]): string[] | null {
  const indegree = new Map(nodes.map((node) => [node, 0]));
  const map = adjacency(edges);
  for (const edge of edges) {
    if (!indegree.has(edge.from)) indegree.set(edge.from, 0);
    if (!indegree.has(edge.to)) indegree.set(edge.to, 0);
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
  }
  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([node]) => node);
  const order: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    for (const next of map.get(node) ?? []) {
      const remaining = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
  }
  return order.length === indegree.size ? order : null;
}

export function connectedComponents(nodes: readonly string[], edges: readonly GraphEdgeLike[]): string[][] {
  const undirected = [...edges, ...edges.map((edge) => ({ ...edge, from: edge.to, to: edge.from }))];
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const node of nodes) {
    if (seen.has(node)) continue;
    const component = breadthFirst(node, undirected);
    component.forEach((id) => seen.add(id));
    components.push(component);
  }
  return components;
}

export function nodeDegrees(nodes: readonly string[], edges: readonly GraphEdgeLike[]): Record<string, { in: number; out: number }> {
  const result: Record<string, { in: number; out: number }> = {};
  for (const node of nodes) result[node] = { in: 0, out: 0 };
  for (const edge of edges) {
    if (result[edge.from]) result[edge.from]!.out += 1;
    if (result[edge.to]) result[edge.to]!.in += 1;
  }
  return result;
}
