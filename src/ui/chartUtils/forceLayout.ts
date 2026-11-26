export interface ForceNode {
  id: string;
}

export interface ForceEdge {
  source: string;
  target: string;
  distance?: number;
  strength?: number;
}

export interface ForceLayoutOptions {
  width?: number;
  height?: number;
  iterations?: number;
  repulsion?: number;
  springStrength?: number;
  damping?: number;
  gravity?: number;
}

export interface ForceLayoutNode {
  id: string;
  x: number;
  y: number;
}

interface MutableNode extends ForceLayoutNode {
  vx: number;
  vy: number;
}

interface NormalizedEdge {
  sourceIndex: number;
  targetIndex: number;
  distance: number;
  strength: number;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function cleanZero(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

function roundValue(value: number): number {
  return cleanZero(Math.round(value * 1e6) / 1e6);
}

export function computeForceLayout(
  nodes: readonly ForceNode[],
  edges: readonly ForceEdge[],
  options: ForceLayoutOptions = {},
): ForceLayoutNode[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const node of nodes) {
    const id = node.id.trim();
    if (id === '' || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  ids.sort(compareText);
  if (ids.length === 0) return [];

  const width = Math.max(1, finiteOr(options.width, 640));
  const height = Math.max(1, finiteOr(options.height, 360));
  const iterations = Math.min(200, Math.max(0, Math.floor(finiteOr(options.iterations, 60))));
  const repulsion = Math.max(0, finiteOr(options.repulsion, 2000));
  const springStrength = clamp(finiteOr(options.springStrength, 0.05), 0, 1);
  const damping = clamp(finiteOr(options.damping, 0.85), 0, 1);
  const gravity = clamp(finiteOr(options.gravity, 0.02), 0, 1);

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.35;
  const layout: MutableNode[] = ids.map((id, index) => {
    if (ids.length === 1) {
      return { id, x: centerX, y: centerY, vx: 0, vy: 0 };
    }
    const angle = (Math.PI * 2 * index) / ids.length;
    return {
      id,
      x: clamp(centerX + Math.cos(angle) * radius, 0, width),
      y: clamp(centerY + Math.sin(angle) * radius, 0, height),
      vx: 0,
      vy: 0,
    };
  });

  const indexById = new Map<string, number>();
  layout.forEach((node, index) => indexById.set(node.id, index));

  const normalizedEdges: NormalizedEdge[] = [];
  for (const edge of edges) {
    const sourceIndex = indexById.get(edge.source.trim());
    const targetIndex = indexById.get(edge.target.trim());
    if (sourceIndex === undefined || targetIndex === undefined || sourceIndex === targetIndex) {
      continue;
    }
    normalizedEdges.push({
      sourceIndex,
      targetIndex,
      distance: Math.max(1, finiteOr(edge.distance, 60)),
      strength: clamp(finiteOr(edge.strength, 1), 0, 1),
    });
  }

  const epsilon = 1e-6;
  const maximumStep = 20;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const forceX = new Array<number>(layout.length).fill(0);
    const forceY = new Array<number>(layout.length).fill(0);

    for (let left = 0; left < layout.length; left += 1) {
      for (let right = left + 1; right < layout.length; right += 1) {
        const leftNode = layout[left];
        const rightNode = layout[right];
        if (!leftNode || !rightNode) continue;

        let dx = leftNode.x - rightNode.x;
        let dy = leftNode.y - rightNode.y;
        let distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < epsilon) {
          dx = epsilon;
          dy = epsilon;
          distanceSquared = dx * dx + dy * dy;
        }

        const distance = Math.sqrt(distanceSquared);
        const magnitude = Math.min(100, repulsion / distanceSquared);
        const fx = (dx / distance) * magnitude;
        const fy = (dy / distance) * magnitude;
        forceX[left] = (forceX[left] ?? 0) + fx;
        forceY[left] = (forceY[left] ?? 0) + fy;
        forceX[right] = (forceX[right] ?? 0) - fx;
        forceY[right] = (forceY[right] ?? 0) - fy;
      }
    }

    for (const edge of normalizedEdges) {
      const source = layout[edge.sourceIndex];
      const target = layout[edge.targetIndex];
      if (!source || !target) continue;

      let dx = target.x - source.x;
      let dy = target.y - source.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < epsilon) {
        dx = epsilon;
        dy = epsilon;
        distance = Math.sqrt(dx * dx + dy * dy);
      }

      const magnitude = (distance - edge.distance) * springStrength * edge.strength;
      const fx = (dx / distance) * magnitude;
      const fy = (dy / distance) * magnitude;
      forceX[edge.sourceIndex] = (forceX[edge.sourceIndex] ?? 0) + fx;
      forceY[edge.sourceIndex] = (forceY[edge.sourceIndex] ?? 0) + fy;
      forceX[edge.targetIndex] = (forceX[edge.targetIndex] ?? 0) - fx;
      forceY[edge.targetIndex] = (forceY[edge.targetIndex] ?? 0) - fy;
    }

    for (let index = 0; index < layout.length; index += 1) {
      const node = layout[index];
      if (!node) continue;

      node.vx = ((forceX[index] ?? 0) + (centerX - node.x) * gravity + node.vx) * damping;
      node.vy = ((forceY[index] ?? 0) + (centerY - node.y) * gravity + node.vy) * damping;
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > maximumStep) {
        const scale = maximumStep / speed;
        node.vx *= scale;
        node.vy *= scale;
      }
      node.x = clamp(node.x + node.vx, 0, width);
      node.y = clamp(node.y + node.vy, 0, height);
    }
  }

  return layout.map((node) => ({ id: node.id, x: roundValue(node.x), y: roundValue(node.y) }));
}
