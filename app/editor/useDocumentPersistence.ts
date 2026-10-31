"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { DOC_KEY, backupCorruptDoc, parseLocalDoc } from "@/lib/localDoc";
import { isProject } from "@/lib/project";
import { EMPTY_COMPONENT_LIBRARY, normalizeComponentLibrary, type ComponentLibrary } from "@/lib/componentLibrary";
import { loadAiSettings, type AiSettings } from "@/lib/ai";
import { Lang, t, setGlobalLang } from "@/lib/i18n";
import {
  Doc,
  Frame,
  FrameMode,
  Group,
  Kind,
  Palette,
  Platform,
  Theme,
  isPlatform,
  normalizeTheme,
  paletteOf,
} from "@/lib/tokens";
import type { Mode } from "@/components/Toolbar";
import type { EditAccess, View } from "./types";

export const BEFORE_KEY = "m3e:doc:before";
export const DOC_LOCK = "m3e:doc:editor";
export const UI_KEY = "m3e:ui";

type SetGroups = (next: Group[] | ((prev: Group[]) => Group[])) => void;

export type DocumentPersistenceDeps = {
  initialLang: Lang;
  initialLangRef: MutableRefObject<Lang>;
  onReadyRef: MutableRefObject<(() => void) | undefined>;
  /** Close / cancel any in-flight preview before swapping the document. */
  interruptPreviewRef: MutableRefObject<() => void>;
  /** Fit the camera when no saved UI view exists. */
  fitRef: MutableRefObject<(animate?: boolean) => void>;
  framesRef: MutableRefObject<Frame[]>;
  migrateGroups: (groups: Group[], frames: Frame[]) => Group[];
  seed: (lang: Lang) => Group[];
  seedFrames: (lang: Lang) => Frame[];
  setGroups: SetGroups;
  setFrames: Dispatch<SetStateAction<Frame[]>>;
  setPaletteKey: Dispatch<SetStateAction<string>>;
  setCustomPalette: Dispatch<SetStateAction<Palette | null>>;
  setDynamicColor: Dispatch<SetStateAction<boolean>>;
  setTheme: Dispatch<SetStateAction<Theme>>;
  setTitle: Dispatch<SetStateAction<string>>;
  setBrief: Dispatch<SetStateAction<string>>;
  setPromptEdit: Dispatch<SetStateAction<string | undefined>>;
  setPromptOptions: Dispatch<SetStateAction<string[] | undefined>>;
  setComponentLibrary: Dispatch<SetStateAction<ComponentLibrary>>;
  setPlatform: Dispatch<SetStateAction<Platform | null>>;
  setDraftBefore: Dispatch<SetStateAction<Doc | null>>;
  setAiSettings: Dispatch<SetStateAction<AiSettings>>;
  setView: Dispatch<SetStateAction<View>>;
  setLeftOpen: Dispatch<SetStateAction<boolean>>;
  setRightOpen: Dispatch<SetStateAction<boolean>>;
  setFavorites: Dispatch<SetStateAction<Kind[]>>;
  setMode: Dispatch<SetStateAction<Mode>>;
  setEditAccess: Dispatch<SetStateAction<EditAccess>>;
};

export type DocumentAutosaveState = {
  editAccess: EditAccess;
  groups: Group[];
  frames: Frame[];
  paletteKey: string;
  frame: FrameMode;
  title: string;
  brief: string;
  promptEdit: string | undefined;
  promptOptions: string[] | undefined;
  platform: Platform | null;
  customPalette: Palette | null;
  dynamicColor: boolean;
  theme: Theme;
  componentLibrary: ComponentLibrary;
  view: View;
  leftOpen: boolean;
  rightOpen: boolean;
  leftW: number;
  rightW: number;
  favorites: Kind[];
  mode: Mode;
  lang: Lang;
  boot: { surface: string; container: string; low: string; high: string; primary: string; canvas: string };
};

/**
 * Document lock, cold-start restore (with isProject validation), applyDoc, and
 * autosave. Draft arrive / import stay composed in Editor because they also
 * take history snapshots.
 */
