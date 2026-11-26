import { describe, expect, it } from 'vitest';
import { createStreams, deriveStreamSeed, NamedStreams } from './streams';

describe('named RNG streams', () => {
  it('derives seeds only from the master seed and name', () => {
    expect(deriveStreamSeed(7, 'events')).toBe(deriveStreamSeed(7, 'events'));
    expect(deriveStreamSeed(7, 'events')).not.toBe(deriveStreamSeed(7, 'variables'));
    expect(deriveStreamSeed(7, 'events')).not.toBe(deriveStreamSeed(8, 'events'));
  });

  it('is stable across registration order', () => {
    const first = createStreams(7, ['beta', 'alpha']);
    const second: NamedStreams = new NamedStreams(7, ['alpha', 'beta']);
    expect(first.names).toEqual(['alpha', 'beta']);
    expect(second.names).toEqual(first.names);
    expect(first.create('alpha').next()).toBe(second.create('alpha').next());
    expect(first.create('beta').next()).toBe(second.create('beta').next());
  });

  it('keeps streams independent and repeatable', () => {
    const streams = createStreams(7);
    const events = streams.register('events');
    const variables = streams.register('variables');
    const firstEventValue = events.next();
    expect(variables.next()).not.toBe(firstEventValue);
    expect(events.next()).not.toBe(firstEventValue);
    expect(streams.create('events').next()).toBe(firstEventValue);
    expect(streams.has('events')).toBe(true);
    expect(streams.has('missing')).toBe(false);
  });

  it('normalizes invalid master seeds', () => {
    expect(deriveStreamSeed(Number.NaN, 'x')).toBe(deriveStreamSeed(0, 'x'));
    expect(deriveStreamSeed(7.9, 'x')).toBe(deriveStreamSeed(7, 'x'));
  });
});
