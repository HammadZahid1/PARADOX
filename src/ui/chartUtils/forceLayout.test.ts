import { describe, expect, it } from 'vitest';
import { computeForceLayout } from '@/ui/chartUtils/forceLayout';

describe('computeForceLayout', () => {
  it('uses deterministic sorted circle positions with zero iterations', () => {
    const layout = computeForceLayout([{ id: 'b' }, { id: 'a' }], [], {
      width: 100,
      height: 100,
      iterations: 0,
    });
    expect(layout.map((node) => node.id)).toEqual(['a', 'b']);
    expect(layout[0]?.x).toBeCloseTo(85);
    expect(layout[0]?.y).toBeCloseTo(50);
    expect(layout[1]?.x).toBeCloseTo(15);
    expect(layout[1]?.y).toBeCloseTo(50);
  });

  it('centres a single node and returns an empty result for no nodes', () => {
    expect(computeForceLayout([{ id: 'solo' }], [], { width: 100, height: 100, iterations: 0 }))
      .toEqual([{ id: 'solo', x: 50, y: 50 }]);
    expect(computeForceLayout([], [])).toEqual([]);
  });

  it('ignores unknown and self edges', () => {
    const nodes = [{ id: 'a' }, { id: 'b' }];
    const edges = [
      { source: 'a', target: 'a' },
      { source: 'a', target: 'missing' },
    ];
    expect(computeForceLayout(nodes, edges, { width: 100, height: 100, iterations: 0 }))
      .toEqual(computeForceLayout(nodes, [], { width: 100, height: 100, iterations: 0 }));
  });

  it('bounds layout iterations and produces finite positions for invalid options', () => {
    const layout = computeForceLayout(
      [{ id: 'b' }, { id: 'a' }, { id: 'c' }],
      [{ source: 'a', target: 'b' }],
      {
        width: Number.NaN,
        height: Number.NaN,
        iterations: Number.NaN,
        repulsion: Number.NaN,
        springStrength: Number.NaN,
        damping: Number.NaN,
        gravity: Number.NaN,
      },
    );
    expect(layout.map((node) => node.id)).toEqual(['a', 'b', 'c']);
    for (const node of layout) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(640);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(360);
    }
  });

  it('is stable across repeated calls', () => {
    const nodes = [{ id: 'c' }, { id: 'a' }, { id: 'b' }];
    const edges = [
      { source: 'a', target: 'b', distance: 20, strength: 0.5 },
      { source: 'b', target: 'c' },
    ];
    expect(computeForceLayout(nodes, edges, { iterations: 5 }))
      .toEqual(computeForceLayout(nodes, edges, { iterations: 5 }));
  });
});
