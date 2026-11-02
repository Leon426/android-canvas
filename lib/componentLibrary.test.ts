import { describe, expect, it } from "vitest";
import { componentStyleOf, definitionsOf, normalizeComponentLibrary, resolveComponentInstance, resolveDocumentComponents, sanitizeComponentLibrary, type ComponentLibrary } from "./componentLibrary";
import type { Item } from "./tokens";

const item = (patch: Partial<Item> = {}): Item => ({
  id: "save", kind: "button", label: "Save", icon: "save", variant: "filled", ...patch,
});

const library: ComponentLibrary = {
  schemaVersion: 2, activePackageId: "actions", packages: [{ id: "actions", name: "Actions", definitions: [
    { id: "brand-action", name: "Brand action", baseKind: "button", style: { variant: "tonal", radiusTop: 20, radiusBottom: 20 } },
    { id: "danger-action", name: "Danger action", baseKind: "button", extends: "brand-action", style: { fill: "primary" } },
  ] }],
};

describe("component library", () => {
  it("applies inherited definition styles and then instance overrides", () => {
    const source = item({ component: { packageId: "actions", definitionId: "danger-action", overrides: { radiusTop: 4 } } });
    const result = resolveComponentInstance(source, library);
    expect(result.ok).toBe(true);
    expect(result.item).toMatchObject({ variant: "tonal", fill: "primary", radiusTop: 4, radiusBottom: 20 });
    expect(result.item.label).toBe("Save");
    expect(source).not.toHaveProperty("fill");
  });

  it("fails safely for a missing definition, wrong kind, or cycle", () => {
    expect(resolveComponentInstance(item({ component: { packageId: "actions", definitionId: "missing" } }), library)).toMatchObject({ ok: false, reason: "missing" });
    expect(resolveComponentInstance(item({ kind: "card", component: { packageId: "actions", definitionId: "brand-action" } }), library)).toMatchObject({ ok: false, reason: "kind" });
    const cyclic: ComponentLibrary = { schemaVersion: 2, activePackageId: "cycles", packages: [{ id: "cycles", name: "Cycles", definitions: [
      { id: "a", name: "A", baseKind: "button", extends: "b", style: {} },
      { id: "b", name: "B", baseKind: "button", extends: "a", style: {} },
    ] }] };
    expect(resolveComponentInstance(item({ component: { packageId: "cycles", definitionId: "a" } }), cyclic)).toMatchObject({ ok: false, reason: "cycle" });
  });

  it("keeps only reusable visual fields", () => {
    expect(componentStyleOf(item({ label: "Do not save", action: { to: "next", transition: "fade" }, size: 64 }))).toEqual({ variant: "filled", size: 64 });
  });

  it("resolves all instances without mutating the authored document", () => {
    const source = { componentLibrary: library, groups: [{ id: "g", x: 0, y: 0, axis: "x" as const, items: [
      item({ component: { packageId: "actions", definitionId: "brand-action" } }),
    ] }] };
    const resolved = resolveDocumentComponents(source);
    expect(resolved.groups[0].items[0].radiusTop).toBe(20);
    expect(source.groups[0].items[0].radiusTop).toBeUndefined();
  });

  it("prioritizes instance override size and size2 over definition size", () => {
    const customLibrary: ComponentLibrary = {
      schemaVersion: 2,
      activePackageId: "actions",
      packages: [{
        id: "actions",
        name: "Actions",
        definitions: [
          { id: "sized-btn", name: "Sized", baseKind: "button", style: { size: 56, size2: 48 } },
        ],
      }],
    };
    const defaultInstance = item({ component: { packageId: "actions", definitionId: "sized-btn" } });
    expect(resolveComponentInstance(defaultInstance, customLibrary).item).toMatchObject({ size: 56, size2: 48 });

    const overriddenInstance = item({
      component: {
        packageId: "actions",
        definitionId: "sized-btn",
        overrides: { size: 120, size2: 64 },
      },
    });
    expect(resolveComponentInstance(overriddenInstance, customLibrary).item).toMatchObject({ size: 120, size2: 64 });
  });

  it("safely handles unknown/future schema versions in normalizeComponentLibrary and definitionsOf", () => {
    const futureLib = { schemaVersion: 99, unknownField: true };
    expect(normalizeComponentLibrary(futureLib)).toEqual({
      schemaVersion: 2,
      packages: [],
      activePackageId: "official",
    });
    expect(definitionsOf(futureLib as unknown as ComponentLibrary)).toEqual([]);
  });

  it("drops cross-package duplicate definition ids", () => {
    const duped: ComponentLibrary = {
      schemaVersion: 2,
      activePackageId: "a",
      packages: [
        { id: "a", name: "A", definitions: [{ id: "btn", name: "Btn", baseKind: "button", style: {} }] },
        { id: "b", name: "B", definitions: [{ id: "btn", name: "Btn again", baseKind: "button", style: {} }] },
      ],
    };
    const cleaned = sanitizeComponentLibrary(duped);
    expect(cleaned.packages[0].definitions).toHaveLength(1);
    expect(cleaned.packages[1].definitions).toHaveLength(0);
    expect(definitionsOf(cleaned).filter((definition) => definition.id === "btn")).toHaveLength(1);
  });

  it("clears inheritance that is dangling, wrong-kind or cyclic", () => {
    const legacy: ComponentLibrary = {
      schemaVersion: 2,
      activePackageId: "pkg",
      packages: [
        { id: "pkg", name: "Pkg", definitions: [
          { id: "base", name: "Base", baseKind: "button", style: {} },
          { id: "dangling", name: "Dangling", baseKind: "button", extends: "nope", style: {} },
          { id: "wrong-kind", name: "Wrong kind", baseKind: "card", extends: "base", style: {} },
          { id: "a", name: "A", baseKind: "button", extends: "b", style: {} },
          { id: "b", name: "B", baseKind: "button", extends: "a", style: {} },
        ] },
      ],
    };
    const byId = new Map(definitionsOf(sanitizeComponentLibrary(legacy)).map((definition) => [definition.id, definition]));
    expect(byId.get("dangling")?.extends).toBeUndefined();
    expect(byId.get("wrong-kind")?.extends).toBeUndefined();
    expect(byId.get("a")?.extends).toBeUndefined();
    expect(byId.get("b")?.extends).toBeUndefined();
    expect(byId.get("base")?.extends).toBeUndefined();
  });

  it("does not let an undefined override shadow the definition", () => {
    const source = item({ component: { packageId: "actions", definitionId: "brand-action", overrides: { variant: undefined } } });
    const result = resolveComponentInstance(source, library);
    expect(result.ok).toBe(true);
    expect(result.item.variant).toBe("tonal");
  });

  it("copies corners instead of sharing the definition's object", () => {
    const corners = { tl: 1, tr: 2, bl: 3, br: 4 };
    const defLibrary: ComponentLibrary = {
      schemaVersion: 2,
      activePackageId: "pkg",
      packages: [{ id: "pkg", name: "Pkg", definitions: [
        { id: "c", name: "C", baseKind: "button", style: { corners } },
      ] }],
    };
    const resolved = resolveComponentInstance(item({ component: { packageId: "pkg", definitionId: "c" } }), defLibrary);
    expect(resolved.item.corners).toEqual(corners);
    expect(resolved.item.corners).not.toBe(corners);
    const saved = componentStyleOf(item({ corners }));
    expect(saved.corners).not.toBe(corners);
  });
});

