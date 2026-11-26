import type { CausalGraph, EntityId } from '@/engine/types';
import { enumeratePaths, type PathOptions } from './paths';

export interface ImpactScore {
  id: EntityId;
  /** Sum of absolute signed strengths of incoming one-edge paths. */
  directInfluence: number;
  /** Sum of absolute signed strengths of incoming paths with at least two edges. */
  indirectInfluence: number;
  /** directInfluence + indirectInfluence. */
  score: number;
  /** Number of contributing incoming paths. */
  pathCount: number;
}

/** Ranks nodes by influence received through direct and indirect paths, highest score first then ascending id. */
export function rankImpact(graph: CausalGraph, options: PathOptions = {}): ImpactScore[] {
  const ids = [...graph.nodes.map((node) => node.id)].sort(compareIds);
  const scores = new Map<EntityId, ImpactScore>(ids.map((id) => [id, {
    id, directInfluence: 0, indirectInfluence: 0, score: 0, pathCount: 0,
  }]));

  for (const source of ids) {
    for (const target of ids) {
      if (source === target) continue;
      for (const path of enumeratePaths(graph, source, target, options)) {
        const entry = scores.get(target)!;
        const influence = Math.abs(path.signedStrength);
        if (path.edges.length === 1) {
          entry.directInfluence += influence;
        } else {
          entry.indirectInfluence += influence;
        }
        entry.score += influence;
        entry.pathCount += 1;
      }
    }
  }

  return [...scores.values()].sort((a, b) => b.score - a.score || compareIds(a.id, b.id));
}

function compareIds(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
