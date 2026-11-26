import { describe, expect, it } from 'vitest';
import type { VariableDefinition } from '@/engine/types';
import { addRelationship, addVariableNode, createCausalGraph } from './graph';
import { layoutGraph } from './layout';

const definitions: VariableDefinition[] = [
  { id: 'v1', key: 'a', name: 'A', type: 'number', initial: 1 },
  { id: 'v2', key: 'b', name: 'B', type: 'number', initial: 1 },
  { id: 'v3', key: 'c', name: 'C', type: 'number', initial: 1 },
];
const graph = createCausalGraph('layout');
const a = addVariableNode(graph, definitions[0]!);
const b = addVariableNode(graph, definitions[1]!);
const c = addVariableNode(graph, definitions[2]!);
addRelationship(graph, a.id, b.id);
addRelationship(graph, b.id, c.id);

describe('causal graph layouts', () => {
  it('positions every node for each layout mode', () => {
    for (const mode of ['hierarchical', 'radial', 'circular', 'force'] as const) {
      const layout = layoutGraph(graph, mode);
      expect(Object.keys(layout)).toHaveLength(3);
      Object.values(layout).forEach((point) => {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      });
    }
  });

  it('lays out roots above their descendants', () => {
    const layout = layoutGraph(graph, 'hierarchical');
    expect(layout[a.id]!.y).toBeLessThan(layout[b.id]!.y);
    expect(layout[b.id]!.y).toBeLessThan(layout[c.id]!.y);
  });

  it('produces deterministic force layout', () => {
    expect(layoutGraph(graph, 'force')).toEqual(layoutGraph(graph, 'force'));
  });
});
