import { normalizeComponentLibrary, type ComponentLibrary } from "./componentLibrary";
import type { Doc } from "./tokens";

export type AgentBundle = {
  format: "android-canvas-agent-bundle";
  version: 1;
  target: "android-jetpack-compose";
  prompt: string;
  prototype: Pick<Doc, "title" | "brief" | "frames" | "groups" | "theme" | "paletteKey" | "customPalette" | "dynamicColor">;
  componentLibrary: ComponentLibrary;
};

/** Build the stable, JSON-safe core of the future downloadable Agent Bundle. */
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

