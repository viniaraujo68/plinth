<script lang="ts">
  import { ApiError, createHttpClient, errorMessage, errorStatus } from "$lib/http.js";
  import type { HttpClient } from "$lib/http.js";

  // A host that resolves to nothing. The demo answers every request to it from the interceptor
  // below, so the page stays a static document: no `+server.ts` — this showcase is prerendered
  // and there would be no server behind it in the build.
  const DEMO_BASE = "https://demo.plinth.invalid/api";

  interface Scenario {
    id: string;
    label: string;
    note: string;
    status: number;
    statusText: string;
    body: string | null;
  }

  const SCENARIOS: Scenario[] = [
    {
      id: "ok",
      label: "200 · JSON",
      note: "The body is parsed and returned as the generic the caller asked for.",
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ id: 42, name: "Friday game", buyIn: 20000 }),
    },
    {
      id: "empty",
      label: "204 · no content",
      note: "Nothing came back, so the call resolves to undefined — the reason the body is read as text first.",
      status: 204,
      statusText: "No Content",
      body: null,
    },
    {
      id: "detail",
      label: "403 · { detail }",
      note: "FastAPI's plain-string detail passes through as the server wrote it.",
      status: 403,
      statusText: "Forbidden",
      body: JSON.stringify({ detail: "You are not a player in this session." }),
    },
    {
      id: "validation",
      label: "422 · { detail: [...] }",
      note: "FastAPI's validation list is joined into one sentence — unless parseError has something better to say.",
      status: 422,
      statusText: "Unprocessable Entity",
      body: JSON.stringify({
        detail: [
          { loc: ["body", "buyIn"], msg: "Input should be a valid integer" },
          { loc: ["body", "name"], msg: "Field required" },
        ],
      }),
    },
    {
      id: "coded",
      label: "409 · { detail: { code, message } }",
      note: "A coded error: the message is shown, and the code rides along on ApiError for the app to branch on.",
      status: 409,
      statusText: "Conflict",
      body: JSON.stringify({
        detail: { code: "session_closed", message: "Session already closed." },
      }),
    },
    {
      id: "go",
      label: "500 · { error }",
      note: "The Go/Gin envelope. Same client, same catch — only the shape of the body differs.",
      status: 500,
      statusText: "Internal Server Error",
      body: JSON.stringify({ error: "database unavailable" }),
    },
    {
      id: "html",
      label: "502 · HTML",
      note: "A proxy error page is not JSON at all; it is kept as text so the message is still something.",
      status: 502,
      statusText: "Bad Gateway",
      body: "<html><body><h1>502 Bad Gateway</h1></body></html>",
    },
  ];

  let scenario = $state<Scenario>(SCENARIOS[0]);
  let sent = $state<string | null>(null);
  let outcome = $state<
    | { kind: "ok"; text: string }
    | { kind: "error"; status: number; code: string | undefined; message: string }
    | null
  >(null);

  // The showcase has no backend, so the demo answers itself. Patching the global is deliberately
  // scoped: anything that is not a DEMO_BASE request is handed to the real fetch untouched, and
  // the original is restored on teardown so a navigation away leaves nothing behind. An effect
  // never runs during prerendering, which is what keeps this out of the built HTML.
  $effect(() => {
    const original = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.startsWith(DEMO_BASE)) return original(input, init);

      sent = JSON.stringify(
        {
          url,
          method: init?.method,
          headers: init?.headers,
          credentials: init?.credentials,
          body: init?.body,
        },
        null,
        2,
      );
      const { status, statusText, body } = scenario;
      return Promise.resolve(new Response(body, { status, statusText }));
    };
    return () => {
      globalThis.fetch = original;
    };
  });

  const cookieApi = createHttpClient({ baseUrl: DEMO_BASE, credentials: "include" });

  const bearerApi = createHttpClient({
    baseUrl: DEMO_BASE,
    auth: () => Promise.resolve("eyJhbGciOiJIUzI1NiJ9.demo"),
    // Returning an empty string declines: every status this does not care about falls back to the
    // built-in extraction, so an app only writes the rule it actually has.
    parseError: (status) => (status === 422 ? "Check the highlighted fields." : ""),
  });

  const run = async (client: HttpClient) => {
    outcome = null;
    sent = null;
    try {
      const value = await client.get<unknown>("/sessions/42");
      outcome = {
        kind: "ok",
        text:
          value === undefined
            ? "undefined — the response had no body"
            : JSON.stringify(value, null, 2),
      };
    } catch (error) {
      outcome = {
        kind: "error",
        status: errorStatus(error),
        code: error instanceof ApiError ? error.code : undefined,
        message: errorMessage(error),
      };
    }
  };

  const COOKIE_SNIPPET = `// Same origin, session cookie, FastAPI behind the dev proxy.
export const api = createHttpClient({
  baseUrl: "/api",
  credentials: "include",
});

const session = await api.get<Session>("/sessions/42");`;

  const BEARER_SNIPPET = `// Separate origin, bearer token refreshed by the auth SDK.
export const api = createHttpClient({
  baseUrl: import.meta.env.VITE_API_URL,
  auth: async () => (await supabase.auth.getSession()).data.session?.access_token ?? "",
  parseError: (status, body) =>
    status === 401 ? "Your session expired. Sign in again." : "",
});

await api.post("/trips", { name: "Vegas" });`;
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">http</h1>
    <p class="max-w-2xl text-base-content/70">
      A fetch wrapper, and nothing more. No cache, no polling, no request de-duplication: those tie
      a library to one request/response shape, and an app that needs them already has TanStack Query
      or a <code class="kbd kbd-sm">load</code> function. What is left is the part every project rewrites
      by hand — join the base URL, send and read JSON, inject auth, and turn a failed response into one
      typed error the whole app can catch.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Two apps, three differences
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The skeleton is identical in every client worth copying. Only three things actually vary
      between a cookie-authenticated FastAPI and a bearer-authenticated Go API, and all three are
      arguments to the factory — <code class="kbd kbd-sm">baseUrl</code>,
      <code class="kbd kbd-sm">credentials</code> or <code class="kbd kbd-sm">auth</code>, and
      <code class="kbd kbd-sm">parseError</code>.
    </p>
    <div class="grid gap-4 md:grid-cols-2">
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium">Cookie · FastAPI</p>
        <pre class="overflow-x-auto rounded-box bg-base-200 p-4 text-xs"><code
            >{COOKIE_SNIPPET}</code
          ></pre>
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium">Bearer · Go</p>
        <pre class="overflow-x-auto rounded-box bg-base-200 p-4 text-xs"><code
            >{BEARER_SNIPPET}</code
          ></pre>
      </div>
    </div>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">parseError</code> is the only genuinely app-specific seam, and it is
      also where error localization lives: this library has no i18n, so
      <code class="kbd kbd-sm">t("apiError." + code)</code> belongs to the app that owns the dictionary.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      One response, two clients
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Pick a response and send the same <code class="kbd kbd-sm">get("/sessions/42")</code> through both
      clients. There is no server here — the page intercepts its own requests — but everything below the
      interception is the real client.
    </p>

    <div class="card flex flex-col gap-4 rounded-box bg-base-200 p-4">
      <div class="flex flex-wrap gap-2" role="group" aria-label="Response to answer with">
        {#each SCENARIOS as option (option.id)}
          <button
            class="btn btn-sm"
            class:btn-primary={option.id === scenario.id}
            aria-pressed={option.id === scenario.id}
            onclick={() => {
              scenario = option;
              outcome = null;
              sent = null;
            }}
          >
            {option.label}
          </button>
        {/each}
      </div>
      <p class="text-sm text-base-content/60" data-testid="scenario-note">{scenario.note}</p>

      <div class="flex flex-wrap gap-2">
        <button
          class="btn btn-outline btn-sm"
          onclick={() => run(cookieApi)}
          data-testid="run-cookie"
        >
          Send with the cookie client
        </button>
        <button
          class="btn btn-outline btn-sm"
          onclick={() => run(bearerApi)}
          data-testid="run-bearer"
        >
          Send with the bearer client
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-2">
          <p class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
            What went out
          </p>
          {#if sent}
            <pre
              class="overflow-x-auto rounded-box bg-base-100 p-3 text-xs"
              data-testid="sent"><code>{sent}</code></pre>
          {:else}
            <p class="text-sm text-base-content/60">Nothing sent yet.</p>
          {/if}
        </div>

        <div class="flex flex-col gap-2">
          <p class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
            What came back
          </p>
          {#if outcome?.kind === "ok"}
            <pre
              class="overflow-x-auto rounded-box bg-base-100 p-3 text-xs"
              data-testid="result"><code>{outcome.text}</code></pre>
          {:else if outcome?.kind === "error"}
            <div class="flex flex-col gap-2 rounded-box bg-base-100 p-3" data-testid="result">
              <div class="flex flex-wrap items-center gap-2">
                <span class="badge badge-sm badge-error">status {outcome.status}</span>
                {#if outcome.code}
                  <span class="badge badge-soft badge-sm">code {outcome.code}</span>
                {/if}
              </div>
              <p class="text-sm">{outcome.message}</p>
            </div>
          {:else}
            <p class="text-sm text-base-content/60">No result yet.</p>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Reading a failure
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A failed response becomes an <code class="kbd kbd-sm">ApiError</code> carrying the
      <code class="kbd kbd-sm">status</code> and, when the backend sent one, a machine-readable
      <code class="kbd kbd-sm">code</code>. The message comes from
      <code class="kbd kbd-sm">parseError</code> first, then from the built-in extraction, which walks
      the shapes real backends produce and stops at the first one it recognises:
    </p>
    <ul class="max-w-2xl list-disc pl-5 text-sm text-base-content/70">
      <li>
        <code class="kbd kbd-sm">{"{ message }"}</code> and
        <code class="kbd kbd-sm">{"{ msg }"}</code>
      </li>
      <li>
        <code class="kbd kbd-sm">{"{ detail }"}</code> as a string, as
        <code class="kbd kbd-sm">{"{ code, message }"}</code>, or as FastAPI's 422 list of
        <code class="kbd kbd-sm">{"{ msg }"}</code>, joined with <code class="kbd kbd-sm">;</code>
      </li>
      <li><code class="kbd kbd-sm">{"{ error }"}</code>, the Go/Gin envelope</li>
      <li>a body that is not JSON at all, kept as the text it is</li>
      <li>failing all of that, the status text, then <code class="kbd kbd-sm">HTTP 500</code></li>
    </ul>
    <p class="max-w-2xl text-sm text-base-content/70">
      A <code class="kbd kbd-sm">catch</code> binding is <code class="kbd kbd-sm">unknown</code>, so
      the two readers narrow it once instead of at every call site:
      <code class="kbd kbd-sm">errorMessage(e)</code> is the message of any
      <code class="kbd kbd-sm">Error</code> and <code class="kbd kbd-sm">String(e)</code> for
      anything else, and <code class="kbd kbd-sm">errorStatus(e)</code> is the status of an
      <code class="kbd kbd-sm">ApiError</code> and <code class="kbd kbd-sm">0</code> for everything
      else — enough to special-case a 403 without an
      <code class="kbd kbd-sm">instanceof</code> dance. A network failure is not an
      <code class="kbd kbd-sm">ApiError</code>: nothing answered, so it propagates as the
      <code class="kbd kbd-sm">TypeError</code> fetch threw.
    </p>
  </section>
</main>
