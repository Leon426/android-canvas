import { describe, expect, it } from "vitest";
import { componentStyleOf, resolveComponentInstance, resolveDocumentComponents, type ComponentLibrary } from "./componentLibrary";
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
});

