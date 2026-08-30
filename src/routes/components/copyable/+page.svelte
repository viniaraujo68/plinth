<script lang="ts">
  import Copyable from "$lib/components/Copyable.svelte";

  const BATCHES = [
    { id: "b7f1c0a4-3d8e-4a11-9c22-5e6f70d81b93", fund: "Alpha", amount: "R$ 1.284.310,00" },
    { id: "0a3d9e51-77bc-4f0a-8e19-2c4b6a0f5d77", fund: "Bravo", amount: "R$ 96.400,50" },
    { id: "e2c8b410-9f63-4d55-a0d7-118ac3e9b204", fund: "Charlie", amount: "R$ 7.219,90" },
  ];

  const WEBHOOK = "https://example.test/hooks/2f6c1b90a4e34d7f";
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Copyable</h1>
    <p class="max-w-2xl text-base-content/70">
      A value with a copy button beside it. The button is the only thing that copies, so the value
      itself keeps whatever behavior it had — a link stays a link. The check appears only after the
      clipboard actually accepted the write.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Value as content
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      With no <code class="kbd kbd-sm">copyableText</code>, the rendered text is what gets copied.
      This is the common case, and the one that cannot drift.
    </p>
    <div class="card w-fit rounded-box border border-base-content/10 p-4">
      <Copyable class="font-mono text-sm" data-testid="webhook">
        {WEBHOOK}
      </Copyable>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Truncated content, whole value
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      In a table the id is clipped to fit the column, and it is also a link. Passing
      <code class="kbd kbd-sm">copyableText</code> is what keeps the clipboard holding the full id rather
      than the ellipsis the user can see.
    </p>
    <div class="overflow-x-auto rounded-box border border-base-content/10">
      <table class="table table-sm">
        <thead>
          <tr><th>Batch</th><th>Fund</th><th class="text-right">Nominal</th></tr>
        </thead>
        <tbody>
          <!-- The row carries the id its own link points at, so the link is a real destination
               rather than a dead fragment the prerenderer would reject. -->
          {#each BATCHES as batch (batch.id)}
            <tr id={batch.id}>
              <td>
                <Copyable
                  class="w-32 font-mono text-xs text-base-content/70"
                  copyableText={batch.id}
                >
                  <a class="link" href="#{batch.id}">{batch.id}</a>
                </Copyable>
              </td>
              <td><span class="badge badge-soft badge-sm badge-primary">{batch.fund}</span></td>
              <td class="text-right font-mono tabular-nums">{batch.amount}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Inline</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The wrapper is an inline flex span, so it sits inside a sentence without breaking the line
      box.
    </p>
    <p class="max-w-2xl text-sm">
      Point the integration at
      <Copyable class="font-mono" data-testid="inline">acme-prod</Copyable>
      and restart the collector.
    </p>
  </section>
</main>
