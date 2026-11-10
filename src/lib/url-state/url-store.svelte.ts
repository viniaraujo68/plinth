import { goto } from "$app/navigation";
import { page } from "$app/state";
import { BROWSER } from "esm-env";
import { untrack } from "svelte";
import type { ExternalStore, UrlStateCodec } from "./codec.js";
import { pickParams, sameLocation, withOwnedParams } from "./search-params.js";
import { SyncedState } from "./synced-state.svelte.js";

export type ReplaceHistory =
  boolean | ((previous: URLSearchParams, next: URLSearchParams) => boolean);

export interface UrlStoreOptions {
  replace?: ReplaceHistory;
}

interface PendingWrite {
  href: string;
  replace: boolean;
}

let pendingWrite: PendingWrite | undefined;

const currentUrl = (): URL => new URL(pendingWrite?.href ?? page.url.href);

export const urlStore = (
  ownedParams: readonly string[],
  options: UrlStoreOptions = {},
): ExternalStore<URLSearchParams> => {
  const { replace = false } = options;
  let lastSeenHref: string | undefined;

  const replaces = (previous: URLSearchParams, next: URLSearchParams): boolean =>
    typeof replace === "function" ? replace(previous, next) : replace;

  return {
    read: () => currentUrl().searchParams,

    write: (params) => {
      if (!BROWSER) return;
      const base = currentUrl();
      const target = withOwnedParams(base, ownedParams, params);
      if (sameLocation(base, target)) return;

      const write: PendingWrite = {
        href: target.href,
        replace:
          replaces(pickParams(base.searchParams, ownedParams), params) &&
          (pendingWrite?.replace ?? true),
      };
      lastSeenHref = write.href;
      pendingWrite = write;
      void goto(write.href, {
        keepFocus: true,
        noScroll: true,
        replaceState: write.replace,
      }).finally(() => {
        if (pendingWrite === write) pendingWrite = undefined;
      });
    },

    subscribe: (onChange) => {
      $effect(() => {
        const href = page.url.href;
        if (pendingWrite?.href === href) pendingWrite = undefined;
        if (href === lastSeenHref) return;
        lastSeenHref = href;
        untrack(onChange);
      });
    },
  };
};

export interface UrlStateOptions<State> extends UrlStoreOptions {
  resetOnCommit?: readonly (keyof State)[];
  onSynced?: () => void;
}

export const createUrlState = <State>(
  codec: UrlStateCodec<State>,
  options: UrlStateOptions<State> = {},
): SyncedState<State, URLSearchParams> =>
  new SyncedState({
    codec,
    store: urlStore(codec.ownedParams(), { replace: options.replace }),
    resetOnCommit: options.resetOnCommit,
    onSynced: options.onSynced,
  });
