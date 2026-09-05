<script lang="ts">
  import { resolve } from "$app/paths";
  import ErrorPage from "$lib/components/ErrorPage.svelte";

  const CASES = [
    { status: 404, pathname: "/reports/2019", message: undefined },
    { status: 403, pathname: "/admin", message: "You do not have access to this workspace." },
    { status: 500, pathname: "/orders", message: undefined },
  ];

  let selected = $state(0);
  const shown = $derived(CASES[selected]!);
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">ErrorPage</h1>
    <p class="max-w-2xl text-base-content/70">
      The route-level error page, rendered from an app's <code class="kbd kbd-sm"
        >+error.svelte</code
      >. A 404 gets its own wording, its own icon and no reload button — an address that does not
      exist will not start existing on a second try.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Live</h2>
    <div class="join" role="group" aria-label="Status to preview">
      {#each CASES as demo, index (demo.status)}
        <button
          class={["btn join-item btn-sm", selected === index && "btn-primary"]}
          onclick={() => (selected = index)}
          aria-pressed={selected === index}
        >
          {demo.status}
        </button>
      {/each}
    </div>
    <div class="min-h-72 rounded-box border border-base-content/10 bg-base-200">
      <ErrorPage
        status={shown.status}
        message={shown.message}
        pathname={shown.pathname}
        homeHref={resolve("/")}
      />
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Every word is a prop
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The library ships no translations, so the chip, both headings, both bodies and the two buttons
      are props with English defaults. <code class="kbd kbd-sm">message</code> still wins over
      <code class="kbd kbd-sm">errorBody</code>, because a message the app wrote is already in the
      app's own language.
    </p>
    <div class="min-h-72 rounded-box border border-base-content/10 bg-base-200">
      <ErrorPage
        status={404}
        pathname="/discos/1998"
        homeHref={resolve("/")}
        statusLabel={(status) => `Erro ${status}`}
        notFoundTitle="Página não encontrada"
        notFoundBody={(pathname) =>
          `O endereço ${pathname ?? "que você pediu"} não existe, ou mudou de lugar.`}
        errorTitle="Algo deu errado"
        errorBody="O aplicativo encontrou um problema inesperado."
        homeLabel="Voltar ao início"
        reloadLabel="Recarregar"
      />
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Wiring</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Everything it shows arrives as a prop instead of being read out of
      <code class="kbd kbd-sm">$app/state</code> inside the component. That keeps it renderable —
      and testable — outside a SvelteKit navigation, and it leaves the app's own
      <code class="kbd kbd-sm">+error.svelte</code> to decide what is safe to print: an intentional
      <code class="kbd kbd-sm">error(403, "…")</code> message is written for the user, an unexpected one
      is not.
    </p>
    <p class="max-w-2xl text-sm text-base-content/70">
      In <code class="kbd kbd-sm">+error.svelte</code>, with
      <code class="kbd kbd-sm">page</code> imported from <code class="kbd kbd-sm">$app/state</code>:
    </p>
    <pre class="overflow-x-auto rounded-box bg-base-200 p-4 text-xs"><code
        >{`<ErrorPage
  status={page.status}
  message={page.error?.message}
  pathname={page.url.pathname}
  homeHref={resolve("/")}
/>`}</code
      ></pre>
  </section>
</main>
