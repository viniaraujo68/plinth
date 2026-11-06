<script lang="ts">
  import JsonInput from "./JsonInput.svelte";

  interface Props {
    value?: string;
    formatOnBlur?: boolean;
    required?: boolean;
  }

  let { value = $bindable(""), ...rest }: Props = $props();
  let invalid = $state(false);
</script>

<form data-testid="form">
  <JsonInput bind:value bind:invalid label="Settings" name="settings" {...rest} />
  <button type="button">Elsewhere</button>
</form>
<span data-testid="invalid">{invalid}</span>
