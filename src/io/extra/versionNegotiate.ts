/** Importer version selection with explicit reasons for unsupported versions. */

export const SUPPORTED_IMPORT_VERSIONS = [1, 2] as const;
export const LATEST_IMPORT_VERSION = 2;

export interface VersionNegotiation {
  readonly supported: boolean;
  readonly requested: number | null;
  readonly selected: number | null;
  readonly reason: string;
}

function sortVersions(versions: readonly number[]): number[] {
  return [...new Set(versions.filter((version) => Number.isInteger(version)))].sort(
    (left, right) => left - right,
  );
}

export function negotiateImporterVersion(
  requested: unknown,
  supported: readonly number[] = SUPPORTED_IMPORT_VERSIONS,
): VersionNegotiation {
  const versions = sortVersions(supported);
  if (versions.length === 0) {
    return { supported: false, requested: null, selected: null, reason: 'No importer versions are configured' };
  }
  if (typeof requested !== 'number' || !Number.isInteger(requested)) {
    return { supported: false, requested: null, selected: null, reason: 'Requested version must be an integer' };
  }

  if (versions.includes(requested)) {
    return {
      supported: true,
      requested,
      selected: requested,
      reason: `Importer version ${requested} is supported`,
    };
  }

  const minimum = versions[0] ?? 0;
  const maximum = versions[versions.length - 1] ?? 0;
  if (requested > maximum) {
    return {
      supported: false,
      requested,
      selected: null,
      reason: `Version ${requested} is newer than the maximum supported version ${maximum}`,
    };
  }
  if (requested < minimum) {
    return {
      supported: false,
      requested,
      selected: null,
      reason: `Version ${requested} is older than the minimum supported version ${minimum}`,
    };
  }

  const fallback = [...versions].reverse().find((version) => version < requested) ?? null;
  return {
    supported: false,
    requested,
    selected: fallback,
    reason:
      fallback === null
        ? `Version ${requested} is not supported`
        : `Version ${requested} is not supported; using compatible importer version ${fallback}`,
  };
}

export function explainUnsupportedVersion(
  requested: unknown,
  supported: readonly number[] = SUPPORTED_IMPORT_VERSIONS,
): string {
  const negotiation = negotiateImporterVersion(requested, supported);
  return negotiation.supported ? '' : negotiation.reason;
}
