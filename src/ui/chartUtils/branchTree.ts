export interface BranchNode {
  id: string;
  parentId?: string | null;
}

export interface BranchTreeOptions {
  xSpacing?: number;
  ySpacing?: number;
}

export interface BranchTreeNode {
  id: string;
  parentId: string | null;
  depth: number;
  x: number;
  y: number;
  childCount: number;
}

interface InternalNode {
  id: string;
  parentId: string | null;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
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

export function layoutBranchTree(
  nodes: readonly BranchNode[],
  options: BranchTreeOptions = {},
): BranchTreeNode[] {
  const seen = new Set<string>();
  const internal: InternalNode[] = [];

  for (const node of nodes) {
    const id = node.id.trim();
    if (id === '' || seen.has(id)) continue;
    seen.add(id);

    const rawParent = typeof node.parentId === 'string' ? node.parentId.trim() : '';
    const parentId = rawParent !== '' && rawParent !== id ? rawParent : null;
    internal.push({ id, parentId });
  }

  if (internal.length === 0) return [];

  const xSpacing = Math.max(0, finiteOr(options.xSpacing, 160));
  const ySpacing = Math.max(0, finiteOr(options.ySpacing, 80));
  const byId = new Map<string, InternalNode>();
  for (const node of internal) byId.set(node.id, node);

  const children = new Map<string, InternalNode[]>();
  for (const node of internal) {
    if (node.parentId === null || !byId.has(node.parentId)) continue;
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  for (const siblings of children.values()) {
    siblings.sort((left, right) => compareText(left.id, right.id));
  }

  const roots = internal
    .filter((node) => node.parentId === null || !byId.has(node.parentId))
    .sort((left, right) => compareText(left.id, right.id));

  const layout = new Map<string, BranchTreeNode>();
  const visiting = new Set<string>();
  let leafIndex = 0;

  const visit = (node: InternalNode, depth: number): BranchTreeNode | undefined => {
    const existing = layout.get(node.id);
    if (existing) return existing;
    if (visiting.has(node.id)) return undefined;

    visiting.add(node.id);
    const allChildren = children.get(node.id) ?? [];
    const pendingChildren = allChildren.filter((child) => !layout.has(child.id));
    const childLayouts: BranchTreeNode[] = [];

    for (const child of pendingChildren) {
      const childLayout = visit(child, depth + 1);
      if (childLayout) childLayouts.push(childLayout);
    }

    let x: number;
    if (childLayouts.length === 0) {
      x = leafIndex * xSpacing;
      leafIndex += 1;
    } else {
      x = childLayouts.reduce((total, child) => total + child.x, 0) / childLayouts.length;
    }

    visiting.delete(node.id);
    const placed: BranchTreeNode = {
      id: node.id,
      parentId: node.parentId !== null && byId.has(node.parentId) ? node.parentId : null,
      depth,
      x: roundValue(x),
      y: roundValue(depth * ySpacing),
      childCount: allChildren.length,
    };
    layout.set(node.id, placed);
    return placed;
  };

  for (const root of roots) visit(root, 0);

  const cycleStarts = [...internal].sort((left, right) => compareText(left.id, right.id));
  for (const node of cycleStarts) visit(node, 0);

  return internal
    .map((node) => layout.get(node.id))
    .filter((node): node is BranchTreeNode => node !== undefined)
    .sort((left, right) => (
      left.depth - right.depth || left.x - right.x || compareText(left.id, right.id)
    ));
}
