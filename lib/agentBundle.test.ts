import { describe, expect, it } from "vitest";
import { buildAgentBundle } from "./agentBundle";
import type { Doc } from "./tokens";

describe("buildAgentBundle", () => {
  it("packages the prompt, prototype, and reusable definitions without editor-only prompt state", () => {
    const doc: Doc = {
      title: "Notes", brief: "Fast notes", paletteKey: "purple", frame: "phone",
      frames: [{ id: "home", name: "Home", x: 0, y: 0 }], groups: [],
      promptEdit: "private editor draft", promptOptions: ["tests"],
      componentLibrary: { schemaVersion: 2, activePackageId: "notes", packages: [{ id: "notes", name: "Notes", definitions: [
        { id: "main-fab", name: "Main FAB", baseKind: "fab", style: { radiusTop: 20 } },
      ] }] },
    };
    const bundle = buildAgentBundle(doc, "Build the Notes app.");
    expect(bundle).toMatchObject({ format: "android-canvas-agent-bundle", version: 1, target: "android-jetpack-compose" });
    expect(bundle.prompt).toBe("Build the Notes app.");
    expect(bundle.componentLibrary.packages[0].definitions[0].id).toBe("main-fab");
    expect(bundle.prototype).not.toHaveProperty("promptEdit");
    expect(JSON.parse(JSON.stringify(bundle))).toEqual(bundle);
  });
});

