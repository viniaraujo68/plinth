import { untrack } from "svelte";
import type { WindowedData } from "./windowed-data.svelte.js";
import { Virtualizer, type VirtualizerOptions } from "./virtualizer.svelte.js";

export interface WindowedVirtualizerOptions<Row> extends Omit<VirtualizerOptions, "count"> {
  data: WindowedData<Row>;
}

export class WindowedVirtualizer<Row> extends Virtualizer {
  readonly data: WindowedData<Row>;

  constructor({ data, ...options }: WindowedVirtualizerOptions<Row>) {
    super({ ...options, count: () => data.count });
    this.data = data;

    $effect(() => {
      const items = this.items;
      const first = items.at(0)?.index ?? 0;
      const last = items.at(-1)?.index ?? first;
      data.ensure(first, last);
    });

    let hadRows = false;
    $effect(() => {
      const count = data.count;
      if (count === 0 && hadRows) untrack(() => this.clearMeasurements());
      hadRows = count > 0;
    });
  }
}
