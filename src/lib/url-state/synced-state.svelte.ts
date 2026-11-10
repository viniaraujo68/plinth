import { untrack } from "svelte";
import type { ExternalStore, StateCodec } from "./codec.js";

export interface SyncedStateOptions<State, Serialized = never> {
  codec: StateCodec<State, Serialized>;
  store?: ExternalStore<Serialized>;
  onSynced?: () => void;
  resetOnCommit?: readonly (keyof State)[];
}

export class SyncedState<State, Serialized = never> {
  draft: State;
  committed: State;

  readonly #codec: StateCodec<State, Serialized>;
  readonly #store: ExternalStore<Serialized> | undefined;
  readonly #onSynced: (() => void) | undefined;
  readonly #resetOnCommit: readonly (keyof State)[];
  #hasSynced = false;

  constructor(options: SyncedStateOptions<State, Serialized>) {
    this.#codec = options.codec;
    this.#store = options.store;
    this.#onSynced = options.onSynced;
    this.#resetOnCommit = options.resetOnCommit ?? [];

    const initial = this.#codec.createDefault();
    this.draft = $state(structuredClone(initial));
    this.committed = $state(structuredClone(initial));

    this.#store?.subscribe(this.#syncFromStore);
  }

  get isDirty(): boolean {
    return this.#identity(this.#snapshot(this.draft)) !== this.key();
  }

  commit = (): void => {
    const previous = this.#snapshot(this.committed);
    const drafted = this.#snapshot(this.draft);
    const next = this.#normalize(
      this.#movedBeyondResetFields(previous, drafted) ? this.#withResetFields(drafted) : drafted,
    );
    this.committed = next;
    this.draft = structuredClone(next);
    this.#writeStore();
  };

  update = (change: (state: State) => State): void => {
    const previous = this.#snapshot(this.committed);
    const committed = this.#snapshot(change(this.#snapshot(this.committed)));
    const draft = this.#snapshot(change(this.#snapshot(this.draft)));
    const moved = this.#movedBeyondResetFields(previous, committed);
    this.committed = this.#normalize(moved ? this.#withResetFields(committed) : committed);
    this.draft = moved ? this.#withResetFields(draft) : draft;
    this.#writeStore();
  };

  reset = (): void => {
    const defaults = this.#codec.createDefault();
    this.committed = structuredClone(defaults);
    this.draft = structuredClone(defaults);
    this.#writeStore();
  };

  revert = (): void => {
    this.draft = this.#snapshot(this.committed);
  };

  normalized = (): State => this.#normalize(this.#snapshot(this.committed));

  key = (): string => this.#codec.key(this.normalized());

  #syncFromStore = (): void => {
    if (this.#store === undefined) return;
    const incoming = this.#normalize(this.#codec.parse(this.#store.read()));
    if (this.#hasSynced && this.#identity(incoming) === this.key()) return;
    this.#hasSynced = true;
    this.committed = incoming;
    this.draft = structuredClone(incoming);
    if (this.#onSynced) untrack(this.#onSynced);
  };

  #writeStore(): void {
    this.#store?.write(this.#codec.serialize(this.normalized()));
  }

  #movedBeyondResetFields(previous: State, next: State): boolean {
    if (this.#resetOnCommit.length === 0) return false;
    return (
      this.#identity(this.#withResetFields(previous)) !==
      this.#identity(this.#withResetFields(next))
    );
  }

  #withResetFields(state: State): State {
    const defaults = this.#codec.createDefault();
    const result = structuredClone(state);
    for (const field of this.#resetOnCommit) result[field] = defaults[field];
    return result;
  }

  #identity(state: State): string {
    return this.#codec.key(this.#normalize(state));
  }

  #normalize(state: State): State {
    return this.#codec.normalize ? this.#codec.normalize(state) : state;
  }

  #snapshot(value: State): State {
    return $state.snapshot(value) as State;
  }
}
