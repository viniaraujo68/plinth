import { afterEach, expect, it } from "vitest";
import { createCssColorReader } from "./css-color.js";

const host = document.createElement("div");

afterEach(() => {
  host.remove();
  host.removeAttribute("style");
  host.replaceChildren();
});

const mount = () => {
  document.body.appendChild(host);
  return createCssColorReader(host);
};

it("resolves a custom property against the host's own cascade", () => {
  host.style.setProperty("--series", "rgb(10, 20, 30)");
  const reader = mount();

  expect(reader.read("var(--series)", "black")).toBe("rgb(10, 20, 30)");
});

it("resolves a color-mix over tokens into a concrete colour", () => {
  host.style.setProperty("--ink", "rgb(0, 0, 0)");
  const reader = mount();

  const mixed = reader.read("color-mix(in srgb, var(--ink) 50%, rgb(255, 255, 255))", "black");

  expect(mixed).not.toBe("black");
  expect(mixed).toMatch(/^(rgb|color)\(/);
});

it("answers the fallback for an expression the browser rejects", () => {
  const reader = mount();

  expect(reader.read("not-a-colour(", "rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
});

it("removes its probe on dispose and answers the fallback afterwards", () => {
  const reader = mount();
  expect(host.childElementCount).toBe(1);

  reader.dispose();

  expect(host.childElementCount).toBe(0);
  expect(reader.read("red", "blue")).toBe("blue");
});
