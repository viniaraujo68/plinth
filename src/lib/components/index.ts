export { default as AsyncButton } from "./AsyncButton.svelte";
export { default as Combobox } from "./Combobox.svelte";
export { default as Copyable } from "./Copyable.svelte";
export { default as DateRangePicker } from "./DateRangePicker.svelte";
export { default as Dialog } from "./Dialog.svelte";
export { default as Dropdown } from "./Dropdown.svelte";
export { default as ErrorDisplay } from "./ErrorDisplay.svelte";
export { default as ErrorPage } from "./ErrorPage.svelte";
export { default as LoadingButton } from "./LoadingButton.svelte";
export { default as Logo } from "./Logo.svelte";
export { default as Modal } from "./Modal.svelte";
export { default as Paginator } from "./Paginator.svelte";
export { default as RefreshButton } from "./RefreshButton.svelte";
export { default as Select } from "./Select.svelte";
export { default as Skeleton } from "./Skeleton.svelte";
export { default as Tooltip } from "./Tooltip.svelte";

// The mark's outline as data. `Logo` and the shell's avatar already read it from here, and an app
// that wants the same silhouette -- a placeholder cut to the pick, an avatar of its own -- has no
// other way to get it than copying the curve out of the library, which is how two versions of one
// shape start existing.
export { PICK_CLIP_PATH, PICK_PATH } from "./pick.js";

// The half of `date-range.js` a consumer of the picker has a use for: the two prop types, the
// preset list and the reserved id they are written against, and the three conversions anyone
// pairing their own field with a `DateRange` has to repeat otherwise. The rest -- the selection
// anchor, the pair validator and the re-anchor clock -- is how the picker drives itself, and the
// picker never emits a pair that would fail the validator.
export {
  buildRange,
  CUSTOM_PRESET_ID,
  DEFAULT_PRESETS,
  isoToLocalInput,
  localInputToIso,
  type DateRange,
  type DateRangePreset,
} from "./date-range.js";

// The half of `select.ts` a consumer has a use for: the option type every caller of either
// control has to name, and the default matcher, so widening the search -- matching the value too,
// a synonym list -- can compose with the accent folding instead of reimplementing it. The
// highlight walk stays private: it is how the two components drive themselves.
export { matchesSelectQuery, normalizeForSearch, type SelectOption } from "./select.js";
