import { describe, expect, it } from 'vitest';
import type { CausalGraph, CausalRelationship } from '@/engine/types';
import { graphCycleWarning, validateCausalGraph, validateRelationship } from './graph';

const edge = (id: string, from: string, to: string, strength = 0.5): CausalRelationship => ({
  id, from, to, type: 'influences', strength, enabled: true,
});
const graph: CausalGraph = {
  id: 'g', name: 'Test',
  nodes: [{ id: 'n1', kind: 'variable', refId: 'v1', label: 'A' }, { id: 'n2', kind: 'variable', refId: 'v2', label: 'B' }],
  edges: [edge('e1', 'n1', 'n2')],
};

describe('causal graph validation', () => {
  it('validates well-formed graphs', () => {
    expect(validateCausalGraph(graph).valid).toBe(true);
  });

  it('rejects strength outside [-1,1] and dangling edges', () => {
    expect(validateRelationship(edge('x', 'a', 'b', 2)).valid).toBe(false);
    expect(validateCausalGraph({ ...graph, edges: [edge('e1', 'n1', 'missing')] }).valid).toBe(false);
  });

  it('reports feedback cycles as warnings', () => {
    const cyclic = { ...graph, edges: [edge('e1', 'n1', 'n2'), edge('e2', 'n2', 'n1')] };
    const result = graphCycleWarning(cyclic);
    expect(result.valid).toBe(true);
    expect(result.issues[0]?.severity).toBe('warning');
  });
});
