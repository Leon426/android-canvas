import { Group, Item, makeItem, uid } from "./tokens";

const CLAUDE_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 44" fill="none">
    <g transform="translate(24, 22)">
      <line x1="0" y1="-14" x2="0" y2="14" stroke="#D97757" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="-14" y1="0" x2="14" y2="0" stroke="#D97757" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="-10" y1="-10" x2="10" y2="10" stroke="#D97757" stroke-width="3" stroke-linecap="round"/>
      <line x1="-10" y1="10" x2="10" y2="-10" stroke="#D97757" stroke-width="3" stroke-linecap="round"/>
      <line x1="-5.5" y1="-13" x2="5.5" y2="13" stroke="#D97757" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="-13" y1="-5.5" x2="13" y2="5.5" stroke="#D97757" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="-13" y1="5.5" x2="13" y2="-5.5" stroke="#D97757" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="-5.5" y1="13" x2="5.5" y2="-13" stroke="#D97757" stroke-width="2.6" stroke-linecap="round"/>
    </g>
    <text x="48" y="30" fill="#F4F4F5" font-family="serif, Georgia, 'Times New Roman'" font-size="28" font-weight="600" letter-spacing="-0.5">Claude</text>
  </svg>`,
)}`;

const CLAUDE_ILLUSTRATION_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 190" fill="none">
    <!-- Terracotta Head -->
    <circle cx="95" cy="40" r="22" fill="#D97757"/>
    <!-- Line Figure Neck Knot -->
    <path d="M95 62 v18 c-3 0 -6 -3 -6 -6 c0 -3 3 -6 6 -6 c3 0 6 3 6 6 c0 3 -3 6 -6 6 z" stroke="#F4F4F5" stroke-width="3" stroke-linecap="round"/>
    <!-- Left Hand Loops -->
    <path d="M89 74 c-8 -6 -16 -4 -16 6 c0 10 8 12 12 14 m-8 -18 c-6 -10 -18 -8 -18 4 c0 12 10 16 16 18 m-12 -20 c-6 -8 -16 -6 -16 6 c0 14 10 18 16 20 m-12 -18 c-4 -6 -12 -4 -12 6 c0 10 8 14 14 16" stroke="#F4F4F5" stroke-width="3.5" stroke-linecap="round"/>
    <!-- Body S-Curve Swoop -->
    <path d="M95 86 c-8 15 -10 35 0 52 c12 20 34 22 45 6 c10 -15 8 -36 -2 -50 c-10 -14 -4 -32 10 -42 c12 -8 24 -18 30 -32" stroke="#F4F4F5" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`,
)}`;

/**
 * Creates groups representing the Claude login page template.
 * All positions are relative to originX, originY (the target screen's top-left).
 */
export function createLoginTemplateGroups(originX: number, originY: number): Group[] {
  // 1. Dark Screen Background
  const bgBox: Item = {
    ...makeItem("box"),
    id: uid(),
    size: 360,
    size2: 800,
    radiusTop: 0,
    radiusBottom: 0,
    fill: "inverseSurface",
  };

  // 2. Claude Top Logo
  const logoImage: Item = {
    ...makeItem("image"),
    id: uid(),
    size: 160,
    size2: 44,
    radiusTop: 0,
    radiusBottom: 0,
    src: CLAUDE_LOGO_SVG,
  };

  // 3. Claude Illustration
  const illustrationImage: Item = {
    ...makeItem("image"),
    id: uid(),
    size: 220,
    size2: 190,
    radiusTop: 0,
    radiusBottom: 0,
    src: CLAUDE_ILLUSTRATION_SVG,
  };

  // 4. Headline Text
  const headlineText: Item = {
    ...makeItem("text"),
    id: uid(),
    label: "The AI for problem solvers",
    size: 22,
    bold: false,
  };

  // 5. Continue with Google Button
  const googleBtn: Item = {
    ...makeItem("button"),
    id: uid(),
    label: "Continue with Google",
    icon: "google",
    variant: "filled",
    size: 328,
    size2: 52,
    radiusTop: 26,
    radiusBottom: 26,
  };

  // 6. Divider with OR
  const orDivider: Item = {
    ...makeItem("divider"),
    id: uid(),
    label: "OR",
    size: 328,
  };

  // 7. Enter your email Outlined Button
  const emailBtn: Item = {
    ...makeItem("button"),
    id: uid(),
    label: "Enter your email",
    variant: "outlined",
    size: 328,
    size2: 52,
    radiusTop: 12,
    radiusBottom: 12,
  };

  // 8. Legal Disclaimer Text
  const disclaimerText: Item = {
    ...makeItem("text"),
    id: uid(),
    label: "By continuing, you agree to Anthropic's Consumer Terms and Usage Policy, and acknowledge their Privacy Policy.",
    size: 11,
  };

  return [
    // Background layer
    { id: uid(), x: originX, y: originY, axis: "x", items: [bgBox], locked: true },
    // Top Logo (centered at 360: (360 - 160)/2 = 100)
    { id: uid(), x: originX + 100, y: originY + 68, axis: "x", items: [logoImage] },
    // Illustration (centered at 360: (360 - 220)/2 = 70)
    { id: uid(), x: originX + 70, y: originY + 132, axis: "x", items: [illustrationImage] },
    // Headline (centered roughly at x: 42)
    { id: uid(), x: originX + 42, y: originY + 348, axis: "x", items: [headlineText] },
    // Google Button (x: 16, centered)
    { id: uid(), x: originX + 16, y: originY + 532, axis: "x", items: [googleBtn] },
    // OR Divider (x: 16, centered)
    { id: uid(), x: originX + 16, y: originY + 602, axis: "x", items: [orDivider] },
    // Email Button (x: 16, centered)
    { id: uid(), x: originX + 16, y: originY + 632, axis: "x", items: [emailBtn] },
    // Disclaimer (x: 20, centered)
    { id: uid(), x: originX + 20, y: originY + 700, axis: "x", items: [disclaimerText] },
  ];
}
