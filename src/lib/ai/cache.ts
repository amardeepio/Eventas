interface Entry<T> { value: T; expiresAt: number }

/** Bounded TTL cache to avoid repeat model calls for identical planning briefs. */
export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>();
  constructor(private readonly maxEntries = 100, private readonly ttlMs = 3_600_000) {}

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) { this.entries.delete(key); return undefined; }
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}
