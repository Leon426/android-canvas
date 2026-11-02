import { describe, expect, it, vi } from "vitest";
import {
  backupCorruptDoc,
  DOC_CORRUPT_KEY,
  isQuotaExceededError,
  parseLocalDoc,
  safeSetStorageItem,
} from "./localDoc";
import type { Doc } from "./tokens";

const VALID_DOC: Doc = {
  title: "Test",
  brief: "Brief",
  groups: [],
  frames: [],
  paletteKey: "expressive",
  frame: "phone",
};

describe("parseLocalDoc", () => {
  it("treats null, undefined, and empty string as missing", () => {
    expect(parseLocalDoc(null)).toEqual({ ok: false, reason: "missing" });
    expect(parseLocalDoc(undefined)).toEqual({ ok: false, reason: "missing" });
    expect(parseLocalDoc("")).toEqual({ ok: false, reason: "missing" });
  });

  it("restores a valid document payload", () => {
    const raw = JSON.stringify(VALID_DOC);
    const res = parseLocalDoc(raw);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.doc.paletteKey).toBe("expressive");
    }
  });

  it("marks invalid JSON as corrupt with raw payload preserved", () => {
    const res = parseLocalDoc("{bad-json");
    expect(res).toEqual({ ok: false, reason: "corrupt", raw: "{bad-json" });
  });

  it("marks non-project JSON as corrupt", () => {
    const res = parseLocalDoc(JSON.stringify({ not: "a project" }));
    expect(res).toEqual({ ok: false, reason: "corrupt", raw: JSON.stringify({ not: "a project" }) });
  });
});

describe("backupCorruptDoc", () => {
  it("writes corrupt payload to DOC_CORRUPT_KEY", () => {
    const store: Record<string, string> = {};
    const mockStorage = {
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
    backupCorruptDoc("{corrupted}", mockStorage);
    expect(store[DOC_CORRUPT_KEY]).toBe("{corrupted}");
  });

  it("does not throw if setItem fails", () => {
    const mockStorage = {
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    };
    expect(() => backupCorruptDoc("{corrupted}", mockStorage)).not.toThrow();
  });
});

describe("isQuotaExceededError and safeSetStorageItem", () => {
  it("recognizes DOMException QuotaExceededError", () => {
    const quotaErr = new DOMException("The quota has been exceeded", "QuotaExceededError");
    expect(isQuotaExceededError(quotaErr)).toBe(true);
  });

  it("recognizes error objects with name QuotaExceededError", () => {
    expect(isQuotaExceededError({ name: "QuotaExceededError" })).toBe(true);
    expect(isQuotaExceededError({ name: "NS_ERROR_DOM_QUOTA_REACHED" })).toBe(true);
    expect(isQuotaExceededError(new Error("random error"))).toBe(false);
  });

  it("safeSetStorageItem returns ok: true when write succeeds", () => {
    const store: Record<string, string> = {};
    const mock = {
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    };
    const res = safeSetStorageItem("key", "value", mock);
    expect(res).toEqual({ ok: true });
    expect(store["key"]).toBe("value");
  });

  it("safeSetStorageItem returns quota: true when quota is exceeded", () => {
    const quotaErr = new DOMException("Quota exceeded", "QuotaExceededError");
    const mock = {
      setItem: () => {
        throw quotaErr;
      },
    };
    const res = safeSetStorageItem("key", "value", mock);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.quota).toBe(true);
      expect(res.error).toBe(quotaErr);
    }
  });
});
