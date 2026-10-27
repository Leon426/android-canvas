import type { ColorToken, Item, Kind, Radii, TextToken, Variant } from "./tokens";

/**
 * The first component-library schema deliberately contains only values the
 * canvas and Jetpack Compose can both describe without guesswork. Content and
 * behaviour stay on the Item instance; reusable visual decisions live here.
 */
export type ComponentStyle = {
  variant?: Variant;
  size?: number;
  size2?: number;
  radiusTop?: number;
  radiusBottom?: number;
  corners?: Radii;
  fill?: ColorToken;
  iconFill?: ColorToken | "none";
  textColor?: TextToken;
  bold?: boolean;
};

export type ComponentDefinition = {
  id: string;
  name: string;
  baseKind: Kind;
  description?: string;
  /** Another definition to inherit from. It must use the same base kind. */
  extends?: string;
  style: ComponentStyle;
};

export type ComponentLibraryV1 = {
  schemaVersion: 1;
  definitions: ComponentDefinition[];
};

export type ComponentPackage = {
  id: string;
  name: string;
  definitions: ComponentDefinition[];
};

export type ComponentLibrary = {
  schemaVersion: 2;
  packages: ComponentPackage[];
  /** Package shown in the Parts panel; "official" means the built-in catalogue. */
  activePackageId: string;
};

export type ComponentInstance = {
  packageId?: string;
  definitionId: string;
  /** Values changed only for this occurrence on the canvas. */
  overrides?: ComponentStyle;
};

export const OFFICIAL_PACKAGE_ID = "official";
export const DEFAULT_CUSTOM_PACKAGE_ID = "custom-1";
export const EMPTY_COMPONENT_LIBRARY: ComponentLibrary = { schemaVersion: 2, packages: [], activePackageId: OFFICIAL_PACKAGE_ID };

export function normalizeComponentLibrary(value?: ComponentLibrary | ComponentLibraryV1 | unknown, defaultPackageName = "Custom package 1"): ComponentLibrary {
  if (!value || typeof value !== "object") return EMPTY_COMPONENT_LIBRARY;
  const v = value as Record<string, unknown>;
  if (v.schemaVersion === 2 && Array.isArray(v.packages) && typeof v.activePackageId === "string") {
    return sanitizeComponentLibrary(value as ComponentLibrary);
  }
  if (v.schemaVersion === 1 && Array.isArray(v.definitions)) {
    const defs = v.definitions as ComponentDefinition[];
    return sanitizeComponentLibrary({
      schemaVersion: 2,
      activePackageId: defs.length ? DEFAULT_CUSTOM_PACKAGE_ID : OFFICIAL_PACKAGE_ID,
      packages: defs.length ? [{ id: DEFAULT_CUSTOM_PACKAGE_ID, name: defaultPackageName, definitions: defs }] : [],
    });
  }
  return EMPTY_COMPONENT_LIBRARY;
}

export const definitionsOf = (library?: ComponentLibrary | ComponentLibraryV1): ComponentDefinition[] => {
  if (!library) return [];
  if (library.schemaVersion === 1 && Array.isArray(library.definitions)) return library.definitions;
  if (library.schemaVersion === 2 && Array.isArray(library.packages)) return library.packages.flatMap((pack) => pack.definitions ?? []);
  return [];
};

/** Whether `extends` walks a same-package, same-kind, acyclic chain. */
function isValidInheritance(definition: ComponentDefinition, byId: Map<string, ComponentDefinition>): boolean {
  const seen = new Set<string>([definition.id]);
  let cursor = byId.get(definition.extends ?? "");
  while (cursor) {
    if (seen.has(cursor.id) || cursor.baseKind !== definition.baseKind) return false;
    seen.add(cursor.id);
    if (!cursor.extends) return true;
    cursor = byId.get(cursor.extends);
  }
  return false;
}

/**
 * Bring a library up to the RFC's model invariants without rejecting the whole
 * document: definition ids stay unique project-wide, and `extends` only points
 * at a same-package, same-kind definition without cycles. Anything that would
 * break those rules is stripped rather than making an older project unopenable.
 */
