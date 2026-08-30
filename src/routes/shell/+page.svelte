<script lang="ts">
  import { RoutingContext, type RoutingSource } from "$lib/routing.svelte.js";
  import { Breadcrumbs } from "$lib/shell/index.js";
  import RoutingProvider from "../routing/RoutingProvider.svelte";
  import { DemoAccount } from "./demo-account.svelte.js";
  import { demoRoutes, type DemoId } from "./demo-routes.js";
  import ShellDemo from "./ShellDemo.svelte";

  const account = new DemoAccount();

  const DEMO_IDS: DemoId[] = [
    "/",
    "/dashboard",
    "/orders",
    "/orders/[id]",
    "/orders/[id]/lines/[line]",
    "/customers",
    "/invoices",
    "/reports",
    "/inventory",
    "/settings",
  ];

  let demoRouteId = $state<DemoId>("/orders/[id]/lines/[line]");

  // Enough slots to hold every entry the demo can render, so the "More" item can be watched
  // staying behind for the sheet's sake alone.
  const SLOT_CHOICES = [5, 8];
  let barSlots = $state(5);

  // A hand-rolled stand-in for SvelteKit's `page`. `RoutingContext` reads its source structurally,
  // which is what lets one instance be driven from a form here and from a test elsewhere.
  const demoSource: RoutingSource = {
    get route() {
      return { id: demoRouteId };
    },
    get params() {
      return { id: "7841", line: "3" };
    },
    get url() {
      return new URL("https://acme.example/");
    },
  };

  // One context, two frames. Nothing about the shell is per-viewport, so the same instance feeds
  // the sidebar in one box and the bottom bar in the other.
  const demoRouting = new RoutingContext(demoRoutes, demoSource);

  /**
   * The fake app has no pages in this site, so `ShellDemo` intercepts nav clicks and hands the
   * pathname here. Mapping it back to a route id goes through the resolved entries rather than a
   * second table — the tree is declared once, and that includes this.
   */
  const goDemo = (pathname: string) => {
    const match = [...demoRouting.matched, ...demoRouting.children("/")].find(
      (route) => route.pathname === pathname,
    );
    if (match) demoRouteId = match.routeId as DemoId;
  };

  const toggleReports = () => {
    account.roles = account.roles.includes("reports:read") ? [] : ["reports:read"];
  };
</script>