export function useDocumentPersistence(deps: DocumentPersistenceDeps, autosave: DocumentAutosaveState) {
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const loadedRef = useRef(false);
  const hadDocRef = useRef(false);

  /** Puts a stored or opened document into the editor. Fields a partial document
   *  leaves out keep their current value, or go back to the default when `reset`. */
  const applyDoc = useCallback((doc: Partial<Doc>, reset: boolean) => {
    const d = depsRef.current;
    d.interruptPreviewRef.current();
    const nextFrames = Array.isArray(doc.frames) ? doc.frames : d.framesRef.current;
    if (Array.isArray(doc.groups)) d.setGroups(d.migrateGroups(doc.groups, nextFrames));
    if (Array.isArray(doc.frames)) d.setFrames(doc.frames);
    if (typeof doc.paletteKey === "string" && doc.paletteKey) d.setPaletteKey(doc.paletteKey);
    else if (reset) d.setPaletteKey("purple");
    if (doc.customPalette && typeof doc.customPalette.primary === "string") d.setCustomPalette(paletteOf("custom", doc.customPalette));
    else if (reset) d.setCustomPalette(null);
    if (typeof doc.dynamicColor === "boolean") d.setDynamicColor(doc.dynamicColor);
    else if (reset) d.setDynamicColor(false);
    if (doc.theme && typeof doc.theme === "object") d.setTheme(normalizeTheme(doc.theme));
    else if (reset) d.setTheme(normalizeTheme(undefined));
    if (typeof doc.title === "string") d.setTitle(doc.title);
    else if (reset) d.setTitle("");
    if (typeof doc.brief === "string") d.setBrief(doc.brief);
    else if (reset) d.setBrief("");
    if (typeof doc.promptEdit === "string") d.setPromptEdit(doc.promptEdit);
    else if (reset) d.setPromptEdit(undefined);
    if (Array.isArray(doc.promptOptions)) d.setPromptOptions(doc.promptOptions);
    else if (reset) d.setPromptOptions(undefined);
    if (doc.componentLibrary) d.setComponentLibrary(normalizeComponentLibrary(doc.componentLibrary, `${t("customPackageDefault", depsRef.current.initialLangRef.current)} 1`));
    else if (reset) d.setComponentLibrary(EMPTY_COMPONENT_LIBRARY);
    if (isPlatform(doc.platform)) d.setPlatform(doc.platform);
    else if (reset) d.setPlatform(null);
  }, []);

  useEffect(() => {
    if (!navigator.locks) {
      depsRef.current.setEditAccess("editable");
      return;
    }
    let active = true;
    let releaseLock: (() => void) | undefined;
    queueMicrotask(() => {
      if (!active) return;
      void navigator.locks
        .request(DOC_LOCK, { ifAvailable: true }, async (lock) => {
          if (!active) return;
          if (!lock) {
            depsRef.current.setEditAccess("readonly");
            return;
          }
          depsRef.current.setEditAccess("editable");
          await new Promise<void>((resolve) => {
            releaseLock = resolve;
          });
        })
        .catch(() => {
          if (active) depsRef.current.setEditAccess("editable");
        });
    });
    return () => {
      active = false;
      releaseLock?.();
    };
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    const d = depsRef.current;
    try {
      const raw = localStorage.getItem(DOC_KEY);
      const restored = parseLocalDoc(raw);
      let hasDoc = false;
      if (restored.ok) {
        hasDoc = true;
        hadDocRef.current = true;
        applyDoc(restored.doc, false);
      } else if (restored.reason === "corrupt") {
        backupCorruptDoc(restored.raw);
        try {
          localStorage.removeItem(DOC_KEY);
        } catch {}
      }
      const before = hasDoc ? localStorage.getItem(BEFORE_KEY) : null;
      if (!hasDoc) localStorage.removeItem(BEFORE_KEY);
      if (before) {
        const value: unknown = JSON.parse(before);
        if (isProject(value)) d.setDraftBefore(value);
        else localStorage.removeItem(BEFORE_KEY);
      }
      const u = localStorage.getItem(UI_KEY);
      if (u) {
        const ui = JSON.parse(u);
        if (ui.view) d.setView(ui.view);
        if (typeof ui.leftOpen === "boolean") d.setLeftOpen(ui.leftOpen);
        if (typeof ui.rightOpen === "boolean") d.setRightOpen(ui.rightOpen);
        if (Array.isArray(ui.favorites)) d.setFavorites(ui.favorites);
        if (ui.mode) d.setMode(ui.mode);
      } else {
        queueMicrotask(() => d.fitRef.current());
      }
      setGlobalLang(d.initialLang);
      d.initialLangRef.current = d.initialLang;
      if (!hasDoc) {
        d.setGroups(d.seed(d.initialLang));
        d.setFrames(d.seedFrames(d.initialLang));
      }
    } catch {}
    d.setAiSettings(loadAiSettings());
    loadedRef.current = true;
    requestAnimationFrame(() => d.onReadyRef.current?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current || autosave.editAccess !== "editable") return;
    try {
      localStorage.setItem(
        DOC_KEY,
        JSON.stringify({
          groups: autosave.groups,
          frames: autosave.frames,
          paletteKey: autosave.paletteKey,
          frame: autosave.frame,
          title: autosave.title,
          brief: autosave.brief,
          promptEdit: autosave.promptEdit,
          promptOptions: autosave.promptOptions,
          platform: autosave.platform ?? undefined,
          customPalette: autosave.customPalette ?? undefined,
          dynamicColor: autosave.dynamicColor,
          theme: autosave.theme,
          componentLibrary: autosave.componentLibrary,
        }),
      );
    } catch {}
  }, [
    autosave.editAccess,
    autosave.groups,
    autosave.frames,
    autosave.paletteKey,
    autosave.frame,
    autosave.title,
    autosave.brief,
    autosave.promptEdit,
    autosave.promptOptions,
    autosave.platform,
    autosave.customPalette,
    autosave.dynamicColor,
    autosave.theme,
    autosave.componentLibrary,
  ]);

  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(
        UI_KEY,
        JSON.stringify({
          view: autosave.view,
          leftOpen: autosave.leftOpen,
          rightOpen: autosave.rightOpen,
          leftW: autosave.leftW,
          rightW: autosave.rightW,
          favorites: autosave.favorites,
          mode: autosave.mode,
          lang: autosave.lang,
          boot: autosave.boot,
        }),
      );
    } catch {}
  }, [
    autosave.view,
    autosave.leftOpen,
    autosave.rightOpen,
    autosave.leftW,
    autosave.rightW,
    autosave.favorites,
    autosave.mode,
    autosave.lang,
    autosave.boot,
  ]);

  return { applyDoc, loadedRef, hadDocRef };
}
