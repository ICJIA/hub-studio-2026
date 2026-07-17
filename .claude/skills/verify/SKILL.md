---
name: verify
description: Build/launch/drive recipe for verifying Studio changes end-to-end in the running app (demo mode)
---

# Verifying Studio changes in the running app

## Launch (demo mode — fully self-contained, no Strapi needed)

```bash
NUXT_PUBLIC_DEMO_MODE=true npm run dev   # http://localhost:3000, ready in ~15s
```

Demo mode serves in-memory content (210 articles / 40 apps / 40 datasets seeded), blocks all
writes to Strapi, and is the right surface for verifying authoring flows without credentials.

## Drive

- `/login` → **Enter as Author** (drafts only) or **Enter as Editor** (adds publish). No account.
- New article editor: `/create/article` (SINGULAR — `/create/articles` is "Unknown content type").
- Edit: `/edit/article/<documentId>`; preview: `/preview/article/<documentId>`; manager docs: `/spec`.
- The editor page: body markdown editor (left, CodeMirror — content NOT exposed in the a11y
  tree; verify inserts via the split **Preview** toggle, which renders through the real pipeline),
  Details sidebar (right: date/type/splash image picker/body-images tray/main files).

## Gotchas that cost time

- **Editing form fields under automation: use the JS input pipeline, not click+type.** Focus
  is flaky on the editor page; coordinate/ref typing can silently land elsewhere (or nowhere)
  and the model never changes. Deterministic:
  `const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  s.call(input, 'new'); input.dispatchEvent(new Event('input', {bubbles:true}))`.
- **Verifying draft snapshots needs LIVE-ish mode, not demo:** plain `npm run dev` (no demo
  flag) + the admin/admin dev session = in-memory content with `isDemoMode()===false`, so
  snapshots run. The public-demo flag disables all snapshot writes by design.
- **NEVER trigger `beforeunload` or `window.confirm` under automation** (native dialogs block
  the Chrome extension): don't navigate/close a DIRTY tab; verify the restore banner by
  opening the same URL in a NEW tab; make a tab clean (revert its field) before leaving it.
- **Cross-tab localStorage contamination:** an old tab left dirty keeps its 30s interval
  alive even after a server restart — it re-writes draft keys into the shared origin storage
  and can fake a demo-mode "snapshot leak." Clean-room any storage assertion: revert stray
  tabs to clean first, then clear storage, then wait.

- **Coordinate clicks are unreliable** on the editor page — the tall sidebar + sticky header
  produce large blank scroll regions and content shifts between screenshots. Use `find`/
  `read_page` refs for every interaction; screenshot only for visual evidence.
- The library grids' pick-confirm panel renders BELOW the grid + Load more — scroll or
  `find` it after clicking a tile.
- The first-run guided tour modal appears on the dashboard — dismiss via its buttons (it's
  teleported; `find` may not see it — clicking the page's Tour button state or localStorage
  `icjia-studio-tour…` seeds completion).
- Demo media library seeds ALL images WITH alt text — the alt-less pick gate (required alt +
  write-back) is not reachable in demo through seeds; it's component-test-covered. A session
  upload always carries alt from its form.
- CSP headers do NOT apply under `nuxt dev` or `npx serve` — header-set changes are verified
  by `tests/unit/security-headers.test.ts` and at a Netlify deploy preview (runbook §2).
- File uploads: use the browser tools' `file_upload` on the HIDDEN `input[type=file]` ref —
  never click the visible Upload button (native dialog).

## Worthwhile flows

1. Splash image: Library tab (default) → search → pick → "Use this image" → selected state.
2. Alt write-back round trip: edit alt on selected image → blur (Tab) → Replace → search the
   same file name → the tile/confirm alt shows the edited value (in-memory record mutated).
3. Body images: Add from library → pick figure → tray entry → Insert → markdown + rendered
   figure in the editor Preview.
4. Demo desktop upload: upload a PNG into the tray → entry appears (alt humanized from
   filename) → Insert → `![alt](blob:http://localhost:3000/…)` in the body; preview renders it.
5. Probes: garbage search → "No images match."; Load more to exhaustion (button hides).
