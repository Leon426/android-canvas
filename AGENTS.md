<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

- Install dependencies with `npm ci`. Node must be 22.12+, 24, or 26+ (`engines` in `package.json`). `npm ci` is safe to run again.
- Start the app with `npm run dev` and open http://localhost:3000. Use `localhost`, not `127.0.0.1`: Next.js blocks cross-origin dev/HMR requests, and the other host stays on the boot skeleton.
- Checks: `npm run typecheck`, `npm test`, and `npm run build`. There is no lint script. Leave `NEXT_PUBLIC_BASE_PATH` unset for local dev; CI sets it only for the GitHub Pages export.
- No secrets, database, or backend. The editor is a static client app and keeps documents in the browser.
