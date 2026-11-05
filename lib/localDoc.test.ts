import { describe, expect, it, vi } from "vitest";
import { DOC_CORRUPT_KEY, backupCorruptDoc, parseLocalDoc } from "./localDoc";
import type { Doc } from "./tokens";

const doc = (): Doc => ({
  title: "Sketch",
  brief: "",
  paletteKey: "purple",
  frame: "phone",
  groups: [],
  frames: [{ id: "frame", name: "Home", x: 0, y: 0 }],
});

describe("parseLocalDoc", () => {
  it("treats empty storage as missing", () => {
    expect(parseLocalDoc(null)).toEqual({ ok: false, reason: "missing" });
    expect(parseLocalDoc("")).toEqual({ ok: false, reason: "missing" });
  });

  it("accepts an isProject payload", () => {
    const value = doc();
    expect(parseLocalDoc(JSON.stringify(value))).toEqual({ ok: true, doc: value });
  });

  it("rejects invalid JSON as corrupt without throwing", () => {
    expect(parseLocalDoc("{not-json")).toEqual({ ok: false, reason: "corrupt", raw: "{not-json" });
  });

  it("rejects a JSON object that fails isProject as corrupt", () => {
    const raw = JSON.stringify({ groups: "nope", frames: [] });
    expect(parseLocalDoc(raw)).toEqual({ ok: false, reason: "corrupt", raw });
  });
});

describe("backupCorruptDoc", () => {
  it("writes the raw payload to the corrupt backup key", () => {
    const storage = { setItem: vi.fn() };
    backupCorruptDoc("bad-doc", storage);
    expect(storage.setItem).toHaveBeenCalledWith(DOC_CORRUPT_KEY, "bad-doc");
  });

  it("swallows storage failures", () => {
    const storage = {
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => backupCorruptDoc("bad-doc", storage)).not.toThrow();
  });
});
