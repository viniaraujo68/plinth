import { beforeAll, expect, it } from "vitest";
import { cdp, page } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Harness from "./CopyableHarness.spec.svelte";

// Chromium refuses both clipboard verbs in an automated context until the browser context they
// run in has been granted them -- and it is the context Playwright created for this run, not the
// default one, so the id has to be read back from the page's own target before granting. Without
// this the component would be exercised only through its failure path, which is the one branch
// that deliberately does nothing.
beforeAll(async () => {
  const session = cdp();
  const { targetInfo } = await session.send("Target.getTargetInfo");
  await session.send("Browser.grantPermissions", {
    browserContextId: targetInfo.browserContextId,
    permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
  });
});

const button = () => page.getByRole("button");

it("puts the rendered text on the clipboard", async () => {
  render(Harness);

  await button().click();

  await expect.poll(() => navigator.clipboard.readText()).toBe("acme-prod");
});

it("prefers copyableText over what the user can see", async () => {
  render(Harness, { copyableText: "acme-prod-eu-west-1" });

  await button().click();

  await expect.poll(() => navigator.clipboard.readText()).toBe("acme-prod-eu-west-1");
});

it("confirms through the accessible name and then goes back", async () => {
  render(Harness, { confirmationMs: 600 });

  await expect.element(button()).toHaveAttribute("aria-label", "Copy");

  await button().click();
  await expect.element(button()).toHaveAttribute("aria-label", "Copied");

  // The confirmation has to expire on its own: the button keeps focus after the click, so a name
  // stuck on "Copied" is what a screen reader would read for the rest of the session.
  await expect.poll(() => button().element().getAttribute("aria-label")).toBe("Copy");
});

it("names the idle button as it was told", async () => {
  render(Harness, { copyLabel: "Copiar" });

  await expect.element(button()).toHaveAttribute("aria-label", "Copiar");
});

it("names the confirming button as it was told", async () => {
  render(Harness, { copiedLabel: "Copiado" });

  await button().click();

  await expect.element(button()).toHaveAttribute("aria-label", "Copiado");
});
