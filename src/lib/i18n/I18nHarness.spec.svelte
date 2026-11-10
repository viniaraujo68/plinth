<script lang="ts">
  import type { I18n } from "./i18n.svelte.js";
  import LocaleToggle from "./LocaleToggle.svelte";

  const { i18n }: { i18n: I18n<"pt" | "en"> } = $props();
</script>

<LocaleToggle {i18n} label="Idioma" />
<p data-testid="greeting">{i18n.t("greeting", { name: "Ada" })}</p>
<p data-testid="days">{i18n.t("days", { count: 2 })}</p>
