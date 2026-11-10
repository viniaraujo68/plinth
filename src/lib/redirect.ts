/**
 * The `?next=` round trip of a sign-in page: where a guard sends a visitor who is not signed in,
 * and where the sign-in page may send them back to afterwards.
 *
 * The value arrives in a URL anyone can write, so it is attacker-controlled. Handed straight to
 * `goto` or `location`, `?next=//evil.example` would send someone who just typed their password to
 * another site — an open redirect, the first step of most credential phishing.
 */

/** A base no real link can point at, used only to let the URL parser resolve a candidate path. */
const PROBE_ORIGIN = "https://plinth.invalid";

/**
 * `value` when it is a path on this site, normalised; `null` for anything else.
 *
 * A leading `/` is not enough on its own: `//evil.example` and `/\evil.example` are
 * protocol-relative to a browser, and the URL parser drops tabs and line breaks before it reads a
 * URL at all, so `/<tab>/evil.example` turns into one of them on the way in. Rather than chase every
 * spelling, the candidate is resolved the way the browser would resolve it and kept only if it
 * stays on the same origin.
 */
export const safeNext = (value: string | null | undefined): string | null => {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== PROBE_ORIGIN) return null;
  return `${url.pathname}${url.search}${url.hash}`;
};

export interface LoginUrlOptions {
  /** The sign-in page. Defaults to `/login`. */
  path?: string;
  /** The search parameter the return path travels in. Defaults to `next`. */
  param?: string;
}

/**
 * Where a guard sends a visitor who has to sign in first: the sign-in page, carrying the current
 * path so it can send them back.
 *
 * Only the path travels. The query string is dropped on purpose: it is where share tokens and
 * one-off codes live, and a sign-in URL gets logged, bookmarked and pasted far more than the page
 * it came from. Nothing is carried from the site root or from the sign-in page itself, where
 * "come back here" means nothing.
 */
export const loginUrl = (
  current: URL | string,
  { path = "/login", param = "next" }: LoginUrlOptions = {},
): string => {
  const pathname =
    typeof current === "string" ? new URL(current, PROBE_ORIGIN).pathname : current.pathname;
  if (pathname === "/" || pathname === path) return path;
  return `${path}?${param}=${encodeURIComponent(pathname)}`;
};

/**
 * `base` carrying `next` along — the link between the sign-in and the sign-up pages, so the
 * return path survives a visitor who picked the wrong one first. `next` is checked again here, so
 * an unchecked value cannot slip through a link built from it.
 */
export const withNext = (base: string, next: string | null | undefined, param = "next"): string => {
  const safe = safeNext(next);
  if (!safe) return base;
  return `${base}${base.includes("?") ? "&" : "?"}${param}=${encodeURIComponent(safe)}`;
};
