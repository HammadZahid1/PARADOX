/** Unknown-field warnings for imported JSON objects. */

import { isPlainObject } from '@/utils/clone';

export interface UnknownFieldWarning {
  readonly path: string;
  readonly key: string;
  readonly message: string;
}

export interface ImportFieldSchema {
  readonly keys: ReadonlySet<string>;
  readonly children?: Readonly<Record<string, ImportFieldSchema>>;
}

export function createAllowedKeySet(keys: readonly string[]): ReadonlySet<string> {
  return new Set(keys);
}

function joinPath(path: string, segment: string): string {
  if (path.length === 0) return segment;
  return /^[A-Za-z_$][\w$]*$/.test(segment) ? `${path}.${segment}` : `${path}[${JSON.stringify(segment)}]`;
}

function unknownWarning(path: string, key: string): UnknownFieldWarning {
  const location = path.length === 0 ? 'root' : path;
  return { path: joinPath(path, key), key, message: `Unknown field '${key}' at ${location}` };
}

/** Report top-level fields that are not in the allowed set. */
export function collectUnknownFieldWarnings(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
  path = '',
): readonly UnknownFieldWarning[] {
  if (!isPlainObject(value)) return [];
  return Object.keys(value)
    .sort()
    .filter((key) => !allowedKeys.has(key))
    .map((key) => unknownWarning(path, key));
}

/** Recursively report unknown fields using a schema keyed by property path. */
export function collectDeepUnknownFieldWarnings(
  value: unknown,
  schema: ImportFieldSchema,
  path = '',
): readonly UnknownFieldWarning[] {
  if (Array.isArray(value)) {
    const warnings: UnknownFieldWarning[] = [];
    for (let index = 0; index < value.length; index += 1) {
      warnings.push(...collectDeepUnknownFieldWarnings(value[index], schema, `${path}[${index}]`));
    }
    return warnings;
  }
  if (!isPlainObject(value)) return [];

  const warnings: UnknownFieldWarning[] = [];
  for (const key of Object.keys(value).sort()) {
    if (!schema.keys.has(key)) {
      warnings.push(unknownWarning(path, key));
      continue;
    }
    const child = schema.children?.[key];
    if (child !== undefined) {
      warnings.push(...collectDeepUnknownFieldWarnings(value[key], child, joinPath(path, key)));
    }
  }
  return warnings;
}
