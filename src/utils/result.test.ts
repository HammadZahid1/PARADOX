import { describe, expect, it } from 'vitest';
import { err, flatMapResult, isErr, isOk, mapResult, ok, type Result, unwrapOr } from './result';

describe('Result helpers', () => {
  it('constructs and narrows success and failure values', () => {
    const success = ok(7);
    const failure = err('missing');
    expect(isOk(success)).toBe(true);
    expect(isErr(failure)).toBe(true);
    if (isOk(success)) expect(success.value).toBe(7);
    if (isErr(failure)) expect(failure.error).toBe('missing');
    expect(success.kind).toBe('ok');
    expect(failure.kind).toBe('err');
  });

  it('unwraps with a fallback', () => {
    const failure: Result<number, string> = err('bad');
    expect(unwrapOr(ok(3), 0)).toBe(3);
    expect(unwrapOr(failure, 0)).toBe(0);
  });

  it('maps success values and preserves errors', () => {
    expect(mapResult(ok(4), (value) => value * 2)).toEqual(ok(8));
    const failure: Result<string, string> = err('bad');
    expect(mapResult(failure, (value) => value.length)).toBe(failure);
  });

  it('flat-maps chained results', () => {
    const parse = (text: string): Result<number, string> =>
      Number.isNaN(Number(text)) ? err('not a number') : ok(Number(text));
    expect(flatMapResult(ok('9'), parse)).toEqual(ok(9));
    expect(flatMapResult(ok('nope'), parse)).toEqual(err('not a number'));
    const original: Result<string, string> = err('initial');
    expect(flatMapResult(original, parse)).toBe(original);
  });
});