export function sanitizeComponentLibrary(library: ComponentLibrary): ComponentLibrary {
  const seenIds = new Set<string>();
  const packages = library.packages.map((pack) => {
    const definitions = pack.definitions.filter((definition) => {
      if (seenIds.has(definition.id)) return false;
      seenIds.add(definition.id);
      return true;
    });
    const byId = new Map(definitions.map((definition) => [definition.id, definition]));
    return {
      ...pack,
      definitions: definitions.map((definition) =>
        definition.extends && !isValidInheritance(definition, byId) ? { ...definition, extends: undefined } : definition,
      ),
    };
  });
  return { ...library, packages };
}

const STYLE_KEYS = new Set<keyof ComponentStyle>([
  "variant", "size", "size2", "radiusTop", "radiusBottom", "corners",
  "fill", "iconFill", "textColor", "bold",
]);

export function isComponentStyleKey(key: PropertyKey): key is keyof ComponentStyle {
  return typeof key === "string" && STYLE_KEYS.has(key as keyof ComponentStyle);
}

/** Strip accidental content/behaviour fields before a style is persisted. */
export function componentStyleOf(value: Partial<Item>): ComponentStyle {
  const style: ComponentStyle = {};
  for (const key of STYLE_KEYS) {
    if (value[key] !== undefined) Object.assign(style, { [key]: value[key] });
  }
  return definedStyle(style);
}

/** A style with `undefined` entries dropped and object values copied, so a
 *  definition's corners are never shared by reference with a resolved item. */
function definedStyle(style: ComponentStyle | undefined): ComponentStyle {
  const out: ComponentStyle = {};
  if (!style) return out;
  for (const key of STYLE_KEYS) {
    const value = style[key];
    if (value === undefined) continue;
    if (key === "corners" && typeof value === "object") Object.assign(out, { corners: { ...(value as Radii) } });
    else Object.assign(out, { [key]: value });
  }
  return out;
}

export type ComponentResolution =
  | { ok: true; item: Item; definition: ComponentDefinition }
  | { ok: false; item: Item; reason: "missing" | "kind" | "cycle" };

/**
 * Resolve inheritance and instance overrides into an ordinary Item. Existing
 * renderers therefore do not need a second component implementation path.
 */
export function resolveComponentInstance(item: Item, library?: ComponentLibrary | ComponentLibraryV1): ComponentResolution {
  const ref = item.component;
  if (!ref) return { ok: false, item, reason: "missing" };

  /* resolution stays inside one package: a definition only inherits from its
     own package, and an unqualified instance binds to the first package that
     carries its id */
  let packageDefinitions: ComponentDefinition[];
  if (library?.schemaVersion === 2) {
    const pack = ref.packageId
      ? library.packages.find((candidate) => candidate.id === ref.packageId)
      : library.packages.find((candidate) => candidate.definitions.some((definition) => definition.id === ref.definitionId));
    packageDefinitions = pack?.definitions ?? [];
  } else {
    packageDefinitions = definitionsOf(library);
  }
  const definitions = new Map(packageDefinitions.map((definition) => [definition.id, definition]));
  const definition = definitions.get(ref.definitionId);
  if (!definition) return { ok: false, item, reason: "missing" };
  if (definition.baseKind !== item.kind) return { ok: false, item, reason: "kind" };

  const chain: ComponentDefinition[] = [];
  const seen = new Set<string>();
  let cursor: ComponentDefinition | undefined = definition;
  while (cursor) {
    if (seen.has(cursor.id)) return { ok: false, item, reason: "cycle" };
    seen.add(cursor.id);
    if (cursor.baseKind !== item.kind) return { ok: false, item, reason: "kind" };
    chain.unshift(cursor);
    cursor = cursor.extends ? definitions.get(cursor.extends) : undefined;
    if (chain[0].extends && !cursor) return { ok: false, item, reason: "missing" };
  }

  const inherited = chain.reduce<ComponentStyle>((style, part) => ({ ...style, ...definedStyle(part.style) }), {});
  return {
    ok: true,
    definition,
    item: { ...item, ...inherited, ...definedStyle(ref.overrides), id: item.id, kind: item.kind, component: ref },
  };
}

/** Resolve every instance for preview, prompt generation, and Agent export. */
export function resolveDocumentComponents<T extends { groups: import("./tokens").Group[]; componentLibrary?: ComponentLibrary | ComponentLibraryV1 }>(doc: T): T {
  if (!definitionsOf(doc.componentLibrary).length) return doc;
  return {
    ...doc,
    groups: doc.groups.map((group) => ({
      ...group,
      items: group.items.map((item) => resolveComponentInstance(item, doc.componentLibrary).item),
    })),
  };
}

