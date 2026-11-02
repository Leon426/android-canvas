"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  DOC_KEY,
  DOC_LOCK,
  UI_KEY,
  backupCorruptDoc,
  parseLocalDoc,
  safeSetStorageItem,
} from "@/lib/localDoc";
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

export { BEFORE_KEY, DOC_KEY, DOC_LOCK, UI_KEY } from "@/lib/localDoc";

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
  setViewReady?: Dispatch<SetStateAction<boolean>>;
  onQuotaExceeded?: () => void;
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
 * autosave with quota error handling.
 */
export function useDocumentPersistence(
  d: DocumentPersistenceDeps,
  autosave: DocumentAutosaveState,
) {
  const loadedRef = useRef(false);
  const hadDocRef = useRef(false);
  const lastQuotaWarnRef = useRef(0);

  const notifyQuota = useCallback(() => {
    const now = Date.now();
    if (now - lastQuotaWarnRef.current > 10000) {
      lastQuotaWarnRef.current = now;
      d.onQuotaExceeded?.();
    }
  }, [d]);

  const applyDoc = useCallback(
    (next: Partial<Doc>, reset: boolean) => {
      d.interruptPreviewRef.current();
      const frames = Array.isArray(next.frames) ? next.frames : [];
      if (Array.isArray(next.groups)) {
        d.setGroups(d.migrateGroups(next.groups, frames));
      }
      if (Array.isArray(next.frames)) d.setFrames(next.frames);
      if (typeof next.paletteKey === "string") d.setPaletteKey(next.paletteKey);
      if ("customPalette" in next) d.setCustomPalette(next.customPalette ?? null);
      if (typeof next.dynamicColor === "boolean") d.setDynamicColor(next.dynamicColor);
      if (next.theme) d.setTheme(normalizeTheme(next.theme));
      if (typeof next.title === "string") d.setTitle(next.title);
      if (typeof next.brief === "string") d.setBrief(next.brief);
      if ("promptEdit" in next) d.setPromptEdit(next.promptEdit);
      if ("promptOptions" in next) d.setPromptOptions(next.promptOptions);
      if (next.componentLibrary) d.setComponentLibrary(normalizeComponentLibrary(next.componentLibrary));
      else if (reset) d.setComponentLibrary(EMPTY_COMPONENT_LIBRARY);
      if ("platform" in next) d.setPlatform(isPlatform(next.platform) ? next.platform : null);
    },
    [d],
  );

  useEffect(() => {
    try {
      const editorId = Math.random().toString(36).slice(2);
      const existingLock = sessionStorage.getItem(DOC_LOCK);
      if (!existingLock) {
        sessionStorage.setItem(DOC_LOCK, editorId);
        d.setEditAccess("editable");
      } else {
        d.setEditAccess("editable");
      }
      const onUnload = () => {
        if (sessionStorage.getItem(DOC_LOCK) === editorId) {
          sessionStorage.removeItem(DOC_LOCK);
        }
      };
      window.addEventListener("beforeunload", onUnload);
      return () => {
        window.removeEventListener("beforeunload", onUnload);
        onUnload();
      };
    } catch {
      d.setEditAccess("editable");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DOC_KEY);
      const restored = parseLocalDoc(raw);
      let hasDoc = false;
      if (restored.ok) {
        applyDoc(restored.doc, false);
        hadDocRef.current = true;
        hasDoc = true;
      } else if (restored.reason === "corrupt") {
        backupCorruptDoc(restored.raw);
      }
      const u = localStorage.getItem(UI_KEY);
      if (u) {
        const ui = JSON.parse(u);
        if (ui.lang && (ui.lang === "ja" || ui.lang === "en" || ui.lang === "zh" || ui.lang === "ko")) {
          d.initialLang = ui.lang;
        }
        if (ui.view) {
          d.setView(ui.view);
          d.setViewReady?.(true);
        } else {
          queueMicrotask(() => {
            d.fitRef.current();
            d.setViewReady?.(true);
          });
        }
        if (typeof ui.leftOpen === "boolean") d.setLeftOpen(ui.leftOpen);
        if (typeof ui.rightOpen === "boolean") d.setRightOpen(ui.rightOpen);
        if (Array.isArray(ui.favorites)) d.setFavorites(ui.favorites);
        if (ui.mode) d.setMode(ui.mode);
      } else {
        queueMicrotask(() => {
          d.fitRef.current();
          d.setViewReady?.(true);
        });
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
    requestAnimationFrame(() => {
      d.setViewReady?.(true);
      d.onReadyRef.current?.();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadedRef.current || autosave.editAccess !== "editable") return;
    const res = safeSetStorageItem(
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
    if (!res.ok && res.quota) {
      notifyQuota();
    }
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
    notifyQuota,
  ]);

  useEffect(() => {
    if (!loadedRef.current) return;
    const res = safeSetStorageItem(
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
    if (!res.ok && res.quota) {
      notifyQuota();
    }
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
    notifyQuota,
  ]);

  return { applyDoc, loadedRef, hadDocRef };
}
