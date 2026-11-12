import { expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Avatar from "./Avatar.svelte";

const PHOTO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const BROKEN = "data:image/png;base64,AAAA";

const disc = () => document.querySelector<HTMLElement>(".plinth-avatar")!;
const photo = () => disc().querySelector("img");

it("draws the initials on a disc when there is no photo", () => {
  render(Avatar, { name: "Ada Lovelace" });

  expect(disc().textContent).toBe("AL");
  expect(photo()).toBeNull();
  expect(getComputedStyle(disc()).borderRadius).toBe("9999px");
  expect(disc().getAttribute("aria-hidden")).toBe("true");
});

it("shows the photo in place of the initials", () => {
  render(Avatar, { name: "Ada Lovelace", src: PHOTO });

  expect(photo()?.getAttribute("src")).toBe(PHOTO);
  expect(photo()?.getAttribute("alt")).toBe("");
  expect(disc().textContent).toBe("");
});

it("falls back to the initials when the photo fails to load", async () => {
  render(Avatar, { name: "Ada Lovelace", src: BROKEN });

  await expect.poll(() => photo()).toBeNull();
  expect(disc().textContent).toBe("AL");
});

it("tries a new photo after an earlier one failed", async () => {
  const { rerender } = render(Avatar, { name: "Ada Lovelace", src: BROKEN });
  await expect.poll(() => photo()).toBeNull();

  await rerender({ src: PHOTO });

  expect(photo()?.getAttribute("src")).toBe(PHOTO);
});

it("scales the disc and the initials with the size", () => {
  render(Avatar, { name: "Ada Lovelace", size: "64px" });

  const style = getComputedStyle(disc());
  expect(style.width).toBe("64px");
  expect(style.height).toBe("64px");
  expect(style.fontSize).toBe("24px");
});

it("centres the initials on their capitals rather than on the font's line box", () => {
  render(Avatar, { name: "Ada Lovelace" });

  const box = disc().getBoundingClientRect();
  const text = document.querySelector<HTMLElement>(".plinth-avatar-initials")!;
  const letters = text.getBoundingClientRect();

  // Trimmed to cap height, the text box is shorter than the font size: it holds the capitals and
  // nothing above or below them, so centring it centres what the eye sees.
  expect(letters.height).toBeLessThan(parseFloat(getComputedStyle(text).fontSize));
  expect(Math.abs(letters.top + letters.height / 2 - (box.top + box.height / 2))).toBeLessThan(0.5);
});
