import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { makeItem, paletteOf } from "@/lib/tokens";
import { M3Static } from "./M3Node";

const palette = paletteOf("purple");

describe("M3Static rendering for Divider and Text", () => {
  it("renders divider without label as a plain line", () => {
    const item = { ...makeItem("divider"), id: "d1" };
    const html = renderToStaticMarkup(<M3Static item={item} palette={palette} />);
    expect(html).toContain("width:100%");
    expect(html).not.toContain(">OR<");
  });

  it("renders divider with label using surface background by default", () => {
    const item = { ...makeItem("divider"), id: "d2", label: "OR" };
    const html = renderToStaticMarkup(<M3Static item={item} palette={palette} />);
    expect(html).toContain("OR");
    expect(html).toContain(`background:${palette.surface}`);
    expect(html).toContain(`color:${palette.outline}`);
  });

  it("renders divider with label using custom fill and textColor when provided", () => {
    const item = { ...makeItem("divider"), id: "d3", label: "OR", fill: "inverseSurface" as const, textColor: "onSurfaceVariant" as const };
    const html = renderToStaticMarkup(<M3Static item={item} palette={palette} />);
    expect(html).toContain("OR");
    expect(html).toContain(`background:${palette.inverseSurface}`);
    expect(html).toContain(`color:${palette.onSurfaceVariant}`);
  });

  it("renders long text without forcing disclaimer styling when size2/textAlign are unset", () => {
    const longText = "This is a very long heading text with more than forty characters on the canvas";
    const item = { ...makeItem("text"), id: "t1", label: longText };
    const html = renderToStaticMarkup(<M3Static item={item} palette={palette} />);
    expect(html).toContain(longText);
    expect(html).toContain(`color:${palette.onSurface}`);
    expect(html).toContain("white-space:nowrap");
    expect(html).not.toContain("text-align:center");
    expect(html).not.toContain("max-width:320px");
  });

  it("applies multiline wrap and alignment when size2 and textAlign are set", () => {
    const item = {
      ...makeItem("text"),
      id: "t2",
      label: "Wrapped legal disclaimer",
      size2: 320,
      textAlign: "center" as const,
      textColor: "onSurfaceVariant" as const,
    };
    const html = renderToStaticMarkup(<M3Static item={item} palette={palette} />);
    expect(html).toContain("Wrapped legal disclaimer");
    expect(html).toContain(`color:${palette.onSurfaceVariant}`);
    expect(html).toContain("white-space:pre-wrap");
    expect(html).toContain("text-align:center");
    expect(html).toContain("max-width:320px");
  });
});
