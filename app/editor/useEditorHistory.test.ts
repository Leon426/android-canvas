import { describe, expect, it } from "vitest";
import type { Frame, Group } from "@/lib/tokens";
import type { DocMeta } from "./types";
import { snapshotOf } from "./useEditorHistory";

const makeDoc = () => ({
  groups: [{ id: "g1", items: [{ id: "p1", kind: "button" }] }] as unknown as Group[],
  frames: [{ id: "f1" }] as unknown as Frame[],
});

describe("snapshotOf", () => {
  it("keeps its own copy so a later in-place edit cannot rewrite recorded history", () => {
    const { groups, frames } = makeDoc();
    const snap = snapshotOf(groups, frames, { name: "doc" } as unknown as DocMeta, false);

    /* what a canvas mutation would do to the live document after the step was recorded */
    (groups[0].items as unknown as { id: string }[])[0].id = "mutated";
    (frames[0] as unknown as { id: string }).id = "mutated";

    expect((snap.groups[0].items as unknown as { id: string }[])[0].id).toBe("p1");
    expect((snap.frames[0] as unknown as { id: string }).id).toBe("f1");
  });

  it("only carries meta for steps that replaced the whole document", () => {
    const { groups, frames } = makeDoc();
    expect(snapshotOf(groups, frames, { name: "doc" } as unknown as DocMeta, false).meta).toBeUndefined();
    expect(snapshotOf(groups, frames, { name: "doc" } as unknown as DocMeta, true).meta).toEqual({ name: "doc" });
  });
});
