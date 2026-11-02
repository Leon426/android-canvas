import { isProject } from "./project";
import type { Doc } from "./tokens";

/** Autosaved canvas document in the browser. */
export const DOC_KEY = "m3e:doc";
/** Last corrupt payload kept for diagnosis after a failed restore. */
export const DOC_CORRUPT_KEY = "m3e:doc:corrupt";

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
