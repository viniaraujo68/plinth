export interface DataListLabels {
  loading: string;
  empty: string;
  error: string;
  retry: string;
}

export const DEFAULT_DATA_LIST_LABELS: DataListLabels = {
  loading: "Loading",
  empty: "Nothing to show",
  error: "Some rows could not be loaded.",
  retry: "Retry",
};

export interface DataListFailure {
  error: unknown;
  pages: number[];
  retry: () => void;
}
