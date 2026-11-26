import { describe, expect, it, vi } from 'vitest';
import { Emitter } from './emitter';

interface TestEvents {
  ping: number;
  message: { text: string };
}

describe('Emitter', () => {
  it('delivers typed payloads to listeners in order', () => {
    const emitter = new Emitter<TestEvents>();
    const seen: string[] = [];
    emitter.on('ping', (value) => seen.push(`first:${value}`));
    emitter.on('ping', (value) => seen.push(`second:${value}`));
    emitter.emit('ping', 7);
    expect(seen).toEqual(['first:7', 'second:7']);
    emitter.emit('message', { text: 'hello' });
  });

  it('removes listeners by reference or unsubscribe function', () => {
    const emitter = new Emitter<TestEvents>();
    const handler = vi.fn<(value: number) => void>();
    const unsubscribe = emitter.on('ping', handler);
    emitter.emit('ping', 1);
    unsubscribe();
    emitter.emit('ping', 2);
    expect(handler).toHaveBeenCalledTimes(1);

    const other = vi.fn<(value: number) => void>();
    emitter.on('ping', other);
    emitter.off('ping', other);
    emitter.emit('ping', 3);
    expect(other).not.toHaveBeenCalled();
  });

  it('calls once handlers a single time', () => {
    const emitter = new Emitter<TestEvents>();
    const handler = vi.fn<(payload: { text: string }) => void>();
    emitter.once('message', handler);
    emitter.emit('message', { text: 'one' });
    emitter.emit('message', { text: 'two' });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ text: 'one' });
  });

  it('supports cancelling once handlers', () => {
    const emitter = new Emitter<TestEvents>();
    const handler = vi.fn<(value: number) => void>();
    const cancel = emitter.once('ping', handler);
    cancel();
    emitter.emit('ping', 1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('clears one event or all events', () => {
    const emitter = new Emitter<TestEvents>();
    const ping = vi.fn<(value: number) => void>();
    const message = vi.fn<(payload: { text: string }) => void>();
    emitter.on('ping', ping);
    emitter.on('message', message);
    emitter.clear('ping');
    emitter.emit('ping', 1);
    emitter.emit('message', { text: 'x' });
    expect(ping).not.toHaveBeenCalled();
    expect(message).toHaveBeenCalledTimes(1);
    emitter.clear();
    emitter.emit('message', { text: 'y' });
    expect(message).toHaveBeenCalledTimes(1);
  });

  it('does not break when listeners unsubscribe during emit', () => {
    const emitter = new Emitter<TestEvents>();
    const second = vi.fn<(value: number) => void>();
    const unsubscribe = emitter.on('ping', second);
    emitter.on('ping', () => unsubscribe());
    expect(() => emitter.emit('ping', 1)).not.toThrow();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
