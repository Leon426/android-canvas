import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ComponentLibraryPanel } from "./ComponentLibraryPanel";
import type { ComponentLibrary } from "@/lib/componentLibrary";
import { paletteOf } from "@/lib/tokens";

const palette = paletteOf("purple");

const library: ComponentLibrary = {
  schemaVersion: 2,
  activePackageId: "pack-1",
  packages: [
    {
      id: "pack-1",
      name: "Brand actions",
      definitions: [
        { id: "def-1", name: "Primary button", baseKind: "button", style: { variant: "filled" } },
      ],
    },
  ],
};

describe("ComponentLibraryPanel", () => {
  it("renders the active package and its definitions with an actions affordance", () => {
    const html = renderToStaticMarkup(
      <ComponentLibraryPanel
        library={library}
        palette={palette}
        onActive={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onRenameDefinition={vi.fn()}
        onDeleteDefinition={vi.fn()}
      />
    );
    expect(html).toContain("Brand actions");
    expect(html).toContain("Primary button");
    /* the package picker stays a listbox trigger, now drivable by the keyboard */
    expect(html).toContain('aria-haspopup="listbox"');
    /* the per-definition menu is labelled for screen readers */
    expect(html).toContain("コンポーネントの操作");
  });

  it("shows the empty state when the active package has no definitions", () => {
    const empty: ComponentLibrary = {
      schemaVersion: 2,
      activePackageId: "pack-1",
      packages: [{ id: "pack-1", name: "Empty package", definitions: [] }],
    };
    const html = renderToStaticMarkup(
      <ComponentLibraryPanel
        library={empty}
        palette={palette}
        onActive={vi.fn()}
        onCreate={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(html).toContain("Empty package");
    expect(html).toContain("このパッケージ");
  });
});
