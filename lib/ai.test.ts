import { afterEach, describe, expect, it, vi } from "vitest";
import { complete, DEFAULT_AI, hasKey, isSecureUrl, isValidAiKey, keyScopeOf, loadAiSettings, normalizeAiKey, saveAiSettings, switchProvider, updateProviderConfig, type AiSettings, type Provider } from "./ai";

const settings = (over: Partial<AiSettings> = {}): AiSettings =>
  ({ provider: "openai", baseUrl: "https://api.example.test", model: "test-model", key: "test-key", ...over });

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("complete on the claude path", () => {
  it("posts to the messages endpoint with the anthropic headers and body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ content: [{ type: "text", text: "hi" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const s = settings({ provider: "claude", baseUrl: "https://api.example.test/", key: "  test-key  " });
    await expect(complete(s, "sys prompt", "user prompt")).resolves.toBe("hi");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/messages");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      "content-type": "application/json",
      "x-api-key": "test-key",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    });
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "test-model", max_tokens: 4096, system: "sys prompt", messages: [{ role: "user", content: "user prompt" }] });
  });

  it("joins only the text blocks of the reply", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      content: [{ type: "text", text: "a" }, { type: "tool_use", id: "t" }, { type: "text", text: "b" }],
    })));
    await expect(complete(settings({ provider: "claude" }), "s", "u")).resolves.toBe("ab");
  });

  it("returns an empty string for an empty content array instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ content: [] })));
    await expect(complete(settings({ provider: "claude" }), "s", "u")).resolves.toBe("");
  });

  it("throws long when the reply stops at max_tokens", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ content: [{ type: "text", text: "partial" }], stop_reason: "max_tokens" })));
    await expect(complete(settings({ provider: "claude" }), "s", "u")).rejects.toThrow("long");
  });

  it("throws refusal when the model refuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ content: [], stop_reason: "refusal" })));
    await expect(complete(settings({ provider: "claude" }), "s", "u")).rejects.toThrow("refusal");
  });

  it("throws the status and provider detail on an http error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "overloaded" } }), { status: 529, statusText: "Overloaded" })));
    await expect(complete(settings({ provider: "claude" }), "s", "u")).rejects.toThrow("529 Overloaded: overloaded");
  });
});

describe("complete on the openai-compatible path", () => {
  it("sends bearer auth and omits max_tokens for the openai provider", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ finish_reason: "stop", message: { content: "ok" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(complete(settings(), "sys prompt", "user prompt")).resolves.toBe("ok");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json", authorization: "Bearer test-key" });
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ model: "test-model", messages: [{ role: "system", content: "sys prompt" }, { role: "user", content: "user prompt" }] });
    expect(body).not.toHaveProperty("max_tokens");
  });

  it.each(["gemini", "deepseek"] as Provider[])("sends a max_tokens budget to %s", async (provider) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ finish_reason: "stop", message: { content: "ok" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(complete(settings({ provider }), "s", "u")).resolves.toBe("ok");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).max_tokens).toBe(4096);
  });

  it("calls a local endpoint without a key and without an authorization header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: "local" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    const s = settings({ baseUrl: "http://localhost:11434/v1/", key: "" });
    await expect(complete(s, "s", "u")).resolves.toBe("local");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:11434/v1/chat/completions");
    expect(init.headers).toEqual({ "content-type": "application/json" });
  });

  it("joins array content parts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: [{ text: "a" }, {}, { text: "b" }] } }] })));
    await expect(complete(settings(), "s", "u")).resolves.toBe("ab");
  });

  it("throws long when finish_reason is length", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ choices: [{ finish_reason: "length", message: { content: "partial" } }] })));
    await expect(complete(settings(), "s", "u")).rejects.toThrow("long");
  });

  it("throws the status and provider detail on an http error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "bad key" } }), { status: 401, statusText: "Unauthorized" })));
    await expect(complete(settings(), "s", "u")).rejects.toThrow("401 Unauthorized: bad key");
  });

  it("throws empty when the reply has no content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ choices: [{ finish_reason: "stop", message: {} }] })));
    await expect(complete(settings(), "s", "u")).rejects.toThrow("empty");
  });
});

