import { describe, expect, it } from 'vitest';
import { layoutBranchTree } from '@/ui/chartUtils/branchTree';

describe('layoutBranchTree', () => {
  it('lays out sorted children beneath a root with averaged parent coordinates', () => {
    const nodes = [
      { id: 'root', parentId: null },
      { id: 'beta', parentId: 'root' },
      { id: 'alpha', parentId: 'root' },
    ];
    const layout = layoutBranchTree(nodes, { xSpacing: 10, ySpacing: 20 });

    expect(layout).toEqual([
      { id: 'root', parentId: null, depth: 0, x: 5, y: 0, childCount: 2 },
      { id: 'alpha', parentId: 'root', depth: 1, x: 0, y: 20, childCount: 0 },
      { id: 'beta', parentId: 'root', depth: 1, x: 10, y: 20, childCount: 0 },
    ]);
  });

  it('handles empty, invalid, duplicate, and orphan nodes', () => {
    expect(layoutBranchTree([])).toEqual([]);
    expect(layoutBranchTree([{ id: '' }, { id: 'solo', parentId: 'missing' }])).toEqual([
      { id: 'solo', parentId: null, depth: 0, x: 0, y: 0, childCount: 0 },
    ]);
    expect(layoutBranchTree([
      { id: 'same', parentId: null },
      { id: 'same', parentId: 'other' },
      { id: 'other', parentId: null },
    ]).map((node) => node.id)).toEqual(['other', 'same']);
  });

  it('breaks parent cycles without recursion overflow', () => {
    const layout = layoutBranchTree([
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
    ]);
    expect(layout.map((node) => node.id)).toEqual(['a', 'b']);
    expect(layout[0]?.depth).toBe(0);
    expect(layout[1]?.depth).toBe(1);
    expect(layout.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
  });

  it('is independent of input order', () => {
    const forward = [
      { id: 'root', parentId: null },
      { id: 'a', parentId: 'root' },
      { id: 'b', parentId: 'root' },
    ];
    expect(layoutBranchTree([...forward].reverse())).toEqual(layoutBranchTree(forward));
  });
});
