import { describe, expect, it } from 'vitest';
import { generateAxisTicks } from '@/ui/chartUtils/axisTicks';

describe('generateAxisTicks', () => {
  it('generates nice linear ticks for a numeric domain', () => {
    const ticks = generateAxisTicks([0, 10], 5);
    expect(ticks.map((tick) => tick.value)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(ticks.map((tick) => tick.label)).toEqual(['0', '2.5', '5', '7.5', '10']);
  });

  it('supports fractional steps and reversed domains', () => {
    const fractional = generateAxisTicks([0, 1], 5);
    expect(fractional.map((tick) => tick.label)).toEqual(['0', '0.25', '0.5', '0.75', '1']);

    const forward = generateAxisTicks([0, 10], 5);
    expect(generateAxisTicks([10, 0], 5)).toEqual(forward);
  });

  it('returns a single tick for a single-point domain', () => {
    expect(generateAxisTicks([5, 5], 5)).toEqual([{ value: 5, label: '5' }]);
  });

  it('rejects invalid domains', () => {
    expect(generateAxisTicks([Number.NaN, 1])).toEqual([]);
    expect(generateAxisTicks([0, Number.POSITIVE_INFINITY])).toEqual([]);
  });

  it('is stable across repeated calls', () => {
    const domain = [-3, 7] as const;
    expect(generateAxisTicks(domain, 4)).toEqual(generateAxisTicks(domain, 4));
  });
});
