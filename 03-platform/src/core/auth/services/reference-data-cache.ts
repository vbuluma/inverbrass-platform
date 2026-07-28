/**
 * Purpose:
 * In-process cache for reference catalogue reads.
 *
 * Design rationale:
 * Supabase session poolers allow very few concurrent connections. Caching
 * stable catalogues reduces pool pressure and keeps auth selectors working
 * when a transient ECONNABORTED occurs after a successful prior load.
 */

const DEFAULT_TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  data: T;
  loadedAt: number;
  ttlMs: number;
};

const store = new Map<string, CacheEntry<unknown>>();

export function getReferenceCacheEntry<T>(key: string): CacheEntry<T> | null {
  const entry = store.get(key);
  if (!entry) {
    return null;
  }

  return entry as CacheEntry<T>;
}

export function isReferenceCacheFresh<T>(
  entry: CacheEntry<T> | null
): boolean {
  if (!entry) {
    return false;
  }

  return Date.now() - entry.loadedAt < entry.ttlMs;
}

export function setReferenceCache<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  store.set(key, { data, loadedAt: Date.now(), ttlMs });
}

export function clearReferenceCache(key?: string): void {
  if (key) {
    store.delete(key);
    return;
  }

  store.clear();
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
