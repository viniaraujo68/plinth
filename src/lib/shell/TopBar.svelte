<script lang="ts">
  import type { Snippet } from "svelte";
  import type { ClassValue } from "svelte/elements";
  import Dropdown from "../components/Dropdown.svelte";
  import { getUserContext } from "../user/context.js";
  import UserAvatar from "./UserAvatar.svelte";

  interface Props {
    /** The app's mark and name, at the start of the bar. Usually a link home. */
    brand?: Snippet;
    /**
     * Controls at the end of the bar, before the account menu: a language toggle, a theme toggle,
     * the sign-in and sign-up links a visitor who is not signed in needs.
     */
    actions?: Snippet;
    /**
     * The account menu's own entries, as `<li>` elements — "My groups", "Account". They sit between
     * the user's name and the sign-out entry. Choosing one closes the menu.
     */
    menu?: Snippet;
    /** Accessible name of the avatar that opens the menu. A prop because the library ships no translations. */
    menuLabel?: string;
    /** The menu's sign-out entry. Shown only when the user context has somewhere to sign out to. */
    logoutLabel?: string;
    class?: ClassValue;
  }

  let {
    brand,
    actions,
    menu,
    menuLabel = "Account",
    logoutLabel = "Sign out",
    class: className,
  }: Props = $props();

  const user = getUserContext();
  const signedIn = $derived(user.status === "authenticated" ? user.data : null);

  let accountMenu = $state<Dropdown>();

  /**
   * Closes the menu once something in it is chosen. The popover light-dismisses on a click outside
   * it, never on one inside, and a link that navigates within the app leaves the bar — and the open
   * panel — mounted. Delegated from the list, so the app's own entries need no handler of their own.
   */
  const closeOnChoice = (event: MouseEvent) => {
    if ((event.target as Element | null)?.closest("a, button")) accountMenu?.close();
  };

  const signOut = async () => {
    await user.logout?.();
  };
</script>

<!--
@component
A bar across the top of the page, for an app with too little navigation to fill `AppShell`'s
sidebar: the brand at the start, the app's controls at the end and, once someone is signed in, their
avatar, which opens an account menu with their name, the app's entries and signing out.

It reads the signed-in user from the user context, as `AppShell` does, so the same
`setUserContext` drives both. It owns no page layout: put the page below it, at whatever width the
app uses — `--plinth-top-bar-width` caps the bar's content to match it.

```svelte
<TopBar menuLabel="Account menu" logoutLabel="Sign out">
  {#snippet brand()}<a href="/">Acme</a>{/snippet}
  {#snippet actions()}<ThemeToggle iconOnly />{/snippet}
  {#snippet menu()}<li><a href="/account">Account</a></li>{/snippet}
</TopBar>
```
-->
<header class={["plinth-top-bar", className]}>
  <div class="plinth-top-bar-inner">
    <div class="plinth-top-bar-brand">{@render brand?.()}</div>
    <div class="plinth-top-bar-end">
      {@render actions?.()}
      {#if signedIn}
        <Dropdown
          bind:this={accountMenu}
          class="plinth-top-bar-account"
          aria-label={menuLabel}
          title={signedIn.name}
          panelClass="plinth-top-bar-menu dropdown rounded-box bg-base-100 p-2 shadow-lg"
        >
          <UserAvatar name={signedIn.name} />
          {#snippet content()}
            <!-- The handler only reacts to a click that landed on a link or a button inside, and a
                 keyboard activates those with a click event of its own, so nothing is mouse-only. -->
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
            <ul class="menu w-full p-0" onclick={closeOnChoice}>
              <li class="plinth-top-bar-identity menu-title">
                <span class="plinth-top-bar-name">{signedIn.name}</span>
                {#if signedIn.email}<span class="plinth-top-bar-email">{signedIn.email}</span>{/if}
              </li>
              {@render menu?.()}
              {#if user.logout}
                <li><button type="button" onclick={signOut}>{logoutLabel}</button></li>
              {/if}
            </ul>
          {/snippet}
        </Dropdown>
      {/if}
    </div>
  </div>
</header>

<style>
  .plinth-top-bar {
    position: sticky;
    top: 0;
    z-index: 50;
    border-bottom: 1px solid color-mix(in oklch, var(--color-base-content) 12%, transparent);
    background-color: color-mix(in oklch, var(--color-base-100) 82%, transparent);
    backdrop-filter: blur(12px);
  }

  .plinth-top-bar-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    max-width: var(--plinth-top-bar-width, none);
    height: 4rem;
    margin-inline: auto;
    padding-inline: 1.25rem;
  }

  .plinth-top-bar-brand {
    display: flex;
    min-width: 0;
    align-items: center;
  }

  .plinth-top-bar-end {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.75rem;
  }

  @media (max-width: 35rem) {
    .plinth-top-bar-inner {
      padding-inline: 1rem;
    }

    .plinth-top-bar-end {
      gap: 0.5rem;
    }
  }

  /* The trigger and the panel are `Dropdown`'s elements, which this component's scoped rules do
     not reach; their classes come in through props, hence the global selectors. */
  :global(.plinth-top-bar-account) {
    display: grid;
    place-items: center;
    padding: 0;
    border: none;
    border-radius: 9999px;
    background: none;
    cursor: pointer;
  }

  :global(.plinth-top-bar-account:focus-visible) {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  :global(.plinth-top-bar-menu) {
    width: 13rem;
    border: 1px solid color-mix(in oklch, var(--color-base-content) 12%, transparent);
  }

  .plinth-top-bar-identity {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .plinth-top-bar-name,
  .plinth-top-bar-email {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .plinth-top-bar-email {
    font-weight: 400;
  }
</style>