<main class="mx-auto flex w-full max-w-5xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Shell</h1>
    <p class="max-w-2xl text-base-content/70">
      One route declaration, two navigations. On a wide viewport the shell is a collapsible sidebar;
      on a narrow one it is a fixed bottom bar, with the entries that do not fit — and everything a
      bar has no room for at all, the brand, the footer controls and the user block — folded into a
      sheet. Neither form is chosen by JavaScript — there is no resize listener and no
      <code class="kbd kbd-sm">matchMedia</code>, only a container query on the shell's own root,
      which is why nothing flashes the wrong layout on the first paint.
    </p>
    <p class="max-w-2xl text-base-content/70">
      That the query is on the <em>container</em> rather than the viewport is what makes the two frames
      below possible: the same component, the same routing context, the same user — one in a wide box
      and one 375&nbsp;px wide. Drag the corner of the first frame and watch it change form.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Drive the fake app
    </h2>

    <div class="flex flex-wrap items-end gap-4">
      <label class="flex flex-col gap-1 text-sm">
        <span class="text-base-content/60">Current route</span>
        <select class="select w-64 select-sm" bind:value={demoRouteId} data-testid="route-select">
          {#each DEMO_IDS as id (id)}
            <option value={id}>{id}</option>
          {/each}
        </select>
      </label>

      <label class="flex flex-col gap-1 text-sm">
        <span class="text-base-content/60">Bottom bar slots</span>
        <select class="select w-40 select-sm" bind:value={barSlots} data-testid="bar-slots">
          {#each SLOT_CHOICES as count (count)}
            <option value={count}>{count}</option>
          {/each}
        </select>
      </label>

      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-sm"
          class:btn-primary={account.status === "authenticated"}
          data-testid="toggle-auth"
          onclick={() =>
            (account.status = account.status === "authenticated" ? "anonymous" : "authenticated")}
        >
          {account.status === "authenticated" ? "Signed in" : "Signed out"}
        </button>
        <button
          type="button"
          class="btn btn-sm"
          class:btn-primary={account.roles.includes("reports:read")}
          data-testid="toggle-role"
          onclick={toggleReports}
        >
          reports:read
        </button>
        <button
          type="button"
          class="btn btn-sm"
          class:btn-primary={account.canSignOut}
          data-testid="toggle-logout"
          onclick={() => (account.canSignOut = !account.canSignOut)}
        >
          Context can sign out
        </button>
      </div>
    </div>

    <p class="max-w-2xl text-sm text-base-content/70">
      Signing out drops the user block from the sidebar footer <em>and</em> from the sheet. Taking
      <code class="kbd kbd-sm">reports:read</code> away drops the Reports entry from both forms and
      from the sheet — the gate is declared once, on the route, and the bottom bar counts what will
      actually render before deciding what overflows. Turning off "context can sign out" removes the
      sign-out control entirely: a
      <code class="kbd kbd-sm">UserContext</code> with no <code class="kbd kbd-sm">logout</code> gets
      no button rather than a dead one.
    </p>
    <p class="max-w-2xl text-sm text-base-content/70">
      "Bottom bar slots" is <code class="kbd kbd-sm">bottomBarSlots</code>, and it caps what the bar
      renders with "More" counted in. At eight, with
      <code class="kbd kbd-sm">reports:read</code> taken away, the seven remaining entries all fit and
      nothing overflows — yet "More" stays, because on a phone the sheet is the only place the brand,
      the theme toggle and the user block have to go.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Wide frame — sidebar
    </h2>
    <!-- `resize: horizontal` is the whole demonstration: narrow it past 48rem and the sidebar is
         replaced by the bottom bar, with no listener anywhere. -->
    <div
      class="h-[30rem] resize-x overflow-hidden rounded-box border border-base-content/15"
      data-testid="frame-wide"
    >
      <ShellDemo
        routing={demoRouting}
        user={account}
        navLabel="Wide demo navigation"
        bottomBarSlots={barSlots}
        onnavigate={goDemo}
      />
    </div>
    <p class="text-sm text-base-content/60">
      Collapse the sidebar with the button in its header. The state goes to
      <code class="kbd kbd-sm">localStorage</code> and survives a reload; collapsed entries keep their
      names as tooltips.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Narrow frame — bottom bar
    </h2>
    <div
      class="h-[34rem] w-[375px] max-w-full overflow-hidden rounded-box border border-base-content/15"
      data-testid="frame-mobile"
    >
      <ShellDemo
        routing={demoRouting}
        user={account}
        navLabel="Mobile demo navigation"
        storageKey={null}
        bottomBarSlots={barSlots}
        onnavigate={goDemo}
      />
    </div>
    <p class="max-w-2xl text-sm text-base-content/60">
      Eight entries, five slots: four ride the bar and the rest go behind "More". The bar is pinned
      to the bottom of the shell rather than to the window — in an app the shell is the viewport, so
      it is the same thing, and here it means the bar stays inside the frame. The sheet is a real
      <code class="kbd kbd-sm">&lt;dialog&gt;</code>, so it goes to the top layer, which
      <em>is</em> the window: expect it to cover this page rather than the frame.
    </p>
    <p class="max-w-2xl text-sm text-base-content/60">
      Open it and the whole sidebar is there in order: the brand as its header, then the entries
      that did not fit, then the theme toggle, then Ada and her sign-out button. Cycle the theme
      from inside — the sheet stays put, because a setting is not somewhere you went. Choosing an
      entry is, so that dismisses it.
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Breadcrumbs
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The same trail the frames above render inside their content area, and the same source: the
      titled entries of <code class="kbd kbd-sm">routing.matched</code>. Plumbing steps — the
      <code class="kbd kbd-sm">/orders/[id]/lines</code> segment, which exists only so the line page
      can resolve — never appear. <code class="kbd kbd-sm">/orders</code> has no page of its own, so it
      renders as text rather than a link.
    </p>
    <div class="rounded-box border border-base-content/10 bg-base-200/40 p-4" data-testid="crumbs">
      <RoutingProvider routing={demoRouting}>
        <Breadcrumbs label="Demo breadcrumb" />
      </RoutingProvider>
    </div>

    <p class="max-w-2xl text-sm text-base-content/70">
      A page that knows something the route tree cannot — a record's name, fetched after the match —
      appends it to the trail instead:
    </p>
    <div
      class="rounded-box border border-base-content/10 bg-base-200/40 p-4"
      data-testid="custom-crumbs"
    >
      <Breadcrumbs
        label="Custom breadcrumb"
        crumbs={[
          { routeId: "/", label: "Acme", pathname: "/", navigable: true },
          { routeId: "/orders", label: "Orders", pathname: "/orders", navigable: true },
          { routeId: "leaf", label: "Purchase order 7841-A" },
        ]}
      />
    </div>
  </section>
</main>
