import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { paletteOf } from "@/lib/tokens";
import { InputDialog } from "./ui";

const palette = paletteOf("purple");

describe("InputDialog component", () => {
  it("renders InputDialog when open is true", () => {
    const html = renderToStaticMarkup(
      <InputDialog
        open={true}
        title="Save Component"
        placeholder="Enter name"
        initialValue="My Button"
        palette={palette}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(html).toContain("Save Component");
    expect(html).toContain("My Button");
    expect(html).toContain("Enter name");
  });

  it("does not render InputDialog content when open is false", () => {
    const html = renderToStaticMarkup(
      <InputDialog
        open={false}
        title="Save Component"
        palette={palette}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    );
    expect(html).toBe("");
  });
});
