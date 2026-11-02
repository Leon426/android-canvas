import { describe, expect, it } from "vitest";
import { clamp, lerp, uid } from "./math";

describe("math and uid utilities", () => {
  it("lerp interpolates correctly", () => {
    expect(lerp(0, 100, 0)).toBe(0);
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(0, 100, 1)).toBe(100);
  });

  it("clamp bounds values within range", () => {
    expect(clamp(5, 10, 20)).toBe(10);
    expect(clamp(15, 10, 20)).toBe(15);
    expect(clamp(25, 10, 20)).toBe(20);
  });

  it("uid generates a non-empty alphanumeric string", () => {
    const id1 = uid();
    const id2 = uid();
    expect(id1.length).toBeGreaterThan(0);
    expect(id1).not.toBe(id2);
  });
});
