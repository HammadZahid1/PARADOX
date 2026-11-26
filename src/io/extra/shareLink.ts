/** Compact, URL-safe share links for scenario summaries. */

import { isPlainObject } from '@/utils/clone';
import { stableStringify } from '@/utils/stableStringify';

export const SHARE_LINK_PREFIX = 'p1.';

export interface ScenarioSummary {
  readonly id: string;
  readonly name: string;
  readonly seed: number;
  readonly steps: number;
  readonly variables: readonly string[];
}

export type ScenarioSummaryDecodeResult =
  | { readonly kind: 'ok'; readonly value: ScenarioSummary }
  | { readonly kind: 'err'; readonly message: string };

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const LOOKUP = new Map<string, number>([...ALPHABET].map((char, index) => [char, index]));
const SUMMARY_KEYS = ['id', 'name', 'seed', 'steps', 'variables'];

function encodeUtf8(text: string): number[] {
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    let code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (next !== undefined && next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      } else {
        code = 0xfffd;
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      code = 0xfffd;
    }
    if (code <= 0x7f) {
      bytes.push(code);
    } else if (code <= 0x7ff) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code <= 0xffff) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

function decodeUtf8(bytes: readonly number[]): string | null {
  const characters: string[] = [];
  let index = 0;
  while (index < bytes.length) {
    const first = bytes[index] ?? 0;
    let code: number;
    let continuation: number;
    let minimum: number;
    if (first <= 0x7f) {
      code = first;
      continuation = 0;
      minimum = 0;
    } else if (first >= 0xc2 && first <= 0xdf) {
      code = first & 0x1f;
      continuation = 1;
      minimum = 0x80;
    } else if (first >= 0xe0 && first <= 0xef) {
      code = first & 0x0f;
      continuation = 2;
      minimum = 0x800;
    } else if (first >= 0xf0 && first <= 0xf4) {
      code = first & 0x07;
      continuation = 3;
      minimum = 0x10000;
    } else {
      return null;
    }
    if (index + continuation >= bytes.length) return null;
    for (let offset = 1; offset <= continuation; offset += 1) {
      const byte = bytes[index + offset] ?? 0;
      if ((byte & 0xc0) !== 0x80) return null;
      code = (code << 6) | (byte & 0x3f);
    }
    if (code < minimum || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return null;
    characters.push(String.fromCodePoint(code));
    index += continuation + 1;
  }
  return characters.join('');
}

function encodeBase64Url(bytes: readonly number[]): string {
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = index + 1 < bytes.length ? bytes[index + 1] ?? 0 : null;
    const third = index + 2 < bytes.length ? bytes[index + 2] ?? 0 : null;
    const group = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    result += ALPHABET[(group >> 18) & 0x3f];
    result += ALPHABET[(group >> 12) & 0x3f];
    if (second !== null) result += ALPHABET[(group >> 6) & 0x3f];
    if (third !== null) result += ALPHABET[group & 0x3f];
  }
  return result;
}

function decodeBase64Url(token: string): number[] | null {
  if (token.length % 4 === 1) return null;
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of token) {
    const value = LOOKUP.get(char);
    if (value === undefined) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  if (bits > 0 && (buffer & ((1 << bits) - 1)) !== 0) return null;
  return bytes;
}

export function validateScenarioSummary(value: unknown): ScenarioSummary | null {
  if (!isPlainObject(value)) return null;
  const keys = Object.keys(value).sort();
  if (keys.length !== SUMMARY_KEYS.length || keys.some((key, index) => key !== SUMMARY_KEYS[index])) {
    return null;
  }
  const id = value['id'];
  const name = value['name'];
  const seed = value['seed'];
  const steps = value['steps'];
  const variables = value['variables'];
  if (typeof id !== 'string' || id.length === 0) return null;
  if (typeof name !== 'string' || name.length === 0) return null;
  if (typeof seed !== 'number' || !Number.isInteger(seed)) return null;
  if (typeof steps !== 'number' || !Number.isInteger(steps) || steps <= 0) return null;
  if (!Array.isArray(variables)) return null;

  const names: string[] = [];
  for (const variable of variables) {
    if (typeof variable !== 'string' || variable.length === 0 || names.includes(variable)) {
      return null;
    }
    names.push(variable);
  }
  return { id, name, seed, steps, variables: names };
}

export function encodeScenarioSummary(summary: ScenarioSummary): string {
  const valid = validateScenarioSummary(summary);
  if (valid === null) throw new Error('Invalid scenario summary');
  const payload = stableStringify({
    id: valid.id,
    name: valid.name,
    seed: valid.seed,
    steps: valid.steps,
    variables: [...valid.variables],
  });
  return `${SHARE_LINK_PREFIX}${encodeBase64Url(encodeUtf8(payload))}`;
}

export function decodeScenarioSummary(token: string): ScenarioSummaryDecodeResult {
  if (!token.startsWith(SHARE_LINK_PREFIX)) {
    return { kind: 'err', message: 'Unsupported share link prefix' };
  }
  const payload = token.slice(SHARE_LINK_PREFIX.length);
  if (payload.length === 0) return { kind: 'err', message: 'Empty share link payload' };

  const bytes = decodeBase64Url(payload);
  if (bytes === null) return { kind: 'err', message: 'Invalid base64url payload' };
  const json = decodeUtf8(bytes);
  if (json === null) return { kind: 'err', message: 'Invalid UTF-8 payload' };

  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    return { kind: 'err', message: 'Invalid JSON payload' };
  }
  const summary = validateScenarioSummary(value);
  if (summary === null) return { kind: 'err', message: 'Invalid scenario summary fields' };
  if (encodeScenarioSummary(summary) !== token) {
    return { kind: 'err', message: 'Non-canonical share link' };
  }
  return { kind: 'ok', value: summary };
}

export function isValidShareLink(token: string): boolean {
  return decodeScenarioSummary(token).kind === 'ok';
}
