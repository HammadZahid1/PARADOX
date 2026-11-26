/** Minimal Result type for operations that can fail without throwing. */

export type Result<T, E> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'err'; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { kind: 'ok', value };
}

export function err<E>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

export function isOk<T, E>(result: Result<T, E>): result is { readonly kind: 'ok'; readonly value: T } {
  return result.kind === 'ok';
}

export function isErr<T, E>(result: Result<T, E>): result is { readonly kind: 'err'; readonly error: E } {
  return result.kind === 'err';
}

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return isOk(result) ? result.value : fallback;
}

export function mapResult<T, U, E>(result: Result<T, E>, transform: (value: T) => U): Result<U, E> {
  return isOk(result) ? ok(transform(result.value)) : result;
}

export function flatMapResult<T, U, E, F>(
  result: Result<T, E>,
  transform: (value: T) => Result<U, F>,
): Result<U, E | F> {
  return isOk(result) ? transform(result.value) : result;
}
