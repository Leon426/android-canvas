"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { Mode } from "@/components/Toolbar";
import type { EditAccess } from "./types";

export type EditorShortcutsArgs = {
  editAccess: EditAccess;
  confirmClear: boolean;
  pendingImport: unknown | null;
  shareOpen: boolean;
  previewId: string | null;
  promptCoverUp: boolean;
  selectedIds: string[];
  selectedFrameId: string | null;
  undo: () => void;
  redo: () => void;
  duplicateSelected: () => void;
  duplicateFrame: (id: string) => void;
  copySelected: () => void;
  pasteClipboard: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  deleteSelected: () => void;
  deleteFrame: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  setSelectedFrameId: (id: string | null) => void;
  setSelectedLinkId: (id: string | null) => void;
  openPreview: () => void;
  nudge: (dx: number, dy: number) => void;
  setMode: (mode: Mode) => void;
  setZoomAt: (z: number) => void;
  currentZoom: () => number;
  fit: () => void;
  setSpaceHeld: Dispatch<SetStateAction<boolean>>;
};

/**
 * Handles global keyboard shortcuts for the editor:
 * undo/redo, copy/paste, duplicate, grouping, nudge, delete, mode toggle, zoom.
 */
export function useEditorShortcuts(args: EditorShortcutsArgs) {
  const tabbedRef = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") tabbedRef.current = true;
      if (args.editAccess !== "editable") return;
      const t = e.target as HTMLElement;
      const typing =
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable);
      if (typing) return;

      // Dialogs, the preview and the prompt full-screen cover own the keyboard while open
      if (
        args.confirmClear ||
        args.pendingImport !== null ||
        args.shareOpen ||
        args.previewId !== null ||
        args.promptCoverUp
      ) {
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) args.redo();
        else args.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        args.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (args.selectedIds.length === 0 && args.selectedFrameId) {
          args.duplicateFrame(args.selectedFrameId);
        } else {
          args.duplicateSelected();
        }
        return;
      }
      if (mod && e.key.toLowerCase() === "c") {
        if (args.selectedIds.length === 0 || window.getSelection()?.toString()) return;
        e.preventDefault();
        args.copySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        args.pasteClipboard();
        return;
      }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) args.ungroupSelected();
        else args.groupSelected();
        return;
      }

      if (e.key === " " && tabbedRef.current && t.closest?.("button, [role=button]")) return;
      if (e.key === " " && !e.repeat) {
        e.preventDefault();
        args.setSpaceHeld(true);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (args.selectedIds.length === 0 && args.selectedFrameId) {
          args.deleteFrame(args.selectedFrameId);
        } else {
          args.deleteSelected();
        }
        return;
      }
      if (e.key === "Escape") {
        args.setSelectedIds([]);
        args.setSelectedFrameId(null);
        args.setSelectedLinkId(null);
        return;
      }
      if (e.key === "p" || e.key === "P") {
        args.openPreview();
        return;
      }
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const s = e.shiftKey ? 8 : 1;
        args.nudge(
          e.key === "ArrowLeft" ? -s : e.key === "ArrowRight" ? s : 0,
          e.key === "ArrowUp" ? -s : e.key === "ArrowDown" ? s : 0,
        );
        return;
      }

      if (mod) return;
      if (e.key === "v" || e.key === "V") args.setMode("select");
      if (e.key === "h" || e.key === "H") args.setMode("hand");
      if (e.key === "=" || e.key === "+") args.setZoomAt(args.currentZoom() * 1.2);
      if (e.key === "-" || e.key === "_") args.setZoomAt(args.currentZoom() / 1.2);
      if (e.key === "0") args.fit();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") args.setSpaceHeld(false);
    };
    const onPointer = () => {
      tabbedRef.current = false;
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [args]);
}
