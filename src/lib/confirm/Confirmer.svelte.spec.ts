import { afterEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-svelte";
import Confirmer from "./Confirmer.svelte";
import { createConfirmManager, type ConfirmManager } from "./confirm-manager.svelte.js";

// The chrome is `Modal`'s, and `Modal`'s is daisyUI's: its `.modal` is what makes a closed dialog
// invisible rather than undisplayed, which is the state the lazy unmount reads. Without the
// stylesheet these tests would exercise a different element than the one that ships.
import "../../routes/layout.css";

// Every test gets its own manager: the module-level `confirm` helper is a browser singleton, so
// sharing it would carry a pending question from one test into the next.
const mount = (props: Record<string, unknown> = {}) => {
  const manager = createConfirmManager();
  const rendered = render(Confirmer, { manager, ...props });
  return { manager, unmount: rendered.unmount };
};

const dialog = () => document.querySelector("dialog");
const focusedTestId = () => document.activeElement?.getAttribute("data-testid") ?? null;

/** Answer the question the way a click on the backdrop does: a press and a click on the dialog
 *  itself rather than on the box inside it. */
const clickBackdrop = () => {
  const element = dialog();
  element?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const ask = (manager: ConfirmManager, options: Parameters<ConfirmManager["confirm"]>[0]) => {
  const answer = manager.confirm(options);
  // Recorded as it settles so a test can assert that it has NOT settled yet, which an await
  // cannot do.
  let value: boolean | null = null;
  void answer.then((confirmed) => (value = confirmed));
  return { answer, settled: () => value };
};

afterEach(() => {
  document.body.style.overflow = "";
});

it("puts nothing on screen until something is asked", () => {
  mount();

  expect(dialog()).toBeNull();
});

it("opens a modal titled with the question and shows its description", async () => {
  const { manager } = mount();

  ask(manager, { title: "Delete this night?", description: "Twelve hands go with it." });

  await expect.element(page.getByRole("dialog", { name: "Delete this night?" })).toBeVisible();
  await expect
    .element(page.getByTestId("confirm-description"))
    .toHaveTextContent("Twelve hands go with it.");
});

it("resolves true from the confirm action", async () => {
  const { manager } = mount();
  const { answer } = ask(manager, { title: "Delete?" });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  await page.getByTestId("confirm-accept").click();

  await expect(answer).resolves.toBe(true);
});

it("resolves false from the cancel action", async () => {
  const { manager } = mount();
  const { answer } = ask(manager, { title: "Delete?" });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  await page.getByTestId("confirm-cancel").click();

  await expect(answer).resolves.toBe(false);
});

it("resolves false on Escape", async () => {
  const { manager } = mount();
  const { answer } = ask(manager, { title: "Delete?" });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  await userEvent.keyboard("{Escape}");

  await expect(answer).resolves.toBe(false);
});

it("resolves false on a click on the backdrop", async () => {
  const { manager } = mount();
  const { answer } = ask(manager, { title: "Delete?" });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  clickBackdrop();

  await expect(answer).resolves.toBe(false);
});

it("resolves false from the close button", async () => {
  const { manager } = mount();
  const { answer } = ask(manager, { title: "Delete?" });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await expect(answer).resolves.toBe(false);
});

it("opens on cancel rather than on the destructive action", async () => {
  const { manager } = mount();
  ask(manager, { title: "Delete?", danger: true });

  await expect.element(page.getByRole("dialog")).toBeVisible();

  // The browser's own choice is the first focusable descendant -- the ✕ -- and a dialog opened one
  // key press away from a destructive action is the bug this whole component exists to avoid.
  await expect.poll(focusedTestId).toBe("confirm-cancel");
});

it("confirms nothing when Enter lands on the freshly opened dialog", async () => {
  const { manager } = mount();
  const { settled } = ask(manager, { title: "Delete?", danger: true });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  await expect.poll(focusedTestId).toBe("confirm-cancel");
  await userEvent.keyboard("{Enter}");

  await expect.poll(settled).toBe(false);
});

it("styles the confirm action as destructive only when the call asks for it", async () => {
  const { manager } = mount();

  const plain = ask(manager, { title: "Archive?" });
  await expect.element(page.getByRole("dialog")).toBeVisible();
  const plainAction = page.getByTestId("confirm-accept").element();
  expect([...plainAction.classList]).toContain("btn-primary");
  expect(plainAction.getAttribute("data-danger")).toBeNull();

  await page.getByTestId("confirm-cancel").click();
  await expect(plain.answer).resolves.toBe(false);

  ask(manager, { title: "Delete?", danger: true });
  await expect.element(page.getByRole("dialog", { name: "Delete?" })).toBeVisible();
  await expect
    .poll(() => page.getByTestId("confirm-accept").element().getAttribute("data-danger"))
    .toBe("true");
  expect([...page.getByTestId("confirm-accept").element().classList]).toContain("btn-error");
});

it("opens in the challenge input rather than on cancel", async () => {
  const { manager } = mount();
  ask(manager, { title: "Delete the group?", challenge: "Thursday Regulars" });

  await expect.element(page.getByRole("dialog")).toBeVisible();

  await expect.poll(focusedTestId).toBe("confirm-challenge");
});

it("labels the challenge input with the string that has to be typed", async () => {
  const { manager } = mount();
  ask(manager, { title: "Delete the group?", challenge: "Thursday Regulars" });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  await expect
    .element(page.getByLabelText("Type Thursday Regulars to confirm"))
    .toBeInTheDocument();
});

it("keeps the confirm action disabled until the challenge matches exactly", async () => {
  const { manager } = mount();
  const { answer } = ask(manager, { title: "Delete the group?", challenge: "Thursday Regulars" });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  const action = page.getByTestId("confirm-accept");
  await expect.element(action).toBeDisabled();

  await page.getByTestId("confirm-challenge").fill("Thursday");
  await expect.element(action).toBeDisabled();

  // Case is not folded: the spelling is the point of the gate.
  await page.getByTestId("confirm-challenge").fill("thursday regulars");
  await expect.element(action).toBeDisabled();

  // Whitespace at the ends is, because a name copied off the row above picks one up.
  await page.getByTestId("confirm-challenge").fill("  Thursday Regulars  ");
  await expect.element(action).toBeEnabled();

  await action.click();
  await expect(answer).resolves.toBe(true);
});

it("confirms from Enter in the challenge input only once it matches", async () => {
  const { manager } = mount();
  const { answer, settled } = ask(manager, { title: "Delete?", challenge: "burn-it" });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  const input = page.getByTestId("confirm-challenge");

  await input.fill("burn-i");
  await userEvent.keyboard("{Enter}");
  await expect.poll(settled).toBeNull();
  await expect.element(page.getByRole("dialog")).toBeVisible();

  await input.fill("burn-it");
  await userEvent.keyboard("{Enter}");

  await expect(answer).resolves.toBe(true);
});

it("queues a second question behind the first instead of stacking or replacing it", async () => {
  const { manager } = mount();

  const first = ask(manager, { title: "First question" });
  const second = ask(manager, { title: "Second question" });

  await expect.element(page.getByRole("dialog", { name: "First question" })).toBeVisible();
  expect(document.querySelectorAll("dialog")).toHaveLength(1);
  expect(second.settled()).toBeNull();

  await page.getByTestId("confirm-cancel").click();
  await expect(first.answer).resolves.toBe(false);

  await expect.element(page.getByRole("dialog", { name: "Second question" })).toBeVisible();
  await page.getByTestId("confirm-accept").click();

  await expect(second.answer).resolves.toBe(true);
});

it("starts the queued question with an empty challenge input", async () => {
  const { manager } = mount();

  const first = ask(manager, { title: "First", challenge: "one" });
  ask(manager, { title: "Second", challenge: "two" });

  await expect.element(page.getByRole("dialog", { name: "First" })).toBeVisible();
  await page.getByTestId("confirm-challenge").fill("one");
  await page.getByTestId("confirm-accept").click();
  await expect(first.answer).resolves.toBe(true);

  await expect.element(page.getByRole("dialog", { name: "Second" })).toBeVisible();
  await expect.element(page.getByTestId("confirm-challenge")).toHaveValue("");
  await expect.element(page.getByTestId("confirm-accept")).toBeDisabled();
});

it("takes every label from the host, and lets a single call override any of them", async () => {
  const { manager } = mount({
    confirmLabel: "Supprimer",
    cancelLabel: "Annuler",
    closeLabel: "Fermer",
    challengeLabel: (challenge: string) => `Saisissez ${challenge} pour confirmer`,
  });

  const first = ask(manager, { title: "Supprimer la photo ?", challenge: "photo-2024" });
  await expect.element(page.getByRole("dialog")).toBeVisible();
  await expect.element(page.getByTestId("confirm-accept")).toHaveTextContent("Supprimer");
  await expect.element(page.getByTestId("confirm-cancel")).toHaveTextContent("Annuler");
  await expect.element(page.getByRole("button", { name: "Fermer" })).toBeInTheDocument();
  await expect
    .element(page.getByLabelText("Saisissez photo-2024 pour confirmer"))
    .toBeInTheDocument();

  await page.getByTestId("confirm-cancel").click();
  await expect(first.answer).resolves.toBe(false);

  ask(manager, {
    title: "Vider la corbeille ?",
    confirmLabel: "Tout vider",
    cancelLabel: "Garder",
    challenge: "corbeille",
    challengeLabel: "Tapez corbeille",
  });
  await expect.element(page.getByRole("dialog", { name: "Vider la corbeille ?" })).toBeVisible();
  await expect.element(page.getByTestId("confirm-accept")).toHaveTextContent("Tout vider");
  await expect.element(page.getByTestId("confirm-cancel")).toHaveTextContent("Garder");
  await expect.element(page.getByLabelText("Tapez corbeille")).toBeInTheDocument();
});

it("cancels a question left open when the host unmounts", async () => {
  const { manager, unmount } = mount();
  const { answer } = ask(manager, { title: "Delete?" });

  await expect.element(page.getByRole("dialog")).toBeVisible();
  await unmount();

  // A promise nobody can ever answer is worse than a false.
  await expect(answer).resolves.toBe(false);
});

// Measured, not eyeballed: a question whose whole content is its title used to render an empty
// padded strip where the body would have been.
const bands = () => {
  const box = document.querySelector<HTMLElement>(".modal-box")!;
  const style = getComputedStyle(box);
  const height = (element: Element) => element.getBoundingClientRect().height;

  return {
    // The box's own 1px border is not a band, and `getBoundingClientRect` counts it at both ends.
    beyondTheBands:
      height(box) -
      parseFloat(style.borderTopWidth) -
      parseFloat(style.borderBottomWidth) -
      height(box.querySelector("header")!) -
      height(box.querySelector("footer")!),
    footerRule: getComputedStyle(box.querySelector("footer")!).borderTopWidth,
  };
};

it("gives a title-only question no body band between the title and the actions", async () => {
  const { manager } = mount();
  ask(manager, { title: "Delete this night?", danger: true });

  await expect.element(page.getByRole("dialog")).toBeVisible();

  expect(page.getByTestId("confirm-body").query()).toBeNull();
  expect(bands().beyondTheBands).toBeLessThan(1);
  expect(bands().footerRule).toBe("0px");
});

it("keeps the body band for a question that carries a description", async () => {
  const { manager } = mount();
  ask(manager, { title: "Delete this night?", description: "Twelve hands go with it." });

  await expect.element(page.getByTestId("confirm-description")).toBeVisible();

  expect(bands().beyondTheBands).toBeGreaterThan(20);
  expect(bands().footerRule).toBe("1px");
});

it("keeps the body band for a question whose only content is its challenge", async () => {
  const { manager } = mount();
  ask(manager, { title: "Delete the group?", challenge: "Thursday Regulars" });

  await expect.element(page.getByTestId("confirm-challenge")).toBeVisible();

  expect(bands().beyondTheBands).toBeGreaterThan(20);
  expect(bands().footerRule).toBe("1px");
});
