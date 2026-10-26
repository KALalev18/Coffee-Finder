interface Entry<V> {
  value: Promise<V>;
  expiresAt: number;
}

/**
 * In-memory cache with a time-to-live and least-recently-used eviction.
 *
 * It stores promises rather than values, so concurrent requests for the same key
 * share one upstream call (request coalescing). Failed loads are not cached.
 */
export class TtlCache<V> {
  private readonly entries = new Map<string, Entry<V>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries: number,
    private readonly now: () => number = Date.now,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  async getOrLoad(key: string, load: () => Promise<V>): Promise<{ value: V; hit: boolean }> {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > this.now()) {
      // Map keeps insertion order, so re-inserting marks the key as most recently used.
      this.entries.delete(key);
      this.entries.set(key, existing);
      return { value: await existing.value, hit: true };
    }

    const entry: Entry<V> = { value: load(), expiresAt: this.now() + this.ttlMs };
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) {
      this.entries.delete(this.entries.keys().next().value!);
    }

    try {
      return { value: await entry.value, hit: false };
    } catch (err) {
      if (this.entries.get(key) === entry) this.entries.delete(key);
      throw err;
    }
  }
}
