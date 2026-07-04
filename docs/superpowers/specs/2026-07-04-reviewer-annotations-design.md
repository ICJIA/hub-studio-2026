# Reviewer annotations in the draft preview — design

**Date:** 2026-07-04 · **Status:** Approved (design reviewed in-session) · **Owner:** cschweda

Word-style review for drafts: a reviewer opens a draft's preview link, highlights a passage,
attaches a comment, and others reply until the thread is resolved. Annotations are a **pure
overlay** — they never touch the article markdown, the publish pipeline, or published output.

## 1. Scope

- **Surface:** `/preview/:type/:documentId` only — the auth-guarded link Request Review already
  emails to reviewers. The page loads the draft once on mount, so the DOM is stable for anchoring.
- **Annotatable region:** the `.published-content` column (title, abstract, byline, body, end
  matter). The TOC/downloads aside is excluded. Works identically for articles, apps, and datasets.
- **Permissions:** any signed-in user can highlight, comment, reply, and resolve/reopen.
  Deleting a thread: its creator or any Editor (`canPublish` from `app/lib/admin-roles.ts` is the
  editor check). Fine-grained rules stay app-side UX; Strapi RBAC stays coarse (same trust model
  as articles).
- **Out of scope (v1):** editor split-pane display, comment-count badges on content lists, email
  notifications for new comments, realtime sync, annotation export.

## 2. Decisions and rationale

| Decision | Choice | Why |
|---|---|---|
| Storage, demo weeks | `localStorage` adapter | admin/admin sessions carry a sentinel JWT Strapi rejects, and the public demo must stay zero-network (`connect-src 'self'`). Per-browser is acceptable: demos are presenter-driven, both roles share one browser. |
| Storage, production | Strapi 5 collection type via the Content-Manager admin API | Self-contained: one backend, one auth authority (admin JWT already in hand), one backup story; CSP already allows the Strapi host; reuses `createRepository`. Supabase/Netlify DB/SQLite rejected as second backends solving a problem Strapi already solves. |
| Adapter selection | `AnnotationStore` interface chosen inside `useAnnotations()` | Mirrors the existing `isDemoData()` repository swap. Phase 1 ships localStorage only; the Strapi adapter drops in behind the same seam. |
| Anchoring | W3C-style text-quote selectors (`exact` + `prefix`/`suffix` + offset hint) | Survives content edits far better than offsets alone; orphan detection is explicit; ~150 lines of dependency-free, unit-testable TS (matches the repo's pinned-deps posture). |
| Painting | Wrap ranges in `<mark data-ann-id>` elements | Real elements are focusable, clickable, and screen-reader reachable — chosen over the CSS Custom Highlight API for accessibility (IITAA/WCAG posture). Safe because the preview renders once. |
| Comment bodies | Plain text via Vue interpolation | No `v-html`, zero new XSS surface. |
| Threads | JSON array on the annotation | One write path. Known trade-off: near-simultaneous replies to the *same* thread last-write-win; acceptable for a small team. Upgrade path: a `review-comment` collection with a relation. |

## 3. Data model

```ts
type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink'

interface AnnotationAnchor {
  exact: string    // the highlighted text (≤ 1000 chars)
  prefix: string   // ≤ 32 chars of container text before `exact`
  suffix: string   // ≤ 32 chars after
  offset: number   // char offset of `exact` in the container's textContent at capture time
}

interface AnnotationComment {
  id: string           // crypto.randomUUID()
  body: string         // plain text
  authorName: string
  authorEmail: string  // '' in demo sessions
  createdAt: string    // ISO 8601
}

interface ReviewAnnotation {
  id: string
  contentType: 'article' | 'app' | 'dataset'
  documentId: string          // the annotated entry's Strapi documentId
  anchor: AnnotationAnchor
  color: AnnotationColor
  resolved: boolean
  createdAt: string
  createdBy: { name: string; email: string; roleLabel: string }
  comments: AnnotationComment[]   // comments[0] is the annotation's initial note
}
```

**Attribution rule:** real sessions use the signed-in admin user's name (firstname + lastname,
fallback email); dev/demo sessions (`isDemoSession()`) use the role label with a demo marker,
e.g. `Editor · demo`. Centralized in one helper so both adapters and the UI agree.

## 4. Storage seam

```ts
interface AnnotationStore {
  list(contentType: string, documentId: string): Promise<ReviewAnnotation[]>
  create(a: ReviewAnnotation): Promise<ReviewAnnotation>
  addComment(id: string, c: AnnotationComment): Promise<ReviewAnnotation>
  setResolved(id: string, resolved: boolean): Promise<ReviewAnnotation>
  remove(id: string): Promise<void>
}
```

`useAnnotations(contentType, documentId)` selects the adapter and exposes reactive state
(`annotations`, `loading`, CRUD actions).

### 4a. localStorage adapter (Phase 1 — ships now)

