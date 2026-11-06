<script lang="ts">
  import { sortable } from "$lib/attachments/sortable.js";
  import DragHandle from "$lib/components/DragHandle.svelte";

  let teams = $state(["Black", "White", "Red", "Blue", "Green"]);
  let tasks = $state([
    "Book the pitch for Thursday",
    "Collect this month's fees",
    "Buy two new balls",
    "Pick the bibs up from the laundry",
  ]);

  const reorder = <T,>(list: T[], from: number, to: number) => {
    const next = [...list];
    next.splice(to, 0, ...next.splice(from, 1));
    return next;
  };

  const onmove = (from: number, to: number) => {
    teams = reorder(teams, from, to);
  };

  const onTaskMove = (from: number, to: number) => {
    tasks = reorder(tasks, from, to);
  };
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Sortable</h1>
    <p class="max-w-2xl text-base-content/70">
      An attachment that reorders a list from its drag handles. It never moves anything itself: it
      reports <code class="kbd kbd-sm">onmove(from, to)</code> and the caller reorders its own state,
      so whatever else points at those positions can follow along.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Match order
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Drag a team by its grip, with the mouse or a finger, or focus the grip and use the arrow keys,
      <code class="kbd kbd-sm">Home</code> and <code class="kbd kbd-sm">End</code>. The item being
      dragged carries <code class="kbd kbd-sm">data-sortable-dragging</code> for styling. Key the
      <code class="kbd kbd-sm">each</code> block by a stable identity, so the element being dragged is
      still the same item after a move and the others can slide into place. Keep the options free of state
      that changes while dragging: Svelte re-runs an attachment whose arguments read changed state, and
      a re-run ends the drag in progress.
    </p>

    <ul class="flex flex-wrap gap-2" aria-label="Teams" {@attach sortable({ onmove })}>
      {#each teams as team (team)}
        <li
          data-sortable-item
          data-testid="team"
          class="flex items-stretch overflow-hidden rounded-field border border-base-content/15 bg-base-100 transition-shadow data-sortable-dragging:scale-105 data-sortable-dragging:border-primary data-sortable-dragging:shadow-lg"
        >
          <DragHandle label="Move {team}" />
          <span class="py-2 pr-3 text-sm">{team}</span>
        </li>
      {/each}
    </ul>

    <p class="text-sm text-base-content/70">
      First match: <strong data-testid="first-match">{teams[0]} x {teams[1]}</strong>
    </p>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Vertical list
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The same attachment on a column: an item moves once its middle passes the middle of the row
      above or below it, and the arrow keys work in both directions.
    </p>

    <ol
      class="flex max-w-md flex-col gap-2"
      aria-label="Tasks"
      {@attach sortable({ onmove: onTaskMove })}
    >
      {#each tasks as task, index (task)}
        <li
          data-sortable-item
          data-testid="task"
          class="flex items-stretch overflow-hidden rounded-field border border-base-content/15 bg-base-100 transition-shadow data-sortable-dragging:border-primary data-sortable-dragging:shadow-lg"
        >
          <DragHandle label="Move {task}" class="px-2" />
          <span class="w-6 py-3 text-sm text-base-content/50 tabular-nums">{index + 1}.</span>
          <span class="py-3 pr-4 text-sm">{task}</span>
        </li>
      {/each}
    </ol>
  </section>
</main>
