/**
 * Corner radii for the editor's own chrome (panels, cards, menus, press targets).
 *
 * These are UI decisions, not part of the design: canvas items carry their own
 * radii in lib/tokens.ts because those are shown to the user and exported.
 *
 * `pill` is used for fully rounded press targets and inputs: a large value is
 * clamped by the browser to half the shorter side, so one token covers both
 * square icon buttons and wide pill-shaped fields.
 */
export const RADIUS = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;
