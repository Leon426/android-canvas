import { CAROUSEL_LAYOUTS, COLOR_TOKENS, DATE_LAYOUTS, Doc, KIND_ORDER, Kind, TIME_LAYOUTS, VARIANTS, isCardAlign, isCardImagePos, isPlace, isTextToken, isPlatform, isTrackThickness } from "./tokens";
import type { ComponentLibrary, ComponentLibraryV1, ComponentStyle } from "./componentLibrary";

/* A project file is the Doc as JSON, nothing more. Reading one back only checks
 * the shape the editor relies on; the same migrations that run on a saved
 * document then bring an older file up to date. */

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const KINDS = new Set<string>(KIND_ORDER);

const validTabs = (tabs: unknown) =>
  tabs === undefined || (Array.isArray(tabs) && tabs.every((tab) => isRecord(tab) && typeof tab.label === "string" && (typeof tab.icon === "string" || tab.icon === null || tab.icon === undefined) && (tab.src === undefined || typeof tab.src === "string")));

const validCorners = (c: unknown) => c === undefined || (isRecord(c) && ["tl", "tr", "bl", "br"].every((k) => Number.isFinite(c[k])));

/** the layouts a carousel and the two pickers may be saved with */
const LAYOUTS = new Set<string>([...CAROUSEL_LAYOUTS, ...DATE_LAYOUTS, ...TIME_LAYOUTS].map((l) => l.key));
const optionalNumber = (v: unknown) => v === undefined || Number.isFinite(v);

