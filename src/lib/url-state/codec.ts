export interface StateCodec<State, Serialized> {
  createDefault: () => State;
  serialize: (state: State) => Serialized;
  parse: (serialized: Serialized) => State;
  key: (state: State) => string;
  normalize?: (state: State) => State;
}

export interface UrlStateCodec<State> extends StateCodec<State, URLSearchParams> {
  ownedParams: () => string[];
}

export interface ExternalStore<Serialized> {
  read: () => Serialized;
  write: (serialized: Serialized) => void;
  subscribe: (onChange: () => void) => void;
}
