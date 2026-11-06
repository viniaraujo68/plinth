<script lang="ts">
  import type { Attachment } from "svelte/attachments";
  import type { ClassValue, HTMLTextareaAttributes } from "svelte/elements";
  import { formatJsonText, parseJsonText } from "./json-text.js";

  type Props = Omit<
    HTMLTextareaAttributes,
    "bind:value" | "children" | "class" | "onblur" | "required" | "value"
  > & {
    /** The text being edited. Bindable: the field holds text, never a parsed object. */
    value?: string;
    /** `true` while the text does not parse. Bind it to gate a submit. */
    invalid?: boolean;
    /** The field's visible label. */
    label?: string;
    /** Reformats the text on blur when it parses. Text that does not parse is left as typed. */
    formatOnBlur?: boolean;
    /** Rejects blank text, in `invalid` and in the surrounding form's validation. */
    required?: boolean;
    /** Leads the error shown under the field; the parser's own message follows it. */
    invalidLabel?: string;
    /** The error for blank text when `required`. */
    requiredLabel?: string;
    /** Classes for the whole field. The textarea is where every other attribute goes. */
    class?: ClassValue;
  };

  let {
    value = $bindable(""),
    invalid = $bindable(false),
    label,
    formatOnBlur = false,
    required = false,
    invalidLabel = "Invalid JSON",
    requiredLabel = "Required",
    rows = 12,
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const fieldId = $derived(rest.id ?? `plinth-json-input-${uid}`);
  const errorId = `plinth-json-input-${uid}-error`;

  let touched = $state(false);

  const result = $derived(parseJsonText(value, { required, requiredMessage: requiredLabel }));
  const message = $derived(result.valid ? "" : `${invalidLabel}: ${result.error}`);
  const showError = $derived(touched && !result.valid);

  $effect(() => {
    const next = !result.valid;
    if (invalid !== next) invalid = next;
  });

  const validity: Attachment<HTMLTextAreaElement> = (field) => {
    field.setCustomValidity(message);
  };

  const onblur = () => {
    touched = true;
    if (formatOnBlur) value = formatJsonText(value);
  };
</script>

<!--
@component
A JSON text field: it parses as you type, reports whether the text parses through a bindable
`invalid`, and can reformat the document on blur.

It holds text, never a parsed object. A document is invalid for most of the time it is being
edited, and holding the object would throw away what was typed. Bind `invalid` to gate a submit,
then parse the text once when sending, with `parseJsonText` or `JSON.parse`.

The error waits for the first blur, since every document is invalid while its first brace is being
typed, and it carries the parser's own message, which names where the document broke. The same
message is the textarea's custom validity, so a surrounding form will not submit text that does not
parse.

```svelte
<JsonInput bind:value={text} bind:invalid label="Settings" formatOnBlur required />
<button disabled={invalid} onclick={() => save(JSON.parse(text))}>Save</button>
```
-->

<div class={["plinth-json-input fieldset w-full", className]}>
  {#if label}
    <label class="fieldset-legend" for={fieldId}>{label}</label>
  {/if}
  <textarea
    {...rest}
    {@attach validity}
    id={fieldId}
    class={["textarea w-full font-mono text-xs", showError && "textarea-error"]}
    {rows}
    {required}
    spellcheck="false"
    aria-invalid={showError}
    aria-describedby={[rest["aria-describedby"], showError && errorId].filter(Boolean).join(" ") ||
      undefined}
    bind:value
    {onblur}></textarea>
  {#if showError}
    <p id={errorId} class="label whitespace-normal text-error">{message}</p>
  {/if}
</div>
