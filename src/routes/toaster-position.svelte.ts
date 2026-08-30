import type { ToastPosition } from "$lib/toast/index.js";

/**
 * Showcase-only glue. The `Toaster` is mounted once in the root layout, the way an app does it,
 * but the position picker that demonstrates its placement lives on the toast page — so the two
 * need one piece of state between them. An app has no such need: it picks a position and passes
 * it as a prop.
 */
export const toasterPosition = $state<{ value: ToastPosition }>({ value: "bottom-end" });
