/**
 * General math and identifier utilities.
 */

/** Linearly interpolates between a and b by t (0..1). */
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Clamps a value v between lo and hi inclusive. */
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Generates a random alphanumeric identifier. */
export const uid = (): string => Math.random().toString(36).slice(2, 10);
