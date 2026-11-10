import { render } from "svelte/server";
import { expect, it } from "vitest";
import { ApiError } from "../http.js";
import RequestErrorDisplay from "./RequestErrorDisplay.svelte";

it.each([
  ["an unclassifiable error", new Error("boom"), "Something went wrong"],
  ["a thrown string", "boom", "Something went wrong"],
  ["null", null, "Something went wrong"],
  ["a server error", new ApiError(500, "down"), "Server error"],
  ["a network failure", new TypeError("fetch failed"), "Connection problem"],
])("renders %s on the server instead of throwing", (_label, error, title) => {
  const { body } = render(RequestErrorDisplay, { props: { error } });

  expect(body).toContain(title);
});
