/** Estimates persistent storage consumption without requiring a service worker. */

export interface StorageUsageEstimate {
  usage: number;
  quota: number;
  ratio: number;
}

function finalize(usage: number, quota: number): StorageUsageEstimate {
  const safeUsage = Number.isFinite(usage) && usage > 0 ? usage : 0;
  const safeQuota = Number.isFinite(quota) && quota > 0 ? quota : 0;
  return {
    usage: safeUsage,
    quota: safeQuota,
    ratio: safeQuota > 0 ? safeUsage / safeQuota : 0,
  };
}

async function browserEstimate(): Promise<StorageEstimate | null> {
  if (typeof navigator === 'undefined') return null;
  const storage = navigator.storage;
  if (!storage || typeof storage.estimate !== 'function') return null;
  try {
    return await storage.estimate();
  } catch {
    return null;
  }
}

/** UTF-16 byte count of all localStorage keys and values (2 bytes per code unit). */
export function estimateLocalStorageByteLength(): number {
  if (typeof localStorage === 'undefined') return 0;
  try {
    let bytes = 0;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key === null) continue;
      const value = localStorage.getItem(key) ?? '';
      bytes += (key.length + value.length) * 2;
    }
    return bytes;
  } catch {
    return 0;
  }
}

export async function estimateStorageUsage(): Promise<StorageUsageEstimate> {
  const estimate = await browserEstimate();
  if (estimate && typeof estimate.usage === 'number' && typeof estimate.quota === 'number') {
    return finalize(estimate.usage, estimate.quota);
  }
  return finalize(estimateLocalStorageByteLength(), 0);
}
