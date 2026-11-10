export class KeyedCache<K, V> {
  readonly #entries = new Map<K, V>();

  get(key: K): V | undefined {
    return this.#entries.get(key);
  }

  set(key: K, value: V): void {
    this.#entries.set(key, value);
  }

  getOrCreate(key: K, create: (key: K) => V): V {
    const existing = this.#entries.get(key);
    if (existing !== undefined) return existing;
    const created = create(key);
    this.#entries.set(key, created);
    return created;
  }

  clear(): void {
    this.#entries.clear();
  }
}
