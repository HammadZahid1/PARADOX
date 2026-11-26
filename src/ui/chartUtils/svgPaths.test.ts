import { describe, expect, it } from 'vitest';
import { buildAreaPath, buildLinePath } from '@/ui/chartUtils/svgPaths';

describe('SVG path builders', () => {
  it('builds line paths with fixed precision', () => {
    expect(buildLinePath([{ x: 1, y: 2 }, { x: 3, y: 4 }], 0)).toBe('M 1 2 L 3 4');
    expect(buildLinePath([{ x: 1, y: 2 }])).toBe('M 1.00 2.00');
  });

  it('builds closed area paths against a finite baseline', () => {
    expect(buildAreaPath([{ x: 1, y: 2 }, { x: 3, y: 4 }], 0, 0)).toBe(
      'M 1 2 L 3 4 L 3 0 L 1 0 Z',
    );
    expect(buildAreaPath([{ x: 2, y: 3 }], 0, 0)).toBe('M 2 3 L 2 0 L 2 0 Z');
  });

  it('skips non-finite points and rejects non-finite baselines', () => {
    const points = [
      { x: 1, y: 2 },
      { x: Number.NaN, y: 3 },
      { x: Number.POSITIVE_INFINITY, y: 4 },
      { x: 3, y: 4 },
    ];
    expect(buildLinePath(points, 0)).toBe('M 1 2 L 3 4');
    expect(buildAreaPath(points, 0, 0)).toBe('M 1 2 L 3 4 L 3 0 L 1 0 Z');
    expect(buildAreaPath(points, Number.NaN)).toBe('');
  });

  it('handles empty inputs and invalid precision', () => {
    expect(buildLinePath([])).toBe('');
    expect(buildAreaPath([], 0)).toBe('');
    expect(buildLinePath([{ x: 1, y: 2 }], Number.NaN)).toBe('M 1.00 2.00');
  });

  it('is stable across repeated calls', () => {
    const points = [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }];
    expect(buildLinePath(points)).toBe(buildLinePath(points));
    expect(buildAreaPath(points, 0)).toBe(buildAreaPath(points, 0));
  });
});
