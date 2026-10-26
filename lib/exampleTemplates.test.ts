import { describe, expect, it } from "vitest";
import { createLoginTemplateGroups } from "./exampleTemplates";

describe("exampleTemplates", () => {
  it("creates valid groups for Claude login template relative to origin", () => {
    const originX = 100;
    const originY = 200;
    const groups = createLoginTemplateGroups(originX, originY);

    expect(groups.length).toBeGreaterThanOrEqual(7);

    // First group should be the background box
    const bgGroup = groups[0];
    expect(bgGroup.x).toBe(originX);
    expect(bgGroup.y).toBe(originY);
    expect(bgGroup.items[0].kind).toBe("box");
    expect(bgGroup.items[0].size).toBe(360);
    expect(bgGroup.items[0].size2).toBe(800);

    // Should contain Claude logo, illustration, headline, google button, divider, email button, disclaimer
    const allItems = groups.flatMap((g) => g.items);
    const googleBtn = allItems.find((it) => it.label === "Continue with Google");
    expect(googleBtn).toBeDefined();
    expect(googleBtn?.icon).toBe("google");

    const emailBtn = allItems.find((it) => it.label === "Enter your email");
    expect(emailBtn).toBeDefined();
    expect(emailBtn?.variant).toBe("outlined");

    const headline = allItems.find((it) => it.label === "The AI for problem solvers");
    expect(headline).toBeDefined();

    const orDivider = allItems.find((it) => it.kind === "divider" && it.label === "OR");
    expect(orDivider).toBeDefined();

    // Check that all positions are within 360 width of origin
    for (const g of groups) {
      expect(g.x).toBeGreaterThanOrEqual(originX);
      expect(g.x).toBeLessThan(originX + 360);
      expect(g.y).toBeGreaterThanOrEqual(originY);
      expect(g.y).toBeLessThan(originY + 800);
    }
  });
});
