import { describe, expect, it } from "vitest";
import { agentBundleFileName, buildAgentBundle } from "./agentBundle";
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

  it("keeps unresolved component instance refs on prototype groups", () => {
    const doc: Doc = {
      title: "Notes", brief: "", paletteKey: "purple", frame: "phone",
      frames: [{ id: "home", name: "Home", x: 0, y: 0 }],
      groups: [{
        id: "g", x: 0, y: 0, axis: "x",
        items: [{
          id: "fab1", kind: "fab", label: "", icon: "add", variant: "filled",
          component: { packageId: "notes", definitionId: "main-fab", overrides: { radiusTop: 12 } },
        }],
      }],
      componentLibrary: { schemaVersion: 2, activePackageId: "notes", packages: [{ id: "notes", name: "Notes", definitions: [
        { id: "main-fab", name: "Main FAB", baseKind: "fab", style: { radiusTop: 20 } },
      ] }] },
    };
    const bundle = buildAgentBundle(doc, "Build it.");
    expect(bundle.prototype.groups[0].items[0].component).toEqual({
      packageId: "notes", definitionId: "main-fab", overrides: { radiusTop: 12 },
    });
    expect(bundle).not.toHaveProperty("resolved");
  });

  it("names the download file from the document title", () => {
    expect(agentBundleFileName({ title: "Notes" })).toBe("m3e-agent-bundle Notes.json");
    expect(agentBundleFileName({ title: "  " })).toBe("m3e-agent-bundle.json");
  });
});
