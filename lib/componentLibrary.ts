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

export function normalizeComponentLibrary(value?: ComponentLibrary | ComponentLibraryV1): ComponentLibrary {
  if (!value) return EMPTY_COMPONENT_LIBRARY;
  if (value.schemaVersion === 2) return value;
  return {
    schemaVersion: 2,
    activePackageId: value.definitions.length ? DEFAULT_CUSTOM_PACKAGE_ID : OFFICIAL_PACKAGE_ID,
    packages: value.definitions.length ? [{ id: DEFAULT_CUSTOM_PACKAGE_ID, name: "自定义组件包 1", definitions: value.definitions }] : [],
  };
}

export const definitionsOf = (library?: ComponentLibrary | ComponentLibraryV1): ComponentDefinition[] => {
  if (!library) return [];
  if (library.schemaVersion === 1) return library.definitions;
  return library.packages.flatMap((pack) => pack.definitions);
};

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
  return style;
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

  const allDefinitions = library?.schemaVersion === 2 && ref.packageId
    ? library.packages.find((pack) => pack.id === ref.packageId)?.definitions ?? []
    : definitionsOf(library);
  const definitions = new Map(allDefinitions.map((definition) => [definition.id, definition]));
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

  const inherited = chain.reduce<ComponentStyle>((style, part) => ({ ...style, ...part.style }), {});
  return {
    ok: true,
    definition,
    item: { ...item, ...inherited, ...(ref.overrides ?? {}), id: item.id, kind: item.kind, component: ref },
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

