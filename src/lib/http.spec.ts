import { afterEach, expect, it, vi } from "vitest";
import { ApiError, createHttpClient, errorMessage, errorStatus } from "./http.js";

/** Installs a stub for the one fetch the client reaches for, and hands back the spy. */
const stubFetch = (respond: (url: string, init: RequestInit) => Response) => {
  const spy = vi.fn((url: string, init: RequestInit) => Promise.resolve(respond(url, init)));
  vi.stubGlobal("fetch", spy);
  return spy;
};

const json = (status: number, body: unknown, statusText?: string) =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });

const failing = (status: number, body: unknown) => {
  stubFetch(() => json(status, body));
  return createHttpClient({ baseUrl: "/api" });
};

/** The message of the `ApiError` a request rejects with — the assertion almost every case makes. */
const messageOf = async (run: Promise<unknown>): Promise<string> => {
  const caught = await run.then(
    () => null,
    (error: unknown) => error,
  );
  expect(caught).toBeInstanceOf(ApiError);
  return errorMessage(caught);
};

afterEach(() => {
  vi.unstubAllGlobals();
});

it("gets JSON from the joined URL without a content type", async () => {
  const spy = stubFetch(() => json(200, { id: 7, name: "Ada" }));
  const api = createHttpClient({ baseUrl: "/api" });

  await expect(api.get<{ id: number }>("/players/7")).resolves.toEqual({ id: 7, name: "Ada" });

  const [url, init] = spy.mock.calls[0];
  expect(url).toBe("/api/players/7");
  expect(init.method).toBe("GET");
  expect(init.body).toBeUndefined();
  expect(init.headers).toEqual({});
});

it("joins a trailing-slash base with a relative path exactly once", async () => {
  const spy = stubFetch(() => json(200, {}));
  const api = createHttpClient({ baseUrl: "https://api.example.com/" });

  await api.get("sessions");

  expect(spy.mock.calls[0][0]).toBe("https://api.example.com/sessions");
});

it("serializes a body and declares JSON on post, put and patch", async () => {
  const spy = stubFetch(() => json(200, { ok: true }));
  const api = createHttpClient({ baseUrl: "/api" });

  await api.post("/sessions", { buyIn: 100 });
  await api.put("/sessions/1", { buyIn: 200 });
  await api.patch("/sessions/1", { buyIn: 300 });

  expect(spy.mock.calls.map((call) => call[1].method)).toEqual(["POST", "PUT", "PATCH"]);
  expect(spy.mock.calls.map((call) => call[1].body)).toEqual([
    '{"buyIn":100}',
    '{"buyIn":200}',
    '{"buyIn":300}',
  ]);
  for (const call of spy.mock.calls)
    expect(call[1].headers).toEqual({ "Content-Type": "application/json" });
});

it("sends an empty object when a bodied request is given no body", async () => {
  const spy = stubFetch(() => json(200, {}));
  const api = createHttpClient({ baseUrl: "/api" });

  await api.post("/sessions/1/close");

  expect(spy.mock.calls[0][1].body).toBe("{}");
});

it("resolves to undefined when the response has no body", async () => {
  const spy = stubFetch(() => new Response(null, { status: 204 }));
  const api = createHttpClient({ baseUrl: "/api" });

  await expect(api.del("/sessions/1")).resolves.toBeUndefined();
  expect(spy.mock.calls[0][1].method).toBe("DELETE");
  expect(spy.mock.calls[0][1].body).toBeUndefined();
});

it("keeps a JSON null apart from an absent body", async () => {
  stubFetch(() => json(200, null));
  const api = createHttpClient({ baseUrl: "/api" });

  await expect(api.get("/players/7/note")).resolves.toBeNull();
});

it("reads a string detail", async () => {
  const api = failing(403, { detail: "You are not in this session." });

  await expect(messageOf(api.get("/sessions/1"))).resolves.toBe("You are not in this session.");
});

it("joins a FastAPI 422 detail list into one readable message", async () => {
  const api = failing(422, {
    detail: [
      { loc: ["body", "buyIn"], msg: "Input should be a valid integer" },
      { loc: ["body", "name"], msg: "Field required" },
    ],
  });

  await expect(messageOf(api.post("/sessions", {}))).resolves.toBe(
    "Input should be a valid integer; Field required",
  );
});

it("reads a coded detail object and carries the code on the error", async () => {
  stubFetch(() => json(409, { detail: { code: "session_closed", message: "Sessão encerrada." } }));
  const api = createHttpClient({ baseUrl: "/api" });

  const caught = await api.post("/sessions/1/rebuy", {}).catch((error: unknown) => error);

  expect(caught).toBeInstanceOf(ApiError);
  expect((caught as ApiError).message).toBe("Sessão encerrada.");
  expect((caught as ApiError).code).toBe("session_closed");
  expect(errorStatus(caught)).toBe(409);
});