- Key: `icjia-studio-annotations-v1:{contentType}:{documentId}` (namespaced + versioned, the
  guided-tour pattern). Value: JSON array of `ReviewAnnotation`.
- A `storage` event listener refreshes state when another tab writes.
- Quota/privacy-mode failures degrade to an in-session in-memory store plus a one-time toast
  ("Comments won't survive a reload in this browser").
- Used for **all** sessions in Phase 1, and permanently for demo builds / demo sessions
  (`isDemoData()`), preserving the public demo's zero-write, zero-network audit posture.

### 4b. Strapi adapter (Phase 2 — at or before launch)

- New repository `app/repositories/annotations.ts` wiring `createRepository` to
  `api::review-annotation.review-annotation`, plus `app/lib/mappers/annotation.ts` and
  `app/lib/validators/annotation.ts` (quote present and ≤ limits, color in enum, comment body
  non-empty, documentId present).
- Strapi stores the target id as `targetDocumentId` (Strapi 5 reserves `documentId` for the
  entry's own id); the mapper translates.
- `ListOptions` (in `app/lib/repository.ts`) gains an optional `filters` passthrough so the list
  call can send `filters[targetDocumentId][$eq]=…&filters[contentType][$eq]=…`.
- Selected automatically for real (non-demo) sessions once the content type exists; demo sessions
  keep localStorage. No CSP change (production `connect-src` already allows the Strapi host).

## 5. Anchoring engine — `app/lib/annotations/anchor.ts` (pure TS, no deps)

- **Text walk:** all offsets are over the concatenated `textContent` of the container's text
  nodes via `TreeWalker`, identically at capture and resolve time (no normalization drift).
- **`captureAnchor(container, range)`** → `AnnotationAnchor | null`. Rejects (each with a
  distinct reason code for the UI toast): empty/whitespace-only selections, selections extending
  outside the container, selections intersecting `.katex` subtrees, `exact` > 1000 chars.
- **`resolveAnchor(container, anchor)`** → `Range | null`. Finds every index of `exact`,
  scores candidates by prefix/suffix agreement (exact match > partial overlap), tie-breaks by
  distance from `anchor.offset`, then maps the winning character span back to a DOM `Range`
  across text-node boundaries. Returns `null` → the annotation is an **orphan**.
- **`paintAnnotation(container, range, id, color)`** wraps each text-node segment of the range
  in `<mark data-ann-id="…" class="ann ann--{color}">` (per-node wrapping; `surroundContents`
  can't span partial nodes). **`clearAnnotations(container)`** unwraps all marks so repaint is
  idempotent.
- **Orphans** stay in the rail flagged "text changed — highlight not found", showing the stored
  quote. Nothing silently disappears.

## 6. UI

### Reviewer bar (`AnnotationBar.vue`)
Sticky row beside the existing "Draft preview / Copy share link" header: highlighter toggle
(arms selection capture), four color swatches (last-used persisted in localStorage), open/resolved
filter, open-thread count, and (below `lg`) the drawer toggle for the rail.

### Comments rail (`AnnotationRail.vue`)
Right-hand column (~320px) via a flex wrapper **on the preview page only** — `prose-preview.css`
is untouched. Below `lg` it becomes a slide-over drawer. Threads render in document order
(resolved position), orphans last; each card shows color dot, author, relative time, quote
snippet, comments, a reply box, resolve/reopen, and delete (creator or Editor). Filter honors
the bar's open/resolved state.

### Interactions
- Armed highlighter + text selection → floating "Add comment" popover at the selection
  (`range.getBoundingClientRect()`), textarea + Save/Cancel → create + paint + open thread.
- Click/keyboard-activate a highlight ↔ scroll + flash its rail card, and vice versa (reuse the
  container-aware scroll pattern from `PublishedArticlePreview`).

### Colors, themes, contrast
The preview surface is always light (commit `b8bd666`), so the four highlight tints are tuned
once for dark text on pastel at WCAG AA. The rail/bar are app chrome and follow light/dark
themes with AA contrast in both (see `dark-mode-contrast` project rule).

### Accessibility
Marks: `tabindex="0"`, `role="button"`, `aria-label` "Comment by {name}: {quote start}…",
Enter/Space opens the thread. Popover traps focus and restores it on close. Create/resolve
announce via the existing aria-live pattern. Flash/scroll effects respect
`prefers-reduced-motion`. Rail is `<section aria-label="Review comments">`.

### Print
`printArticle` clones `outerHTML` — the clone gets `mark[data-ann-id]` unwrapped before writing
to the iframe, and the bar/rail join the aside in the print-hide CSS. Printed output is
annotation-free.

## 7. Preview-page integration

`app/pages/preview/[type]/[documentId].vue` mounts the bar + rail and calls
`useAnnotations(type, documentId)`. Lifecycle: entry loads → preview renders (`v-html`) →
`nextTick` → `list()` → resolve + paint each annotation → rail populates. Repaint runs after any
mutation (create/resolve-filter change/delete). No feature flag: Phase 1 ships everywhere,
including demo builds (localStorage keeps the demo self-contained).

## 8. Strapi drop-in deliverable — `deploy/strapi/review-annotation/`

Generated as part of Phase 1 so the content type can be deployed to
`https://v2.hub.icjia-api.cloud` weeks before the adapter lands. Contents:

- `content-types/review-annotation/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "review_annotations",
  "info": {
    "singularName": "review-annotation",
    "pluralName": "review-annotations",
    "displayName": "Review Annotation",
    "description": "Studio reviewer highlight + threaded comments on a draft (workflow overlay, not published content)"
  },
  "options": { "draftAndPublish": false },
  "attributes": {
    "contentType": { "type": "enumeration", "enum": ["article", "app", "dataset"], "required": true },
    "targetDocumentId": { "type": "string", "required": true },
    "exact": { "type": "text", "required": true },
    "prefix": { "type": "string" },
    "suffix": { "type": "string" },
    "offsetHint": { "type": "integer" },
    "color": { "type": "enumeration", "enum": ["yellow", "green", "blue", "pink"], "default": "yellow" },
    "resolved": { "type": "boolean", "default": false },
    "authorName": { "type": "string", "required": true },
    "authorEmail": { "type": "string" },
    "authorRole": { "type": "string" },
    "comments": { "type": "json" }
  }
}
```

- `controllers/`, `routes/`, `services/` core-factory stubs (`createCoreController` /
  `createCoreRouter` / `createCoreService`).
- `INSTALL.md`: copy the folder into the Strapi project's `src/api/review-annotation/`, deploy,
  grant the Author/Editor **admin** roles full CRUD on the type in Settings → Administration
  panel → Roles (RBAC stays coarse — the Studio enforces the creator-or-Editor delete rule
  app-side, per §1), and leave the **public/users-permissions roles at zero access** — review threads are internal workflow data and must not be exposed via the
  public REST/GraphQL surface. The `.env` `STRAPI_API_TOKEN` may be used for a one-off CLI smoke
  test of the collection after deploy; it is never shipped to the client, and the Studio itself
  reaches the type via the Content-Manager admin API with the signed-in admin JWT.

## 9. Security notes

- Comment bodies are plain text (Vue-escaped); no new `v-html` sinks.
- Annotations never enter the article markdown or the publish payload; the published site is
  unaffected by design.
- Demo builds gain no network calls: localStorage only, demo CSP `connect-src 'self'` intact,
  `assertWritesAllowed()` untouched.
- No token or secret is added to the client bundle in either phase.

## 10. Testing

- **Unit (`tests/unit/`):** anchor capture (rejection reasons, prefix/suffix truncation),
  resolve scoring (duplicate quotes, edited text → orphan, cross-block selections), paint/unwrap
  idempotence (happy-dom), localStorage adapter (CRUD, versioned key, storage-event refresh,
  quota fallback), attribution rule, delete-permission logic, validator.
- **Component (`tests/nuxt/`):** bar interactions (arm, color pick, filter), rail thread CRUD
  (reply, resolve, delete gating by role), preview-page integration with a mocked store
  (load → paint → click-through), print clone strips marks.
- Implementation follows TDD (superpowers flow).

## 11. Phases & estimates

| Phase | Contents | Estimate |
|---|---|---|
| 1 (now) | Anchor engine, bar + rail UI, localStorage adapter, Strapi drop-in files, tests | ~4–6 dev-days |
| 2 (pre-launch) | Strapi adapter (repository/mapper/validator), `filters` passthrough, adapter selection | ~2 dev-days |
| Later ideas | Read-only threads in the editor, list badges, notification emails, `review-comment` collection if reply concurrency ever bites | not planned |

---

## Addendum A (2026-07-04, approved): annotations in the editor's Live-preview modal

User decision: "do both."

1. **Extract `<AnnotatedPreview>`** (`app/components/annotations/AnnotatedPreview.vue`): the /preview
   page's annotation orchestration (bar, rail + drawer, composer, capture/resolve/paint lifecycle,
   storage-event refresh, color persistence, live region) moves into one reusable component with props
   `{ contentType, documentId }` and a default slot for the `Published*Preview` content. The page
   becomes a thin consumer. The bar row becomes **sticky** inside the component (fixes the
   walkthrough finding that the bar scrolled away on /preview).
2. **Mount in the preview modal** of all three forms (Article/App/Dataset), **edit mode with a saved
   `documentId` only** — a brand-new unsaved entry has no stable key, so the modal shows the plain
   preview until first save. Threads are the same localStorage store the /preview page uses.
   Unsaved edits in the form may orphan quotes — the existing orphan UX handles it.
3. **"Review view" link** in the modal header (saved entries): opens `/preview/{type}/{documentId}`
   in a new tab — the shareable reviewer URL.

Out of scope still: the split-pane editor preview; Strapi adapter (Phase 2).