describe("complete input guards", () => {
  it.each([
    ["insecure", { baseUrl: "http://api.example.test" }],
    ["model", { model: "  " }],
  ])("rejects %s without calling fetch", async (message, over) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(complete(settings(over), "s", "u")).rejects.toThrow(message);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("hasKey and isSecureUrl", () => {
  it("requires a key for hosted endpoints but not for this machine", () => {
    expect(hasKey(settings())).toBe(true);
    expect(hasKey(settings({ key: "  " }))).toBe(false);
    expect(hasKey(settings({ key: "", baseUrl: "http://localhost:11434/v1" }))).toBe(true);
  });

  it("only allows https or an endpoint on this machine", () => {
    expect(isSecureUrl("https://api.example.test/v1")).toBe(true);
    expect(isSecureUrl("http://localhost:8080/v1")).toBe(true);
    expect(isSecureUrl("http://127.0.0.1:8080/v1")).toBe(true);
    expect(isSecureUrl("http://[::1]:8080/v1")).toBe(true);
    expect(isSecureUrl("http://api.example.test/v1")).toBe(false);
  });
});

describe("per-provider configuration and switching", () => {
  it("keeps keys and configurations strictly isolated between providers", () => {
    let s = { ...DEFAULT_AI };

    // Set DeepSeek key and custom model
    s = switchProvider(s, "deepseek");
    expect(s.provider).toBe("deepseek");
    expect(s.key).toBe("");

    s = updateProviderConfig(s, { key: "sk-deepseek-xyz", model: "deepseek-chat" });
    expect(s.key).toBe("sk-deepseek-xyz");
    expect(s.model).toBe("deepseek-chat");

    // Switch to Claude - key must NOT be shared or carried over
    s = switchProvider(s, "claude");
    expect(s.provider).toBe("claude");
    expect(s.key).toBe("");
    expect(s.model).not.toBe("deepseek-chat");

    // Set Claude key
    s = updateProviderConfig(s, { key: "sk-ant-claude-999" });
    expect(s.key).toBe("sk-ant-claude-999");

    // Switch back to DeepSeek - original key and model must be restored
    s = switchProvider(s, "deepseek");
    expect(s.provider).toBe("deepseek");
    expect(s.key).toBe("sk-deepseek-xyz");
    expect(s.model).toBe("deepseek-chat");

    // Switch back to Claude - Claude key must be intact
    s = switchProvider(s, "claude");
    expect(s.provider).toBe("claude");
    expect(s.key).toBe("sk-ant-claude-999");
  });

  it("persists and restores per-provider configuration in localStorage", () => {
    const store: Record<string, string> = {};
    const mockStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    };
    vi.stubGlobal("localStorage", mockStorage);

    let s = { ...DEFAULT_AI };
    s = switchProvider(s, "deepseek");
    s = updateProviderConfig(s, { key: "ds-secret-key" });
    saveAiSettings(s);

    const loaded = loadAiSettings();
    expect(loaded.provider).toBe("deepseek");
    expect(loaded.key).toBe("ds-secret-key");
    expect(loaded.providers?.deepseek?.key).toBe("ds-secret-key");
    expect(loaded.providers?.claude?.key).toBe("");
  });

  it("handles legacy localStorage format gracefully", () => {
    const mockStorage = {
      getItem: () => JSON.stringify({ provider: "deepseek", key: "legacy-key", model: "legacy-model", baseUrl: "https://legacy.url" }),
      setItem: () => {},
      removeItem: () => {},
    };
    vi.stubGlobal("localStorage", mockStorage);

    const loaded = loadAiSettings();
    expect(loaded.provider).toBe("deepseek");
    expect(loaded.key).toBe("legacy-key");
    expect(loaded.model).toBe("legacy-model");
    expect(loaded.baseUrl).toBe("https://legacy.url");
    expect(loaded.keyScope).toBe("device");
    // Ensure other providers are initialized with their defaults and empty keys
    expect(loaded.providers?.claude?.key).toBe("");
    expect(loaded.providers?.openai?.key).toBe("");
  });
});

describe("key storage scope and key validation", () => {
  const memoryStorage = () => {
    const store: Record<string, string> = {};
    return {
      store,
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
    };
  };

  const bothStorages = () => {
    const device = memoryStorage();
    const session = memoryStorage();
    vi.stubGlobal("localStorage", device);
    vi.stubGlobal("sessionStorage", session);
    return { device, session };
  };

  it("trims a key and rejects one that is only whitespace", () => {
    expect(normalizeAiKey("  sk-abc  ")).toBe("sk-abc");
    expect(normalizeAiKey("   ")).toBe("");
    expect(normalizeAiKey(undefined)).toBe("");
    expect(isValidAiKey("  sk-abc  ")).toBe(true);
    expect(isValidAiKey("   ")).toBe(false);
    expect(isValidAiKey("")).toBe(false);
  });

  it("treats settings without a scope as device-scoped", () => {
    expect(keyScopeOf({})).toBe("device");
    expect(keyScopeOf({ keyScope: "session" })).toBe("session");
  });

  it("writes a session-scoped key to sessionStorage and never to localStorage", () => {
    const { device, session } = bothStorages();
    saveAiSettings({ ...settings({ key: "  sk-session  " }), keyScope: "session" });

    expect(JSON.parse(session.store["m3e:ai"]).key).toBe("sk-session");
    expect(JSON.parse(session.store["m3e:ai"]).keyScope).toBe("session");
    // the long-lived copy records the choice but carries no secret
    const longLived = JSON.parse(device.store["m3e:ai"]);
    expect(longLived.key).toBe("");
    expect(longLived.keyScope).toBe("session");
    for (const p of ["openai", "claude", "gemini", "deepseek"]) {
      expect(longLived.providers[p].key).toBe("");
    }

    const loaded = loadAiSettings();
    expect(loaded.key).toBe("sk-session");
    expect(loaded.keyScope).toBe("session");
    expect(loaded.provider).toBe("openai");
  });

  it("forgets a session key when the browser closes but keeps the scope choice", () => {
    const { device, session } = bothStorages();
    saveAiSettings({ ...settings({ key: "sk-live" }), keyScope: "session" });

    // a new browser session starts with an empty sessionStorage
    session.removeItem("m3e:ai");

    const loaded = loadAiSettings();
    expect(loaded.key).toBe("");
    expect(loaded.keyScope).toBe("session");
    expect(JSON.parse(device.store["m3e:ai"]).key).toBe("");
  });

  it("removes the plaintext key from localStorage when switching to session", () => {
    const { device, session } = bothStorages();
    saveAiSettings({ ...settings({ key: "sk-device" }) });
    expect(JSON.parse(device.store["m3e:ai"]).key).toBe("sk-device");

    saveAiSettings({ ...settings({ key: "sk-device" }), keyScope: "session" });
    expect(JSON.parse(device.store["m3e:ai"]).key).toBe("");
    expect(JSON.parse(session.store["m3e:ai"]).key).toBe("sk-device");
  });

  it("clears the session copy when switching back to device scope", () => {
    const { device, session } = bothStorages();
    saveAiSettings({ ...settings({ key: "sk-keep" }), keyScope: "session" });
    saveAiSettings({ ...settings({ key: "sk-keep" }) });

    expect(JSON.parse(device.store["m3e:ai"]).key).toBe("sk-keep");
    expect(device.store["m3e:ai"]).toContain('"keyScope":"device"');
    expect(session.store["m3e:ai"]).toBeUndefined();

    const loaded = loadAiSettings();
    expect(loaded.key).toBe("sk-keep");
    expect(loaded.keyScope).toBe("device");
  });

  it("trims a padded key before persisting it and never stores whitespace", () => {
    const { device } = bothStorages();
    saveAiSettings({ ...settings({ key: "  sk-padded  " }) });
    expect(JSON.parse(device.store["m3e:ai"]).key).toBe("sk-padded");
    expect(loadAiSettings().key).toBe("sk-padded");

    saveAiSettings({ ...settings({ key: "    " }) });
    expect(JSON.parse(device.store["m3e:ai"]).key).toBe("");
    expect(loadAiSettings().key).toBe("");
  });
});

describe("isSecureUrl", () => {
  it("accepts an https endpoint", () => {
    expect(isSecureUrl("https://api.example.test")).toBe(true);
  });

  it("accepts a server on this machine over http", () => {
    expect(isSecureUrl("http://localhost:1234")).toBe(true);
    expect(isSecureUrl("http://127.0.0.1:1234/v1")).toBe(true);
    expect(isSecureUrl("http://[::1]:1234")).toBe(true);
  });

  it("rejects plain http to a remote host", () => {
    expect(isSecureUrl("http://api.example.test")).toBe(false);
  });

  it("rejects a userinfo trick that only looks local", () => {
    expect(isSecureUrl("http://127.0.0.1:8080@evil.example")).toBe(false);
  });
});
