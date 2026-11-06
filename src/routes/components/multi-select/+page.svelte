<script lang="ts">
  import { onMount } from "svelte";
  import MultiSelect from "$lib/components/MultiSelect.svelte";
  import type { SelectOption } from "$lib/components/select.js";

  interface Person extends SelectOption {
    email: string;
  }

  const PEOPLE: readonly Person[] = [
    { value: "ada", label: "Ada Lovelace", email: "ada@example.com" },
    { value: "alan", label: "Alan Turing", email: "alan@example.com" },
    { value: "barbara", label: "Barbara Liskov", email: "barbara@example.com" },
    { value: "edsger", label: "Edsger Dijkstra", email: "edsger@example.com" },
    { value: "grace", label: "Grace Hopper", email: "grace@example.com" },
    { value: "john", label: "John Backus", email: "john@example.com" },
    { value: "katherine", label: "Katherine Johnson", email: "katherine@example.com" },
    { value: "margaret", label: "Margaret Hamilton", email: "margaret@example.com" },
    { value: "tim", label: "Tim Berners-Lee", email: "tim@example.com" },
  ];

  const CHANNELS: readonly SelectOption[] = [
    { value: "email", label: "Email (always on)", disabled: true },
    { value: "sms", label: "SMS" },
    { value: "push", label: "Push notification" },
    { value: "slack", label: "Slack" },
    { value: "webhook", label: "Webhook" },
  ];

  let members = $state<string[]>(["grace", "ada"]);
  let channels = $state<string[]>(["email", "push"]);
  let submitted = $state("—");

  let reviewers = $state<string[]>(["katherine", "tim"]);
  let reviewerOptions = $state<readonly Person[]>([]);
  let loadingReviewers = $state(true);

  onMount(() => {
    const timer = setTimeout(() => {
      reviewerOptions = PEOPLE;
      loadingReviewers = false;
    }, 1500);
    return () => clearTimeout(timer);
  });
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">MultiSelect</h1>
    <p class="max-w-2xl text-base-content/70">
      Picks several options. The field shows the picks as chips, in the order they were made, and
      opening it lists every option under a search box with the picked ones checked. Enter or a
      click checks or unchecks a row without closing the list.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Members</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The focus moves into the search box as the list opens and back to the field as it closes. On
      the field, the arrows open the list and Backspace removes the last pick. The
      <code class="kbd kbd-sm">chip</code> and <code class="kbd kbd-sm">option</code> snippets receive
      the whole option, so a row can show more than its label.
    </p>
    <div class="flex max-w-md flex-col gap-1.5">
      <label for="members" class="label text-xs">Members</label>
      <MultiSelect id="members" options={PEOPLE} bind:value={members}>
        {#snippet option(person)}
          <span class="flex flex-col">
            <span>{person.label}</span>
            <span class="text-xs text-base-content/60">{person.email}</span>
          </span>
        {/snippet}
      </MultiSelect>
      <p class="text-sm text-base-content/70">
        Value <span class="badge badge-soft badge-sm" data-testid="members-value"
          >{members.join(", ") || "none"}</span
        >
      </p>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Locked picks and a form
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      A disabled option cannot be checked or unchecked, so once picked it is locked: its chip has no
      ✕ and Backspace passes it by. <code class="kbd kbd-sm">name</code> submits one entry per pick,
      and
      <code class="kbd kbd-sm">required</code> holds the form back while nothing is picked.
    </p>
    <form
      class="flex max-w-md flex-col gap-3"
      onsubmit={(event) => {
        event.preventDefault();
        submitted = new FormData(event.currentTarget).getAll("channels").join(", ");
      }}
    >
      <div class="flex flex-col gap-1.5">
        <label for="channels" class="label text-xs">Channels</label>
        <MultiSelect
          id="channels"
          name="channels"
          options={CHANNELS}
          bind:value={channels}
          placeholder="Choose channels"
          required
        />
      </div>
      <div class="flex items-center gap-4">
        <button type="submit" class="btn btn-primary btn-sm">Save</button>
        <span class="text-sm text-base-content/70">
          Submitted <span class="badge badge-soft badge-sm" data-testid="channels-submitted"
            >{submitted}</span
          >
        </span>
      </div>
    </form>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Loading</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      While <code class="kbd kbd-sm">loading</code>, a pick whose option has not arrived yet holds
      its place with a skeleton chip instead of showing a raw value.
    </p>
    <div class="flex max-w-md flex-col gap-1.5">
      <label for="reviewers" class="label text-xs">Reviewers</label>
      <MultiSelect
        id="reviewers"
        options={reviewerOptions}
        bind:value={reviewers}
        loading={loadingReviewers}
      />
    </div>
  </section>
</main>
