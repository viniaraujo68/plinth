<script lang="ts">
  import Copyable from "$lib/components/Copyable.svelte";

  const RELEASES = [
    { id: "b7f1c0a4-3d8e-4a11-9c22-5e6f70d81b93", artist: "Kaleidoscope", runtime: "42:17" },
    { id: "0a3d9e51-77bc-4f0a-8e19-2c4b6a0f5d77", artist: "North Signal", runtime: "38:04" },
    { id: "e2c8b410-9f63-4d55-a0d7-118ac3e9b204", artist: "Violet Ash", runtime: "51:36" },
  ];

  const WEBHOOK = "https://example.test/hooks/2f6c1b90a4e34d7f";

  const CATALOGUE_NUMBER = "KLD-1998-07";
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
          <tr><th>Release</th><th>Artist</th><th class="text-right">Runtime</th></tr>
        </thead>
        <tbody>
          <!-- The row carries the id its own link points at, so the link is a real destination
               rather than a dead fragment the prerenderer would reject. -->
          {#each RELEASES as release (release.id)}
            <tr id={release.id}>
              <td>
                <Copyable
                  class="w-32 font-mono text-xs text-base-content/70"
                  copyableText={release.id}
                >
                  <a class="link" href="#{release.id}">{release.id}</a>
                </Copyable>
              </td>
              <td><span class="badge badge-soft badge-sm badge-primary">{release.artist}</span></td>
              <td class="text-right font-mono tabular-nums">{release.runtime}</td>
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

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">
      Every word is a prop
    </h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      The button has no visible text, so its accessible name is the whole of the copy — and the
      library ships no translations. <code class="kbd kbd-sm">copyLabel</code> and
      <code class="kbd kbd-sm">copiedLabel</code> are props with English defaults; the value beside them
      is the app's own and never gets translated.
    </p>
    <div class="card w-fit rounded-box border border-base-content/10 p-4">
      <Copyable
        class="font-mono text-sm"
        data-testid="translated"
        copyLabel="Copiar"
        copiedLabel="Copiado"
      >
        {CATALOGUE_NUMBER}
      </Copyable>
    </div>
  </section>
</main>
