<script lang="ts">
  import Avatar from "$lib/components/Avatar.svelte";

  const PHOTO = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#7c9a8a"/><circle cx="20" cy="16" r="7" fill="#e8dcc8"/><path d="M6 40c0-9 6-14 14-14s14 5 14 14z" fill="#e8dcc8"/></svg>`,
  )}`;

  const PEOPLE = ["Ada Lovelace", "Grace Brewster Murray Hopper", "linus", ""];
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">Avatar</h1>
    <p class="max-w-2xl text-base-content/70">
      A person on a disc. The photo when there is one; otherwise the first letter of the first and
      the last name, on the theme's primary colour. The shell's account avatar is this component.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Initials</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Middle names are skipped, one word gives one letter, and a blank name gives a question mark
      rather than an empty disc.
    </p>
    <div class="flex flex-wrap items-end gap-8 rounded-box border border-base-content/10 p-6">
      {#each PEOPLE as person (person)}
        <figure class="flex flex-col items-center gap-2">
          <Avatar name={person} size="2.5rem" />
          <figcaption class="font-mono text-xs text-base-content/50">
            {person ? `"${person}"` : '""'}
          </figcaption>
        </figure>
      {/each}
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Photo</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">src</code> is cropped to fill the disc. A photo that fails to load gives
      way to the initials instead of a broken image.
    </p>
    <div class="flex flex-wrap items-end gap-8 rounded-box border border-base-content/10 p-6">
      <figure class="flex flex-col items-center gap-2">
        <Avatar name="Ada Lovelace" src={PHOTO} size="2.5rem" />
        <figcaption class="font-mono text-xs text-base-content/50">photo</figcaption>
      </figure>
      <figure class="flex flex-col items-center gap-2">
        <Avatar name="Ada Lovelace" src="data:image/png;base64,AAAA" size="2.5rem" />
        <figcaption class="font-mono text-xs text-base-content/50">failed to load</figcaption>
      </figure>
    </div>
  </section>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Size</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      <code class="kbd kbd-sm">size</code> takes any CSS length and the initials scale with it. It is
      a prop rather than a class because a component rule beats a Tailwind utility. The default is 2rem,
      the shell's.
    </p>
    <div class="flex flex-wrap items-end gap-8 rounded-box border border-base-content/10 p-6">
      {#each ["1.5rem", "2rem", "3rem", "6rem"] as size (size)}
        <figure class="flex flex-col items-center gap-2">
          <Avatar name="Ada Lovelace" {size} />
          <figcaption class="font-mono text-xs text-base-content/50">{size}</figcaption>
        </figure>
      {/each}
    </div>
  </section>
</main>
