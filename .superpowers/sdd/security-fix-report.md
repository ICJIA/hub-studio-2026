# Security Fix Report: XSS via javascript: URL in Preview Links

Date: 2026-06-20

## Vulnerability

HIGH severity XSS: `app/pages/preview/[type]/[documentId].vue` (line 52) bound `asApp.url` directly
into `<a :href>` with no sanitization. An author could set `url` to `javascript:alert(1)` and—because
the preview link is shareable to Editors/managers—achieve script execution in a publisher's session.

## Fix: Two-Layer Defense

### Layer 1 — Render layer (`app/pages/preview/[type]/[documentId].vue`)

Imported `safeHref` from `~/lib/safe-url` and replaced the raw binding:

```html
<!-- before -->
<a :href="asApp.url" class="text-primary underline">Open app</a>
<!-- after -->
<a :href="safeHref(asApp.url)" target="_blank" rel="noopener noreferrer" class="text-primary underline">Open app</a>
```

Also added `target="_blank" rel="noopener noreferrer"` as defense-in-depth for external links.

### Layer 2 — Validator layer (`app/lib/validators/app.ts`)

Added a dangerous-URL pattern check that fires at save/submit time, before a hostile URL can even
reach the preview page:

```ts
if (a.url && /^\s*(javascript|data|vbscript|file):/i.test(a.url.trim())) {
  errors.push({ field: 'url', message: 'That link type is not allowed; use an http(s) URL.' })
}
```

### Helper: `app/lib/safe-url.ts`

Created a pure utility `safeHref(url?)` that allows only:
- `https://` and `http://` absolute URLs
- Root-relative `/path` URLs (but NOT protocol-relative `//host`)
- In-page `#fragment` anchors

Everything else (javascript:, data:, vbscript:, file:, mailto:, protocol-relative, etc.) collapses
to `'#'`, ensuring a hostile scheme can never reach the DOM as a clickable, script-executing link.

## grep :href= in app/

```
grep -rn ':href=' app/

app/lib/sanitize-svg.ts:29:  .replace(/\s+xlink:href=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
app/pages/preview/[type]/[documentId].vue:53:  <a :href="safeHref(asApp.url)" ...>Open app</a>
```

- `sanitize-svg.ts` match: a regex string replacement that STRIPS `xlink:href` from SVG markup — not
  a DOM binding, not a risk surface. No action needed.
- `preview/[type]/[documentId].vue`: now sanitized via `safeHref`. Fixed.
- No other author/content-data-bound `:href=` bindings found anywhere in `app/`.

## Test Results

- `tests/unit/safe-url.test.ts` — 12 new unit tests covering all allowed/blocked URL patterns
- `tests/unit/validators.test.ts` — 2 new tests: rejects `javascript:` in url field, accepts `https:`
- `tests/nuxt/preview-page.test.ts` — 1 new integration test: app mock with `javascript:alert(1)` url
  renders as `href="#"`

All tests: **164/164 passing**

Typecheck: **exit 0, 0 error TS lines** (pre-existing vue-router/volar plugin warning is unrelated to
these changes and was present before the fix)

## Files Changed

| Action | File |
|--------|------|
| CREATE | `app/lib/safe-url.ts` |
| CREATE | `tests/unit/safe-url.test.ts` |
| MODIFY | `app/pages/preview/[type]/[documentId].vue` |
| MODIFY | `app/lib/validators/app.ts` |
| MODIFY | `tests/nuxt/preview-page.test.ts` |
| MODIFY | `tests/unit/validators.test.ts` |
| CREATE | `.superpowers/sdd/security-fix-report.md` |
