import { describe, expect, it } from 'vitest';
import { adjacency, breadthFirst, connectedComponents, depthFirst, findCycle, findPath, hasCycle, nodeDegrees, reverseAdjacency, topologicalSort } from './graph';

const edges = [
  { id: '1', from: 'a', to: 'b' },
  { id: '2', from: 'b', to: 'c' },
  { id: '3', from: 'a', to: 'd' },
  { id: '4', from: 'd', to: 'c' },
];

describe('graph algorithms', () => {
  it('builds forward and reverse adjacency', () => {
    expect(adjacency(edges).get('a')).toEqual(['b', 'd']);
    expect(reverseAdjacency(edges).get('c')).toEqual(['b', 'd']);
  });

  it('traverses breadth-first and depth-first', () => {
    expect(breadthFirst('a', edges)).toEqual(['a', 'b', 'd', 'c']);
    expect(depthFirst('a', edges)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('finds paths and reports missing paths', () => {
    expect(findPath('a', 'c', edges)).toEqual(['a', 'b', 'c']);
    expect(findPath('c', 'a', edges)).toBeNull();
  });

  it('detects cycles in directed graphs', () => {
    expect(hasCycle(edges)).toBe(false);
    const cyclic = [...edges, { id: '5', from: 'c', to: 'a' }];
    expect(hasCycle(cyclic)).toBe(true);
    expect(findCycle(cyclic)).toContain('a');
  });

  it('produces topological orders only for acyclic graphs', () => {
    const order = topologicalSort(['a', 'b', 'c', 'd'], edges);
    expect(order).not.toBeNull();
    expect(order!.indexOf('a')).toBeLessThan(order!.indexOf('b'));
    expect(topologicalSort(['a', 'b'], [{ id: 'x', from: 'a', to: 'b' }, { id: 'y', from: 'b', to: 'a' }])).toBeNull();
  });

  it('computes components and degrees', () => {
    const components = connectedComponents(['a', 'b', 'c', 'd', 'e'], edges);
    expect(components).toHaveLength(2);
    expect(nodeDegrees(['a', 'b', 'c'], edges)).toEqual({
      a: { in: 0, out: 2 }, b: { in: 1, out: 1 }, c: { in: 2, out: 0 },
    });
  });
});
