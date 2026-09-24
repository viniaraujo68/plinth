/** One choice of a `SegmentedControl`. `id` is the value the control reports. */
export interface SegmentedOption<Id extends string = string> {
  id: Id;
  label: string;
  /** Shown but not pickable — a view that exists but has nothing to show right now. */
  disabled?: boolean;
}
