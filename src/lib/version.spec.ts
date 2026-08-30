import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { LIBRARY_VERSION } from "./index.js";

it("exposes the same version as the package manifest", () => {
  const manifest = readFileSync(new URL("../../package.json", import.meta.url), "utf8");
  const { version } = JSON.parse(manifest);

  expect(LIBRARY_VERSION).toBe(version);
});
