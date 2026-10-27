import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { paletteOf } from "@/lib/tokens";
import { InputDialog, Section, StaticCardSection, CollapsibleSection } from "./ui";

const palette = paletteOf("purple");

describe("Section component", () => {
  it("defaults to a collapsed card wrapping the section", () => {
    const html = renderToStaticMarkup(
      <Section id="test-sec" icon="palette" title="Style" p={palette}>
        <div>Content</div>
      </Section>
    );
    expect(html).toContain("Style");
    expect(html).toContain("<button");
    expect(html).toContain("expand_more");
    /* the settings panels keep the previous card container look */
    expect(html).toContain("border-radius:18px");
    /* the body is folded away until the author opens it */
    expect(html).not.toContain("Content");
  });

  it("opens by default when defaultOpen is set", () => {
    const html = renderToStaticMarkup(
      <Section id="test-sec" icon="palette" title="Style" p={palette} defaultOpen>
        <div>Content</div>
      </Section>
    );
    expect(html).toContain("Content");
    expect(html).toContain("expand_less");
  });

  it("renders StaticCardSection when collapsible is explicitly false", () => {
    const html = renderToStaticMarkup(
      <Section id="test-sec" icon="palette" title="Style" p={palette} collapsible={false}>
        <div>Content</div>
      </Section>
    );
    expect(html).toContain("Style");
    expect(html).toContain("Content");
    expect(html).not.toContain("<button");
  });

  it("allows rendering StaticCardSection and CollapsibleSection directly", () => {
    const staticHtml = renderToStaticMarkup(
      <StaticCardSection icon="palette" title="Static" p={palette}>
        <div>Static Content</div>
      </StaticCardSection>
    );
    expect(staticHtml).toContain("Static");
    expect(staticHtml).not.toContain("<button");

    const collapsibleHtml = renderToStaticMarkup(
      <CollapsibleSection id="direct-col" icon="palette" title="Collapsible" p={palette}>
        <div>Collapsible Content</div>
      </CollapsibleSection>
    );
    expect(collapsibleHtml).toContain("Collapsible");
    expect(collapsibleHtml).toContain("<button");
  });
});

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
