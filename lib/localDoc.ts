import { isProject } from "./project";
import type { Doc } from "./tokens";

/** Autosaved canvas document in the browser. */
export const DOC_KEY = "m3e:doc";
/** Last corrupt payload kept for diagnosis after a failed restore. */
export const DOC_CORRUPT_KEY = "m3e:doc:corrupt";
export const BEFORE_KEY = "m3e:doc:before";
export const DOC_LOCK = "m3e:doc:editor";
export const UI_KEY = "m3e:ui";

export type LocalDocRestore =
  | { ok: true; doc: Doc }
  | { ok: false; reason: "missing" }
  | { ok: false; reason: "corrupt"; raw: string };

/**
 * Parse a localStorage document the same way file import / share do: only an
 * `isProject` payload is trusted. Invalid JSON and malformed shapes are corrupt.
 */
export function parseLocalDoc(raw: string | null | undefined): LocalDocRestore {
  if (raw == null || raw === "") return { ok: false, reason: "missing" };
  try {
    const value: unknown = JSON.parse(raw);
    if (isProject(value)) return { ok: true, doc: value };
  } catch {
    /* invalid JSON is treated as corrupt, same as a malformed project */
  }
  return { ok: false, reason: "corrupt", raw };
}

/** Keep the bad payload for diagnosis; never re-write it to DOC_KEY. */
export function backupCorruptDoc(raw: string, storage: Pick<Storage, "setItem"> = localStorage): void {
  try {
    storage.setItem(DOC_CORRUPT_KEY, raw);
  } catch {
    /* quota / private mode: drop the backup rather than blocking recovery */
  }
}

/**
 * Checks whether an exception indicates the browser's storage quota has been exceeded.
 */
export function isQuotaExceededError(err: unknown): boolean {
  if (typeof DOMException !== "undefined" && err instanceof DOMException) {
    return (
      err.name === "QuotaExceededError" ||
      err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err.code === 22 ||
      err.code === 1014
    );
  }
  if (err && typeof err === "object" && "name" in err) {
    const name = String((err as { name?: unknown }).name);
    return name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED";
  }
  return false;
}

export type SetStorageResult = { ok: true } | { ok: false; quota: boolean; error: unknown };

/**
 * Safely writes to localStorage, distinguishing between quota errors and other failures.
 */
export function safeSetStorageItem(
  key: string,
  value: string,
  storage: Pick<Storage, "setItem"> = localStorage,
): SetStorageResult {
  try {
    storage.setItem(key, value);
    return { ok: true };
  } catch (err) {
    return { ok: false, quota: isQuotaExceededError(err), error: err };
  }
}
