"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Doc, Frame, FrameMode, Group } from "@/lib/tokens";
import type { DocMeta, Snapshot } from "./types";

const HISTORY_MAX = 100;

type UseEditorHistoryArgs = {
  groupsRef: MutableRefObject<Group[]>;
  framesRef: MutableRefObject<Frame[]>;
  docRef: MutableRefObject<Doc>;
  frameRef: MutableRefObject<FrameMode>;
  mobileRef: MutableRefObject<boolean>;
  instantRef: MutableRefObject<Set<string>>;
  setGroups: Dispatch<SetStateAction<Group[]>>;
  setFrames: Dispatch<SetStateAction<Frame[]>>;
  setFrame: Dispatch<SetStateAction<FrameMode>>;
  setQuickUndo: Dispatch<SetStateAction<boolean>>;
  /** Apply a full or partial document; used when a snapshot carries meta. */
  applyDoc: (doc: Partial<Doc>, reset: boolean) => void;
};

/**
 * Undo / redo stack for the canvas. Snapshots hold groups and frames; steps that
 * replaced the whole document also keep the surrounding meta.
 */
export function useEditorHistory({
  groupsRef,
  framesRef,
  docRef,
  frameRef,
  mobileRef,
  instantRef,
  setGroups,
  setFrames,
  setFrame,
  setQuickUndo,
  applyDoc,
}: UseEditorHistoryArgs) {
  const pastRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const lastPatchRef = useRef<{ key: string; at: number }>({ key: "", at: 0 });
  const [, bumpHistory] = useState(0);

  const current = (withMeta: boolean): Snapshot => {
    const { groups: _g, frames: _f, ...meta } = docRef.current;
    return { groups: groupsRef.current, frames: framesRef.current, meta: withMeta ? (meta as DocMeta) : undefined };
  };

  const restore = (snap: Snapshot) => {
    lastPatchRef.current = { key: "", at: 0 };
    for (const g of snap.groups) instantRef.current.add(g.id);
    if (snap.meta) {
      applyDoc({ ...snap.meta, groups: snap.groups, frames: snap.frames }, true);
      if (!mobileRef.current) {
        const mode = snap.meta.frame === "blank" ? "blank" : "phone";
        setFrame(mode);
        frameRef.current = mode;
      }
    } else {
      setGroups(snap.groups);
      setFrames(snap.frames);
    }
    bumpHistory((v) => v + 1);
  };

  const snapshot = useCallback((withMeta = false) => {
    lastPatchRef.current = { key: "", at: 0 };
    setQuickUndo(false);
    pastRef.current.push(current(withMeta));
    if (pastRef.current.length > HISTORY_MAX) pastRef.current.shift();
    futureRef.current = [];
    bumpHistory((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** consecutive edits of the same field collapse into one undo step */
  const snapshotFor = useCallback(
    (key: string) => {
      const now = Date.now();
      const last = lastPatchRef.current;
      if (last.key !== key || now - last.at > 800) snapshot();
      lastPatchRef.current = { key, at: now };
    },
    [snapshot],
  );

  const undo = useCallback(() => {
    setQuickUndo(false);
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(current(!!prev.meta));
    restore(prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(current(!!next.meta));
    restore(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    instantRef.current.clear();
  });

  return {
    pastRef,
    futureRef,
    lastPatchRef,
    snapshot,
    snapshotFor,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
