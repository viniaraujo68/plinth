<script lang="ts">
  import JsonInput from "$lib/components/JsonInput.svelte";
  import { parseJsonText } from "$lib/components/json-text.js";

  const INITIAL = {
    notifications: { email: true, push: false },
    retention_days: 30,
    pinned_groups: ["thursday-five-a-side", "sunday-league"],
  };

  let text = $state(JSON.stringify(INITIAL, null, 2));
  let invalid = $state(false);
  let formatOnBlur = $state(true);
  let required = $state(true);
  let saved = $state<unknown>(INITIAL);

  const save = () => {
    const result = parseJsonText(text, { required });
    if (result.valid) saved = result.data;
  };
</script>

<main class="mx-auto flex w-full max-w-4xl flex-col gap-12 p-6 sm:p-10">
  <header class="flex flex-col gap-3">
    <h1 class="text-3xl font-semibold tracking-tight">JsonInput</h1>
    <p class="max-w-2xl text-base-content/70">
      A JSON text field that reports its own validity. It holds text, never a parsed object, so a
      document that is half typed survives every keystroke; a bindable
      <code class="kbd kbd-sm">invalid</code> says whether the text parses right now.
    </p>
  </header>

  <section class="flex flex-col gap-4">
    <h2 class="text-xs font-medium tracking-[0.06em] text-base-content/50 uppercase">Settings</h2>
    <p class="max-w-2xl text-sm text-base-content/70">
      Delete a closing brace and leave the field: it turns red with the parser's own message, which
      names where the document broke. The save button is bound to
      <code class="kbd kbd-sm">invalid</code>, so it locks while the text does not parse. With
      <code class="kbd kbd-sm">formatOnBlur</code> a document that parses is reindented on the way out;
      one that does not is left exactly as typed.
    </p>

    <div class="flex flex-wrap gap-4">
      <label class="label gap-2">
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={formatOnBlur} />
        formatOnBlur
      </label>
      <label class="label gap-2">
        <input type="checkbox" class="checkbox checkbox-sm" bind:checked={required} />
        required
      </label>
    </div>

    <div class="grid gap-6 md:grid-cols-2">
      <div class="flex flex-col gap-3">
        <JsonInput
          bind:value={text}
          bind:invalid
          label="Settings"
          placeholder={'{"key": "value"}'}
          {formatOnBlur}
          {required}
          data-testid="settings"
        />
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="btn btn-primary btn-sm"
            disabled={invalid}
            data-testid="save"
            onclick={save}
          >
            Save
          </button>
          <span class="text-sm text-base-content/70">
            invalid <span class="badge badge-soft badge-sm" data-testid="invalid">{invalid}</span>
          </span>
        </div>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="fieldset-legend">Last saved</span>
        <pre
          class="overflow-auto rounded-box bg-base-200 p-3 text-xs"
          data-testid="saved">{JSON.stringify(saved, null, 2)}</pre>
      </div>
    </div>
  </section>
</main>
