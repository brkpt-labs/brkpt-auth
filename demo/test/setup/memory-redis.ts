/**
 * In-memory Redis mock for E2E testing.
 * Implements the subset of Redis commands used by brkpt-auth.
 */
export class MemoryRedis {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private sortedSets = new Map<string, Map<string, number>>();

  private isExpired(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  set(
    key: string,
    value: string,
    options?: { expiration?: { type: string; value: number } },
  ): Promise<void> {
    const expiresAt = options?.expiration
      ? Date.now() + options.expiration.value
      : undefined;
    this.store.set(key, { value, expiresAt });
    return Promise.resolve();
  }

  get(key: string): Promise<string | null> {
    if (this.isExpired(key)) return Promise.resolve(null);
    return Promise.resolve(this.store.get(key)?.value ?? null);
  }

  del(key: string): Promise<void> {
    this.store.delete(key);
    this.sortedSets.delete(key);
    return Promise.resolve();
  }

  exists(key: string): Promise<number> {
    return Promise.resolve(this.isExpired(key) ? 0 : 1);
  }

  pTTL(key: string): Promise<number> {
    if (this.isExpired(key)) return Promise.resolve(-2);
    const entry = this.store.get(key);
    if (!entry?.expiresAt) return Promise.resolve(-1);
    return Promise.resolve(entry.expiresAt - Date.now());
  }

  zAdd(key: string, member: { score: number; value: string }): Promise<void> {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    this.sortedSets.get(key)!.set(member.value, member.score);
    return Promise.resolve();
  }

  zRem(key: string, member: string): Promise<void> {
    this.sortedSets.get(key)?.delete(member);
    return Promise.resolve();
  }

  zRange(key: string, min: number, max: number): Promise<string[]> {
    const set = this.sortedSets.get(key);
    if (!set) return Promise.resolve([]);
    const entries = [...set.entries()].sort((a, b) => a[1] - b[1]);
    if (max === -1) return Promise.resolve(entries.map(([k]) => k));
    return Promise.resolve(entries.slice(min, max + 1).map(([k]) => k));
  }

  zRemRangeByScore(
    key: string,
    min: string | number,
    max: string | number,
  ): Promise<void> {
    const set = this.sortedSets.get(key);
    if (!set) return Promise.resolve();
    const minScore = min === '-inf' ? -Infinity : Number(min);
    const maxScore = max === '+inf' ? Infinity : Number(max);
    for (const [member, score] of set.entries()) {
      if (score >= minScore && score <= maxScore) {
        set.delete(member);
      }
    }
    return Promise.resolve();
  }

  clear(): void {
    this.store.clear();
    this.sortedSets.clear();
  }
}