it("reads the Go-style error envelope", async () => {
  const api = failing(500, { error: "database unavailable" });

  await expect(messageOf(api.get("/trips"))).resolves.toBe("database unavailable");
});

it("reads a bare message envelope", async () => {
  const api = failing(400, { message: "trip already finished" });

  await expect(messageOf(api.get("/trips/1"))).resolves.toBe("trip already finished");
});

it("falls back to a non-JSON error body", async () => {
  stubFetch(() => new Response("<html>502 Bad Gateway</html>", { status: 502 }));
  const api = createHttpClient({ baseUrl: "/api" });

  await expect(messageOf(api.get("/trips"))).resolves.toBe("<html>502 Bad Gateway</html>");
});

it("falls back to the status text, then to the status, on an unreadable body", async () => {
  stubFetch(() => new Response(null, { status: 404, statusText: "Not Found" }));
  const withStatusText = createHttpClient({ baseUrl: "/api" });
  await expect(messageOf(withStatusText.get("/trips/9"))).resolves.toBe("Not Found");

  stubFetch(() => json(418, { unexpected: { shape: true } }));
  const withoutStatusText = createHttpClient({ baseUrl: "/api" });
  await expect(messageOf(withoutStatusText.get("/trips/9"))).resolves.toBe("HTTP 418");
});

it("lets parseError take over, receiving the status and the parsed body", async () => {
  stubFetch(() => json(422, { detail: [{ msg: "Field required" }] }));
  const parseError = vi.fn(() => "Preencha os campos obrigatórios.");
  const api = createHttpClient({ baseUrl: "/api", parseError });

  await expect(messageOf(api.post("/sessions", {}))).resolves.toBe(
    "Preencha os campos obrigatórios.",
  );
  expect(parseError).toHaveBeenCalledWith(422, { detail: [{ msg: "Field required" }] });
});

it("falls back to the built-in extraction when parseError declines", async () => {
  stubFetch(() => json(403, { detail: "forbidden" }));
  const api = createHttpClient({ baseUrl: "/api", parseError: () => "" });

  await expect(messageOf(api.get("/sessions/1"))).resolves.toBe("forbidden");
});

it("injects a synchronous bearer token", async () => {
  const spy = stubFetch(() => json(200, {}));
  const api = createHttpClient({ baseUrl: "/api", auth: () => "static-token" });

  await api.get("/me");

  expect(spy.mock.calls[0][1].headers).toEqual({ Authorization: "Bearer static-token" });
});

it("awaits an asynchronous bearer token", async () => {
  const spy = stubFetch(() => json(200, {}));
  const api = createHttpClient({
    baseUrl: "/api",
    auth: () => Promise.resolve("refreshed-token"),
  });

  await api.post("/trips", { name: "Vegas" });

  expect(spy.mock.calls[0][1].headers).toEqual({
    "Content-Type": "application/json",
    Authorization: "Bearer refreshed-token",
  });
});

it("omits the header when there is no token yet", async () => {
  const spy = stubFetch(() => json(200, {}));
  const api = createHttpClient({ baseUrl: "/api", auth: () => "" });

  await api.get("/me");

  expect(spy.mock.calls[0][1].headers).toEqual({});
});

it("passes credentials through to fetch", async () => {
  const spy = stubFetch(() => json(200, {}));
  const api = createHttpClient({ baseUrl: "/api", credentials: "include" });

  await api.get("/me");

  expect(spy.mock.calls[0][1].credentials).toBe("include");
});

it("leaves credentials unset when the client does not ask for them", async () => {
  const spy = stubFetch(() => json(200, {}));
  const api = createHttpClient({ baseUrl: "/api" });

  await api.get("/me");

  expect(spy.mock.calls[0][1].credentials).toBeUndefined();
});

it("lets a network failure propagate untouched", async () => {
  const offline = new TypeError("Failed to fetch");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(offline)),
  );
  const api = createHttpClient({ baseUrl: "/api" });

  await expect(api.get("/me")).rejects.toBe(offline);
  expect(errorStatus(offline)).toBe(0);
});

it("reads message and status off any caught value", () => {
  expect(errorMessage(new ApiError(404, "gone"))).toBe("gone");
  expect(errorMessage(new Error("boom"))).toBe("boom");
  expect(errorMessage("just a string")).toBe("just a string");
  expect(errorMessage(undefined)).toBe("undefined");
  expect(errorMessage({ nope: true })).toBe("[object Object]");

  expect(errorStatus(new ApiError(503, "down"))).toBe(503);
  expect(errorStatus(new Error("boom"))).toBe(0);
  expect(errorStatus(null)).toBe(0);
});

it("names the error class so it survives a log", () => {
  const error = new ApiError(401, "unauthorized", "expired_token");

  expect(error.name).toBe("ApiError");
  expect(error).toBeInstanceOf(Error);
  expect(String(error)).toBe("ApiError: unauthorized");
  expect(error.code).toBe("expired_token");
  expect(new ApiError(401, "unauthorized").code).toBeUndefined();
});
