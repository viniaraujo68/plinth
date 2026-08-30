/**
 * A fetch wrapper, not a query layer. It has no cache, no polling and no request de-duplication:
 * those belong to whatever the app already uses (TanStack Query, a `load` function, a plain
 * `$effect`). What it does own is the part every hand-rolled client repeats — joining the base
 * URL, sending and reading JSON, injecting auth, and turning a failed response into one typed
 * error the whole app can catch.
 */

/** A failed HTTP response, after the body has been read and reduced to a message. */
export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable backend error code, when the API sent one. */
  readonly code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    // Subclass names are erased by most bundlers' minifiers, and this one shows up in logs.
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * The token for the `Authorization: Bearer` header. Async because the real sources are async:
 * Supabase, Auth0 and Firebase all refresh an expired token inside this call.
 */
export type AuthTokenSource = () => string | Promise<string>;

/**
 * Turns a failed response's parsed body into the message a user reads. The one genuinely
 * app-specific piece: `{ detail }`, `{ error }` and `{ errors: [...] }` are all conventions, not
 * standards, and localizing off an error code lives here too. Returning an empty string falls
 * back to the built-in extraction.
 */
export type ErrorMessageParser = (status: number, body: unknown) => string;

export interface HttpClientOptions {
  /** Prefix for every path: an absolute URL, or a same-origin prefix such as `/api`. */
  baseUrl: string;
  /** `"include"` is the session-cookie case, where the browser holds the credential. */
  credentials?: RequestCredentials;
  auth?: AuthTokenSource;
  parseError?: ErrorMessageParser;
}

export interface HttpClient {
  get: <T = unknown>(path: string) => Promise<T>;
  post: <T = unknown>(path: string, body?: unknown) => Promise<T>;
  put: <T = unknown>(path: string, body?: unknown) => Promise<T>;
  patch: <T = unknown>(path: string, body?: unknown) => Promise<T>;
  del: <T = unknown>(path: string) => Promise<T>;
}

const joinUrl = (baseUrl: string, path: string): string => {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
};

const nonEmpty = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/**
 * Best-effort message from an error body, walking the shapes the two reference backends produce:
 * a bare string, `{ detail }` as a string or as a `{ code, message }` object, FastAPI's 422 list
 * of `{ msg }`, and Go's `{ error }`. Anything it cannot read falls through to the status text,
 * which is why an app with its own envelope supplies `parseError` instead of extending this.
 */
const extractMessage = (body: unknown): string | undefined => {
  if (typeof body === "string") return nonEmpty(body);
  if (Array.isArray(body))
    return nonEmpty(body.map((entry) => extractMessage(entry) ?? "").join("; "));
  const record = asRecord(body);
  if (!record) return undefined;
  for (const key of ["message", "msg", "detail", "error"]) {
    const found = extractMessage(record[key]);
    if (found) return found;
  }
  return undefined;
};

const extractCode = (body: unknown): string | undefined => {
  const record = asRecord(body);
  const code = asRecord(record?.detail)?.code ?? record?.code;
  return typeof code === "string" ? nonEmpty(code) : undefined;
};

/**
 * Build a client bound to one API.
 *
 * ```ts
 * // Session cookie, same-origin FastAPI behind a proxy.
 * const api = createHttpClient({ baseUrl: "/api", credentials: "include" });
 *
 * // Bearer token from an async session, separate origin. `apiUrl` comes from whatever config
 * // module the app already has: this package reads no environment of its own.
 * const api = createHttpClient({
 *   baseUrl: apiUrl,
 *   auth: async () => (await supabase.auth.getSession()).data.session?.access_token ?? "",
 * });
 * ```
 */
export const createHttpClient = ({
  baseUrl,
  credentials,
  auth,
  parseError,
}: HttpClientOptions): HttpClient => {
  const request = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    const headers: Record<string, string> = {};
    // GET and DELETE carry no body, and a `Content-Type` on them makes some CORS setups
    // preflight a request that would otherwise be simple.
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth) {
      const token = await auth();
      // An empty token means "not signed in yet": sending `Bearer ` would turn a 401 the app can
      // reason about into a malformed-header 400 from the gateway.
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(joinUrl(baseUrl, path), {
      method,
      headers,
      credentials,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    // Read as text first: 204 and most DELETEs answer with nothing at all, and `response.json()`
    // throws on an empty body. A non-JSON body (an HTML error page from a proxy) is kept as the
    // string it is, so the message extraction below still has something to show.
    const text = await response.text();
    let parsed: unknown = undefined;
    if (text)
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }

    if (!response.ok) {
      const message =
        nonEmpty(parseError?.(response.status, parsed)) ??
        extractMessage(parsed) ??
        nonEmpty(response.statusText) ??
        `HTTP ${response.status}`;
      throw new ApiError(response.status, message, extractCode(parsed));
    }

    // `undefined` for an empty body, never `null`: JSON `null` is a value a server can legitimately
    // send, and collapsing the two would hide the difference from the caller's type.
    return parsed as T;
  };

  // `body` is `unknown` rather than a structural JSON type on purpose: a TypeScript interface has
  // no implicit index signature, so the app's own DTO interfaces would fail to satisfy one.
  // A body always goes out, even when the caller passes none — a bodyless POST is a 422 against a
  // FastAPI endpoint that declares a model, and `{}` is the harmless stand-in both references use.
  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {}),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
    del: <T>(path: string) => request<T>("DELETE", path),
  };
};

/**
 * Message of a caught value. A `catch` binding is `unknown`, and narrowing it once here beats
 * repeating the check at every call site; the `String(e)` fallback means a stray non-`Error`
 * still reaches the user as text instead of `undefined`.
 */
export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * HTTP status of a caught value, or `0` for anything that did not come from the API — lets a
 * caller special-case 403 or 404 without an `instanceof` dance.
 */
export const errorStatus = (error: unknown): number =>
  error instanceof ApiError ? error.status : 0;
