import type { Doc, Frame, FrameMode, Group } from "@/lib/tokens";

/** everything in a document apart from its screens and parts */
export type DocMeta = Omit<Doc, "groups" | "frames">;

/** an undo step: the screens and parts, plus the rest of the document for steps that replaced it all */
export type Snapshot = { groups: Group[]; frames: Frame[]; meta?: DocMeta };

export type EditAccess = "checking" | "editable" | "readonly";

export type View = { x: number; y: number; z: number };

export type { Doc, Frame, FrameMode, Group };
