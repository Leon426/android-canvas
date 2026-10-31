import { normalizeComponentLibrary, type ComponentLibrary } from "./componentLibrary";
import type { Doc } from "./tokens";

export type AgentBundle = {
  format: "android-canvas-agent-bundle";
  version: 1;
  target: "android-jetpack-compose";
  prompt: string;
  /** Unresolved canvas groups: component instances keep their definition refs. */
  prototype: Pick<Doc, "title" | "brief" | "frames" | "groups" | "theme" | "paletteKey" | "customPalette" | "dynamicColor">;
  componentLibrary: ComponentLibrary;
};

/** Build the stable, JSON-safe core of the downloadable Agent Bundle.
 *  Pass the editor's unresolved document so `prototype.groups` keep instance refs;
 *  pair with a prompt built from the resolved view for readable layout text. */
export function buildAgentBundle(doc: Doc, prompt: string): AgentBundle {
  return {
    format: "android-canvas-agent-bundle",
    version: 1,
    target: "android-jetpack-compose",
    prompt,
    prototype: {
      title: doc.title,
      brief: doc.brief,
      frames: doc.frames,
      groups: doc.groups,
      theme: doc.theme,
      paletteKey: doc.paletteKey,
      customPalette: doc.customPalette,
      dynamicColor: doc.dynamicColor,
    },
    componentLibrary: normalizeComponentLibrary(doc.componentLibrary),
  };
}

/** File name for a downloaded Agent Bundle JSON. */
export function agentBundleFileName(doc: Pick<Doc, "title">): string {
  const name = doc.title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name ? `m3e-agent-bundle ${name}.json` : "m3e-agent-bundle.json";
}

/** Hand the Agent Bundle to the browser as a JSON download. */
export function downloadAgentBundle(doc: Doc, prompt: string): void {
  const bundle = buildAgentBundle(doc, prompt);
  const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = agentBundleFileName(doc);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
