export class SizeTree {
  readonly length: number;
  readonly #sizes: Float64Array;
  readonly #sums: Float64Array;
  readonly #topStep: number;

  constructor(sizes: ArrayLike<number>) {
    const length = sizes.length;
    this.length = length;
    this.#sizes = Float64Array.from(sizes);
    this.#sums = new Float64Array(length + 1);
    for (let node = 1; node <= length; node++) {
      this.#sums[node] += this.#sizes[node - 1];
      const parent = node + (node & -node);
      if (parent <= length) this.#sums[parent] += this.#sums[node];
    }
    this.#topStep = length === 0 ? 0 : 2 ** Math.floor(Math.log2(length));
  }

  get total(): number {
    return this.startOf(this.length);
  }

  sizeAt(index: number): number {
    return index >= 0 && index < this.length ? this.#sizes[index] : 0;
  }

  set(index: number, size: number): boolean {
    if (index < 0 || index >= this.length) return false;
    const delta = size - this.#sizes[index];
    if (delta === 0) return false;
    this.#sizes[index] = size;
    for (let node = index + 1; node <= this.length; node += node & -node) this.#sums[node] += delta;
    return true;
  }

  startOf(index: number): number {
    let sum = 0;
    for (let node = Math.min(Math.max(0, index), this.length); node > 0; node -= node & -node)
      sum += this.#sums[node];
    return sum;
  }

  indexAt(offset: number): number {
    if (this.length === 0) return -1;
    let position = 0;
    let remaining = offset;
    for (let step = this.#topStep; step > 0; step = Math.floor(step / 2)) {
      const next = position + step;
      if (next <= this.length && this.#sums[next] <= remaining) {
        position = next;
        remaining -= this.#sums[next];
      }
    }
    return Math.min(position, this.length - 1);
  }
}
