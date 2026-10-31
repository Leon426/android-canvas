# Android Canvas

A browser sketchpad for [Material 3 Expressive](https://m3.material.io/) screens. Drag real M3 parts onto phone or desktop frames, tap through the flow, and copy a prompt a coding agent can build from. It all runs in the browser: no account, no server.

**Live site:** [https://leon426.github.io/android-canvas/](https://leon426.github.io/android-canvas/)

This repo is [Leon426/android-canvas](https://github.com/Leon426/android-canvas), a fork of [lnkiai/m3e-canvas](https://github.com/lnkiai/m3e-canvas). The editor you get from upstream is still here (parts, themes, preview, prompts, share links, optional AI). The `customizable-components` branch adds a component library on top, aimed at Android apps built with Jetpack Compose. The product contract for that work is in [docs/customizable-components-rfc.md](docs/customizable-components-rfc.md).

[README.ja.md](README.ja.md), [README.zh.md](README.zh.md), and [README.ko.md](README.ko.md) are the original write-ups. They describe upstream M3E Canvas and don't cover the component library yet.

## What you can do

1. **Sketch.** Drag parts onto a screen. They snap on a 4dp grid, and neighbouring buttons, chips, and list items fuse into a connected group.
2. **Tap through.** Point a part at another screen, hit Preview, and walk the flow with the transition you picked.
3. **Copy the prompt.** The design becomes a short brief in Japanese, English, Chinese, or Korean. Paste it into Claude Code, Codex, Gemini CLI, Cursor, or whatever else takes a prompt. You can also save a screen as a PNG, or copy a share link that opens the design on someone else's canvas.

The parts panel covers the usual Material set: buttons, FABs, bars, tabs, cards, lists, sheets, text fields, pickers, carousels, loading indicators, and more. Theme controls cover color (seven palettes or your own seed, light and dark, contrast), corner style, type, and the expressive spring motion. A phone-width window gets a simpler editor; the full one is for a desktop browser.

Everything you draw stays in this browser. Fonts load from Google Fonts. If you turn on the AI helper, your key goes straight from the browser to OpenAI, Claude, Gemini, or DeepSeek, and each provider keeps its own key, model, and base URL.

## What this branch adds

**Component packages.** The left rail has a Component library tab. The built-in catalogue is the "Official components" package. You can create your own packages, rename them, and delete them. Deleting a package detaches the parts on the canvas and leaves their look alone.

**Save a part as a component.** Select a top app bar, bottom navigation bar, FAB, extended FAB, button, or card and choose **Save as component**. The definition stores the visual bits both the canvas and Jetpack Compose can say without guessing: variant, size, corner radii, fill, icon fill, text color, and weight. The words on the part, and what a tap does, stay on that instance. Change the definition later and every instance follows, unless that instance overrode the value. A definition can extend another of the same kind inside the same package. Old projects that have no library still open.

**A login screen example.** Under Examples in the parts panel, **Login screen** drops a dark sign-in sketch (logo, illustration, headline, "Continue with Google", an email button) onto an empty frame, or onto a new one. The canvas then zooms to fit.

**The canvas keeps up with the window.** The first time the editor area has a size, it fits every screen in view. Resize after that and it keeps your zoom, shifting the view so the middle stays put.

**Agent Bundle (not a button yet).** `lib/agentBundle.ts` can pack the prompt, the prototype, and the component library into one JSON document aimed at Jetpack Compose. Nothing in the editor downloads it yet. The plan for that export is in the RFC.

## Run it locally

You need Node 22.12 or newer, Node 24, or Node 26+.

```bash
npm install
npm run dev          # http://localhost:3000
```

Checks:

```bash
npm run typecheck    # tsc --noEmit
npm test             # Vitest
npm run build        # static export in ./out
npm start            # serves ./out
```

There isn't a separate lint script. Typecheck, tests, and the static build are what CI runs.

## GitHub Pages

The site is a static Next.js export (`output: "export"` in `next.config.ts`). Project Pages lives under `/android-canvas`, so the production build sets:

```bash
NEXT_PUBLIC_BASE_PATH=/android-canvas \
NEXT_PUBLIC_SITE_ORIGIN=https://leon426.github.io \
npm run build
```

Leave those unset for `npm run dev`. Localhost should stay at `/`.

`.github/workflows/deploy.yml` does this on every push to `customizable-components` (and when you run the workflow by hand). It uses the official Pages actions: `configure-pages` supplies the base path and origin, then `upload-pages-artifact` and `deploy-pages` publish `out/`. In the repo settings, **Pages → Build and deployment → Source** has to be **GitHub Actions**. That is already how this repo is set (`build_type: workflow`).

## Keyboard

| Key | Action |
| --- | --- |
| `V` / `H` | Select / hand (hold `Space` to pan) |
| Wheel, `Ctrl` + wheel | Pan, zoom |
| `+` `-` `0` | Zoom in, zoom out, fit |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `Ctrl+C` / `Ctrl+V` | Copy / paste, including across screens |
| `Ctrl+D` | Duplicate |
| `Ctrl+G` / `Ctrl+Shift+G` | Group / ungroup |
| `Shift` + click | Add to the selection |
| Arrows (`Shift` = 8dp) | Nudge |
| `Ctrl` + drag | Move without snapping |
| `Delete` | Delete the part or screen |
| `P` | Preview |

## Credits

- Upstream app: [lnkiai/m3e-canvas](https://github.com/lnkiai/m3e-canvas). MIT, copyright lnkiai. Thank you for the editor.
- Loading indicator shapes and the animation model come from [material-components-android](https://github.com/material-components/material-components-android) (Apache-2.0), via [Aler1x/m3-loading-indicator](https://github.com/Aler1x/m3-loading-indicator). See [NOTICE](NOTICE).
- Icons: [Material Symbols](https://fonts.google.com/icons) (Apache-2.0).

[CONTRIBUTING.md](CONTRIBUTING.md) is still the upstream guide (English comments, four languages for every UI string). [SECURITY.md](SECURITY.md) covers how to report a problem.