const validStyle = (value: unknown): value is ComponentStyle => {
  if (!isRecord(value)) return false;
  const allowed = new Set(["variant", "size", "size2", "radiusTop", "radiusBottom", "corners", "fill", "iconFill", "textColor", "bold"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;
  return (value.variant === undefined || VARIANTS.some((variant) => variant.key === value.variant)) &&
    optionalNumber(value.size) && optionalNumber(value.size2) && optionalNumber(value.radiusTop) && optionalNumber(value.radiusBottom) &&
    validCorners(value.corners) && (value.bold === undefined || typeof value.bold === "boolean") &&
    (value.fill === undefined || COLOR_TOKENS.some((token) => token.key === value.fill)) &&
    (value.iconFill === undefined || value.iconFill === "none" || COLOR_TOKENS.some((token) => token.key === value.iconFill)) &&
    (value.textColor === undefined || isTextToken(value.textColor));
};

const validComponentInstance = (value: unknown) => value === undefined || (isRecord(value) &&
  (value.packageId === undefined || typeof value.packageId === "string") &&
  typeof value.definitionId === "string" && value.definitionId.length > 0 &&
  (value.overrides === undefined || validStyle(value.overrides)));

const validDefinitions = (value: unknown) => Array.isArray(value) && value.every((definition) => isRecord(definition) && typeof definition.id === "string" && definition.id.length > 0 &&
    typeof definition.name === "string" && typeof definition.baseKind === "string" && KINDS.has(definition.baseKind) &&
    (definition.description === undefined || typeof definition.description === "string") &&
    (definition.extends === undefined || typeof definition.extends === "string") && validStyle(definition.style)) &&
  new Set(value.map((definition) => definition.id)).size === value.length;

const isKnownVersion = (v: number) => v === 1 || v === 2;

const validComponentLibrary = (value: unknown): value is ComponentLibrary | ComponentLibraryV1 => value === undefined || (isRecord(value) && (
  (typeof value.schemaVersion === "number" && !isKnownVersion(value.schemaVersion)) ||
  (value.schemaVersion === 1 && validDefinitions(value.definitions)) ||
  (value.schemaVersion === 2 && typeof value.activePackageId === "string" && Array.isArray(value.packages) &&
    value.packages.every((pack) => isRecord(pack) && typeof pack.id === "string" && pack.id.length > 0 && typeof pack.name === "string" && validDefinitions(pack.definitions)) &&
    new Set(value.packages.map((pack) => pack.id)).size === value.packages.length)
));

const validItem = (item: unknown) =>
  isRecord(item) &&
  validComponentInstance(item.component) &&
  validCorners(item.corners) &&
  (item.railExpanded === undefined || typeof item.railExpanded === "boolean") &&
  (item.railModal === undefined || typeof item.railModal === "boolean") &&
  (item.collapseOnScroll === undefined || typeof item.collapseOnScroll === "boolean") &&
  (item.trackThickness === undefined || isTrackThickness(item.trackThickness)) &&
  (item.imagePos === undefined || isCardImagePos(item.imagePos)) &&
  (item.imageSize === undefined || (Number.isFinite(item.imageSize) && (item.imageSize as number) > 0)) &&
  (item.contentAlign === undefined || isCardAlign(item.contentAlign)) &&
  (item.textAlign === undefined || isCardAlign(item.textAlign)) &&
  (item.textColor === undefined || isTextToken(item.textColor)) &&
  typeof item.id === "string" &&
  typeof item.kind === "string" &&
  KINDS.has(item.kind as Kind) &&
  typeof item.label === "string" &&
  (typeof item.icon === "string" || item.icon === null) &&
  VARIANTS.some((variant) => variant.key === item.variant) &&
  (item.supporting === undefined || typeof item.supporting === "string") &&
  (item.selected === undefined || Number.isFinite(item.selected)) &&
  (item.note === undefined || typeof item.note === "string") &&
  (item.layout === undefined || (typeof item.layout === "string" && LAYOUTS.has(item.layout))) &&
  optionalNumber(item.count) &&
  optionalNumber(item.size) &&
  optionalNumber(item.size2) &&
  optionalNumber(item.radiusTop) &&
  optionalNumber(item.radiusBottom) &&
  optionalNumber(item.value) &&
  validTabs(item.tabs);

const validGroup = (group: unknown) =>
  isRecord(group) &&
  typeof group.id === "string" &&
  Number.isFinite(group.x) &&
  Number.isFinite(group.y) &&
  (group.axis === "x" || group.axis === "y") &&
  (group.locked === undefined || typeof group.locked === "boolean") &&
  Array.isArray(group.items) &&
  group.items.length > 0 &&
  group.items.every(validItem);

const validFrame = (frame: unknown) =>
  isRecord(frame) &&
  typeof frame.id === "string" &&
  typeof frame.name === "string" &&
  Number.isFinite(frame.x) &&
  Number.isFinite(frame.y) &&
  (frame.w === undefined || (Number.isFinite(frame.w) && (frame.w as number) > 0)) &&
  (frame.h === undefined || (Number.isFinite(frame.h) && (frame.h as number) > 0)) &&
  (frame.note === undefined || typeof frame.note === "string") &&
  (frame.place === undefined || isPlace(frame.place)) &&
  (frame.length === undefined || (Number.isFinite(frame.length) && (frame.length as number) > 0));

/** whether a parsed file has the shape of a document the editor can open */
export const isProject = (value: unknown): value is Doc =>
  isRecord(value) && Array.isArray(value.groups) && Array.isArray(value.frames) && value.groups.every(validGroup) && value.frames.every(validFrame) && validComponentLibrary(value.componentLibrary) && (value.platform === undefined || isPlatform(value.platform)) && (value.promptOptions === undefined || (Array.isArray(value.promptOptions) && value.promptOptions.every((o) => typeof o === "string")));

/** the file name a project is saved under: m3e-canvas, followed by the app's name when it has one */
export const projectFileName = (doc: Doc) => {
  const name = doc.title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name ? `m3e-canvas ${name}.json` : "m3e-canvas.json";
};

/** hands the document to the browser as a JSON download */
export function saveProject(doc: Doc) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = projectFileName(doc);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** reads a chosen file back into a document, or null when it is not one */
export async function readProject(file: File): Promise<Doc | null> {
  try {
    const next: unknown = JSON.parse(await file.text());
    if (!isProject(next)) return null;
    if (next.componentLibrary && typeof next.componentLibrary.schemaVersion === "number" && !isKnownVersion(next.componentLibrary.schemaVersion)) {
      delete next.componentLibrary;
    }
    return next;
  } catch {
    return null;
  }
}
