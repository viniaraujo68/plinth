export { default as AsyncButton } from "./AsyncButton.svelte";
export { default as Combobox } from "./Combobox.svelte";
export { default as Copyable } from "./Copyable.svelte";
export { default as DateRangePicker } from "./DateRangePicker.svelte";
export { default as Dialog } from "./Dialog.svelte";
export { default as DragHandle } from "./DragHandle.svelte";
export { default as Dropdown } from "./Dropdown.svelte";
export { default as ErrorDisplay } from "./ErrorDisplay.svelte";
export { default as ErrorPage } from "./ErrorPage.svelte";
export { default as JsonInput } from "./JsonInput.svelte";
export { default as JsonView } from "./JsonView.svelte";
export { default as VirtualJsonView } from "./VirtualJsonView.svelte";
export { default as Listbox } from "./Listbox.svelte";
export { default as LoadingButton } from "./LoadingButton.svelte";
export { default as Logo } from "./Logo.svelte";
export { default as Modal } from "./Modal.svelte";
export { default as MultiSelect } from "./MultiSelect.svelte";
export {
  default as Paginator,
  DEFAULT_PAGINATOR_LABELS,
  type PaginatorLabels,
} from "./Paginator.svelte";
export { default as RefreshButton } from "./RefreshButton.svelte";
export { default as RequestErrorDisplay } from "./RequestErrorDisplay.svelte";
export { default as SegmentedControl } from "./SegmentedControl.svelte";
export { default as Select } from "./Select.svelte";
export { default as Skeleton } from "./Skeleton.svelte";
export { default as Tabs } from "./Tabs.svelte";
export { default as Tooltip } from "./Tooltip.svelte";

// The mark's outline as data. `Logo` already reads it from here, and an app that wants the same
// silhouette -- a placeholder cut to the pick, a mark of its own -- has no other way to get it than
// copying the curve out of the library, which is how two versions of one shape start existing.
// Not for avatars: a profile picture cut to anything but a disc reads as a badge.
export { PICK_CLIP_PATH, PICK_PATH } from "./pick.js";

// The half of `date-range.js` a consumer of the picker has a use for: the prop types, the preset
// list, the calendar preset builders and the reserved id they are written against, and the
// conversions anyone pairing their own field with a `DateRange` has to repeat otherwise. The rest -- the selection
// anchor, the pair validator and the re-anchor clock -- is how the picker drives itself, and the
// picker never emits a pair that would fail the validator.
export {
  allTime,
  buildRange,
  CUSTOM_PRESET_ID,
  DEFAULT_PRESETS,
  isoToLocalInput,
  lastMonth,
  lastMonths,
  localInputToIso,
  thisMonth,
  toDay,
  type CalendarPreset,
  type DateRange,
  type DateRangeMode,
  type DateRangePreset,
  type DurationPreset,
} from "./date-range.js";

// The half of `select.ts` a consumer has a use for: the option type every caller of either
// control has to name, and the default matcher, so widening the search -- matching the value too,
// a synonym list -- can compose with the accent folding instead of reimplementing it. The
// highlight walk stays private: it is how the two components drive themselves.
export { matchesSelectQuery, normalizeForSearch, type SelectOption } from "./select.js";

export {
  formatJsonText,
  parseJsonText,
  type JsonTextOptions,
  type JsonTextResult,
} from "./json-text.js";

export { DEFAULT_JSON_VIEW_LABELS, type JsonViewLabels } from "./json-view.js";

export {
  DEFAULT_REQUEST_ERROR_COPY,
  type RequestErrorCopy,
  type RequestErrorLabels,
} from "./request-error.js";

// The option type a caller of `SegmentedControl` writes its list against.
export type { SegmentedOption } from "./segmented.js";

// The item type a caller of `Tabs` writes its list against.
export type { TabItem } from "./tabs.js";
