# Reviewer Annotations (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Word-style review on `/preview/:type/:documentId` — highlight a passage, attach a threaded comment, reply/resolve — stored in `localStorage`, never touching the article markdown.

**Architecture:** A dependency-free anchor engine (`app/lib/annotations/`) captures W3C-style text-quote anchors from selections over `.published-content`, re-resolves them to DOM Ranges, and paints them as accessible `<mark data-ann-id>` elements. A `useAnnotations()` composable orchestrates a swappable `AnnotationStore` (localStorage adapter now; Strapi adapter is Phase 2). Two page-local components (`AnnotationBar`, `AnnotationRail`) plus a floating `AnnotationComposer` provide the UI on the preview page only.

**Tech Stack:** Nuxt 4 (SPA, `ssr:false`), Vue 3, TypeScript, Nuxt UI v4 (Tailwind), Vitest 4 + @nuxt/test-utils (happy-dom), no new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-07-04-reviewer-annotations-design.md` (approved).

## Global Constraints

- **No new npm dependencies.** The anchor engine is hand-rolled, dependency-free TS.
- **No new `v-html` sinks.** Comment bodies render via Vue text interpolation only.
- **Annotations never enter article markdown or any Strapi write payload** in Phase 1.
- **Demo posture intact:** zero network calls from annotation code; `localStorage` key namespaced + versioned: `icjia-studio-annotations-v1:{contentType}:{documentId}`.
- **Icons:** `icon.fallbackToApi` is `false` — every new lucide icon MUST be added to `nuxt.config.ts` `icon.clientBundle.icons` or it silently won't render.
- **Highlight tints must keep ≥ 4.5:1 contrast with the prose text color on the always-light preview surface;** rail/bar chrome must meet AA in light AND dark themes.
- **Commit messages:** descriptive only — NO `Co-Authored-By`, NO AI-attribution or session trailers (user's global git rule).
- **Existing suite must stay green:** `npm test` (514 tests) and `npm run typecheck` after every task.
- Node ≥ 20 (`.nvmrc` 22). Run targeted tests with `npx vitest run <file>`.

## File Structure

```
app/types/annotations.ts                     # domain model + AnnotationStore interface (Create)
app/lib/annotations/attribution.ts           # author attribution + delete-permission rules (Create)
app/lib/annotations/anchor.ts                # textContentOf/captureAnchor/resolveAnchor/rangeFromOffsets (Create)
app/lib/annotations/paint.ts                 # paintOffsets/clearAnnotations (Create)
app/lib/annotations/store-local.ts           # localStorage AnnotationStore adapter (Create)
app/composables/useAnnotations.ts            # reactive orchestration + adapter seam (Create)
app/components/annotations/AnnotationBar.vue      # sticky reviewer bar (Create)
app/components/annotations/AnnotationComposer.vue # floating "Add comment" popover (Create)
app/components/annotations/AnnotationRail.vue     # right-hand comments rail (Create)
app/assets/css/annotations.css               # mark styles + print rules (Create)
nuxt.config.ts                               # css entry + bundled icons (Modify)
app/pages/preview/[type]/[documentId].vue    # mount bar/rail/composer, selection→paint wiring (Modify)
app/components/PublishedArticlePreview.vue   # print clone strips marks (Modify)
deploy/strapi/review-annotation/**           # Phase-2 drop-in content type + INSTALL.md (Create)
CHANGELOG.md                                 # Unreleased entry (Modify)
tests/unit/annotations-{attribution,anchor,paint,store-local,strapi-schema}.test.ts
tests/nuxt/{annotation-bar,annotation-composer,annotation-rail,preview-annotations}.test.ts
tests/nuxt/published-article-preview-print.test.ts (Modify)
```

---

### Task 1: Domain types, attribution, and delete rules

**Files:**
- Create: `app/types/annotations.ts`
- Create: `app/lib/annotations/attribution.ts`
- Test: `tests/unit/annotations-attribution.test.ts`

**Interfaces:**
- Consumes: `roleLabel(canPublish: boolean): 'Editor' | 'Author'` from `~/lib/admin-roles`.
- Produces (later tasks import these exact names):
  - Types: `AnnotationColor`, `ANNOTATION_COLORS`, `ANNOTATION_CONTENT_TYPES`, `AnnotationContentType`, `AnnotationAnchor`, `AnnotationComment`, `ReviewAnnotation`, `AnnotationStore`, `RailThread` from `~/types/annotations`.
  - `annotationAuthor(opts): { name; email; roleLabel }` and `canDeleteAnnotation(a, user): boolean` from `~/lib/annotations/attribution`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/annotations-attribution.test.ts
import { describe, it, expect } from 'vitest'
import { annotationAuthor, canDeleteAnnotation } from '~/lib/annotations/attribution'
import type { ReviewAnnotation } from '~/types/annotations'

const ann = (createdByEmail: string): ReviewAnnotation => ({
  id: 'a1', contentType: 'article', documentId: 'd1',
  anchor: { exact: 'q', prefix: '', suffix: '', offset: 0 },
  color: 'yellow', resolved: false, createdAt: '2026-07-04T00:00:00.000Z',
  createdBy: { name: 'Jane', email: createdByEmail, roleLabel: 'Author' },
  comments: [],
})

describe('annotationAuthor', () => {
  it('uses displayName + email for a real session', () => {
    expect(annotationAuthor({ displayName: 'Jane Smith', email: 'jane@icjia.gov', canPublish: false, demo: false }))
      .toEqual({ name: 'Jane Smith', email: 'jane@icjia.gov', roleLabel: 'Author' })
  })
  it('appends the demo marker to the role label in demo sessions', () => {
    expect(annotationAuthor({ displayName: 'Dev Editor', email: 'dev-editor@localhost', canPublish: true, demo: true }))
      .toEqual({ name: 'Dev Editor', email: 'dev-editor@localhost', roleLabel: 'Editor · demo' })
  })
  it('falls back to the role label when displayName is empty, and to empty email', () => {
    expect(annotationAuthor({ displayName: null, email: null, canPublish: true, demo: false }))
      .toEqual({ name: 'Editor', email: '', roleLabel: 'Editor' })
  })
})

describe('canDeleteAnnotation', () => {
  it('lets an Editor delete any thread', () => {
    expect(canDeleteAnnotation(ann('someone@else.gov'), { email: 'ed@icjia.gov', canPublish: true })).toBe(true)
  })
  it('lets the creator delete their own thread', () => {
    expect(canDeleteAnnotation(ann('jane@icjia.gov'), { email: 'jane@icjia.gov', canPublish: false })).toBe(true)
  })
  it('blocks a non-editor non-creator', () => {
    expect(canDeleteAnnotation(ann('jane@icjia.gov'), { email: 'other@icjia.gov', canPublish: false })).toBe(false)
  })
  it('never matches on empty emails', () => {
    expect(canDeleteAnnotation(ann(''), { email: '', canPublish: false })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/annotations-attribution.test.ts`
Expected: FAIL — cannot resolve `~/lib/annotations/attribution`.

- [ ] **Step 3: Write the types + implementation**

```ts
// app/types/annotations.ts
// Reviewer-annotation domain model (spec §3) + the storage seam (spec §4).
// Annotations are a pure overlay on the draft PREVIEW — they never enter the
// article markdown or any publish payload.

export const ANNOTATION_COLORS = ['yellow', 'green', 'blue', 'pink'] as const
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number]

export const ANNOTATION_CONTENT_TYPES = ['article', 'app', 'dataset'] as const
export type AnnotationContentType = (typeof ANNOTATION_CONTENT_TYPES)[number]

/** W3C-style text-quote anchor over the container's concatenated text-node content. */
export interface AnnotationAnchor {
  exact: string   // the highlighted text (≤ 1000 chars)
  prefix: string  // ≤ 32 chars of container text before `exact`
  suffix: string  // ≤ 32 chars after
  offset: number  // char offset of `exact` at capture time (disambiguation hint)
}

export interface AnnotationComment {
  id: string
  body: string          // plain text — rendered via Vue interpolation ONLY
  authorName: string
  authorEmail: string   // '' when unknown
  createdAt: string     // ISO 8601
}

export interface ReviewAnnotation {
  id: string
  contentType: AnnotationContentType
  documentId: string
  anchor: AnnotationAnchor
  color: AnnotationColor
  resolved: boolean
  createdAt: string
  createdBy: { name: string; email: string; roleLabel: string }
  comments: AnnotationComment[]  // comments[0] is the annotation's initial note
}

/** Storage seam (spec §4): localStorage adapter now, Strapi adapter in Phase 2. */
export interface AnnotationStore {
  list(contentType: AnnotationContentType, documentId: string): Promise<ReviewAnnotation[]>
  create(a: ReviewAnnotation): Promise<ReviewAnnotation>
  addComment(id: string, c: AnnotationComment): Promise<ReviewAnnotation>
  setResolved(id: string, resolved: boolean): Promise<ReviewAnnotation>
  remove(id: string): Promise<void>
}

/** A rail entry: an annotation plus its resolution state in the CURRENT render.
 *  (Lives here, not in the SFC — `<script setup>` cannot have named exports.) */
export interface RailThread {
  annotation: ReviewAnnotation
  orphan: boolean         // quote no longer found in the rendered text
  start: number | null    // resolved char offset (document order); null when orphaned
}
```

```ts
// app/lib/annotations/attribution.ts
// Attribution + permission rules for review annotations (spec §1, §3). Pure and
// unit-testable; the composable feeds these from the auth store + isDemoSession().
import { roleLabel } from '~/lib/admin-roles'
import type { ReviewAnnotation } from '~/types/annotations'

export interface AnnotationAuthor { name: string; email: string; roleLabel: string }

export function annotationAuthor(opts: {
  displayName: string | null
  email: string | null | undefined
  canPublish: boolean
  demo: boolean
}): AnnotationAuthor {
  const base = roleLabel(opts.canPublish)
  return {
    name: opts.displayName || base,
    email: opts.email ?? '',
    roleLabel: opts.demo ? `${base} · demo` : base,
  }
}

/** Delete rule (spec §1): the thread's creator or any Editor. Empty emails never match. */
export function canDeleteAnnotation(
  a: ReviewAnnotation,
  user: { email: string; canPublish: boolean },
): boolean {
  if (user.canPublish) return true
  return Boolean(a.createdBy.email) && a.createdBy.email === user.email
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/annotations-attribution.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add app/types/annotations.ts app/lib/annotations/attribution.ts tests/unit/annotations-attribution.test.ts
git commit -m "feat(annotations): domain types, attribution + delete rules"
```

---

### Task 2: Anchor capture

**Files:**
- Create: `app/lib/annotations/anchor.ts`
- Test: `tests/unit/annotations-anchor.test.ts`

**Interfaces:**
- Consumes: `AnnotationAnchor` from `~/types/annotations`.
- Produces: `textContentOf(container: Element): string`, `captureAnchor(container: Element, range: Range): CaptureResult` where `CaptureResult = { ok: true; anchor: AnnotationAnchor } | { ok: false; reason: 'empty' | 'outside' | 'katex' | 'too-long' }`, plus constants `MAX_EXACT_LENGTH = 1000`, `CONTEXT_LENGTH = 32`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/annotations-anchor.test.ts
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { textContentOf, captureAnchor, CONTEXT_LENGTH, MAX_EXACT_LENGTH } from '~/lib/annotations/anchor'

let container: HTMLElement

/** Build a range from character offsets over the container's concatenated text (test helper). */
function rangeAt(start: number, end: number): Range {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let pos = 0
  let node: Node | null
  let startSet = false
  while ((node = walker.nextNode())) {
    const t = node as Text
    const next = pos + t.data.length
    if (!startSet && start < next) { range.setStart(t, start - pos); startSet = true }
    if (startSet && end <= next) { range.setEnd(t, end - pos); return range }
    pos = next
  }
  throw new Error('offsets out of bounds')
}

beforeEach(() => {
  container = document.createElement('div')
  container.innerHTML = '<p>The quick <strong>brown</strong> fox.</p><p>It jumps over the lazy dog.</p>'
  document.body.appendChild(container)
})

describe('textContentOf', () => {
  it('concatenates all text nodes in document order', () => {
    expect(textContentOf(container)).toBe('The quick brown fox.It jumps over the lazy dog.')
  })
})

describe('captureAnchor', () => {
  it('captures exact/prefix/suffix/offset for a same-node selection', () => {
    const text = textContentOf(container)
    const start = text.indexOf('jumps')
    const res = captureAnchor(container, rangeAt(start, start + 'jumps'.length))
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.anchor.exact).toBe('jumps')
      expect(res.anchor.offset).toBe(start)
      expect(res.anchor.prefix.endsWith('It ')).toBe(true)
      expect(res.anchor.suffix.startsWith(' over')).toBe(true)
      expect(res.anchor.prefix.length).toBeLessThanOrEqual(CONTEXT_LENGTH)
      expect(res.anchor.suffix.length).toBeLessThanOrEqual(CONTEXT_LENGTH)
    }
  })
  it('captures across element boundaries (strong + block gap)', () => {
    const text = textContentOf(container)
    const start = text.indexOf('brown')
    const end = text.indexOf('jumps') + 'jumps'.length
    const res = captureAnchor(container, rangeAt(start, end))
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.anchor.exact).toBe('brown fox.It jumps')
  })
  it('rejects a collapsed selection', () => {
    const r = rangeAt(3, 4); r.collapse(true)
    expect(captureAnchor(container, r)).toEqual({ ok: false, reason: 'empty' })
  })
  it('rejects a whitespace-only selection', () => {
    const text = textContentOf(container)
    const sp = text.indexOf(' fox')
    expect(captureAnchor(container, rangeAt(sp, sp + 1))).toEqual({ ok: false, reason: 'empty' })
  })
  it('rejects a selection outside the container', () => {
    const outside = document.createElement('p')
    outside.textContent = 'elsewhere'
    document.body.appendChild(outside)
    const r = document.createRange()
    r.setStart(outside.firstChild!, 0); r.setEnd(outside.firstChild!, 4)
    expect(captureAnchor(container, r)).toEqual({ ok: false, reason: 'outside' })
  })
  it('rejects a selection intersecting KaTeX output', () => {
    container.innerHTML = '<p>Before <span class="katex">x^2</span> after.</p>'
    const text = textContentOf(container)
    const start = text.indexOf('x^2')
    expect(captureAnchor(container, rangeAt(start, start + 3))).toEqual({ ok: false, reason: 'katex' })
  })
  it('rejects selections longer than MAX_EXACT_LENGTH', () => {
    container.innerHTML = `<p>${'a'.repeat(MAX_EXACT_LENGTH + 10)}</p>`
    expect(captureAnchor(container, rangeAt(0, MAX_EXACT_LENGTH + 5))).toEqual({ ok: false, reason: 'too-long' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/annotations-anchor.test.ts`
Expected: FAIL — cannot resolve `~/lib/annotations/anchor`.

- [ ] **Step 3: Write the implementation**

```ts
// app/lib/annotations/anchor.ts
// Text-quote anchoring over a rendered container (spec §5). All character offsets are
// measured over the CONCATENATION of the container's text nodes in document order —
// identically at capture and resolve time, so there is no normalization drift.
// Dependency-free; DOM-only APIs (TreeWalker + Range) so it unit-tests in happy-dom.
import type { AnnotationAnchor } from '~/types/annotations'

export const MAX_EXACT_LENGTH = 1000
export const CONTEXT_LENGTH = 32

export type CaptureResult =
  | { ok: true; anchor: AnnotationAnchor }
  | { ok: false; reason: 'empty' | 'outside' | 'katex' | 'too-long' }

function textNodesOf(container: Element): Text[] {
  const doc = container.ownerDocument
  if (!doc) return []
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)
  return nodes
}

/** The container's annotatable text: all text nodes concatenated in document order. */
export function textContentOf(container: Element): string {
  return textNodesOf(container).map((t) => t.data).join('')
}

/** Char offset of a Range boundary point within the container text. Uses Range
 *  stringification (spec-defined as the contained text), so element-boundary points
 *  (triple-click selections) resolve correctly too. */
function pointOffset(container: Element, node: Node, offset: number): number {
  const doc = container.ownerDocument!
  const probe = doc.createRange()
  probe.setStart(container, 0)
  probe.setEnd(node, offset)
  return probe.toString().length
}

/** Character span [start, end) that `el`'s text occupies within the container text. */
function elementSpan(container: Element, el: Element): { start: number; end: number } {
  return {
    start: pointOffset(container, el, 0),
    end: pointOffset(container, el, el.childNodes.length),
  }
}

export function captureAnchor(container: Element, range: Range): CaptureResult {
  if (range.collapsed) return { ok: false, reason: 'empty' }
  if (!container.contains(range.commonAncestorContainer)) return { ok: false, reason: 'outside' }

  const text = textContentOf(container)
  const start = pointOffset(container, range.startContainer, range.startOffset)
  const end = pointOffset(container, range.endContainer, range.endOffset)
  const exact = text.slice(start, end)
  if (!exact.trim()) return { ok: false, reason: 'empty' }
  if (exact.length > MAX_EXACT_LENGTH) return { ok: false, reason: 'too-long' }

  // Reject selections overlapping rendered KaTeX widgets: marks inside .katex break layout.
  for (const el of Array.from(container.querySelectorAll('.katex'))) {
    const span = elementSpan(container, el)
    if (start < span.end && end > span.start) return { ok: false, reason: 'katex' }
  }

  return {
    ok: true,
    anchor: {
      exact,
      prefix: text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
      suffix: text.slice(end, end + CONTEXT_LENGTH),
      offset: start,
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/annotations-anchor.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/annotations/anchor.ts tests/unit/annotations-anchor.test.ts
git commit -m "feat(annotations): text-quote anchor capture over rendered preview text"
```

---

### Task 3: Anchor resolve (+ range from offsets)

**Files:**
- Modify: `app/lib/annotations/anchor.ts` (append)
- Test: `tests/unit/annotations-anchor.test.ts` (append)

**Interfaces:**
- Produces: `resolveAnchor(container: Element, anchor: AnnotationAnchor): { start: number; end: number } | null` (character offsets — the paint step consumes offsets, not Ranges) and `rangeFromOffsets(container: Element, start: number, end: number): Range | null`.

- [ ] **Step 1: Append the failing tests**

```ts
// append to tests/unit/annotations-anchor.test.ts
import { resolveAnchor, rangeFromOffsets } from '~/lib/annotations/anchor'

describe('rangeFromOffsets', () => {
  it('maps offsets spanning element boundaries back to a Range', () => {
    const text = textContentOf(container)
    const start = text.indexOf('brown')
    const r = rangeFromOffsets(container, start, start + 'brown fox.'.length)
    expect(r).not.toBeNull()
    expect(r!.toString()).toBe('brown fox.')
  })
  it('returns null for out-of-bounds or empty spans', () => {
    const len = textContentOf(container).length
    expect(rangeFromOffsets(container, len, len + 3)).toBeNull()
    expect(rangeFromOffsets(container, 5, 5)).toBeNull()
  })
})

describe('resolveAnchor', () => {
  it('resolves a unique quote', () => {
    const text = textContentOf(container)
    const start = text.indexOf('lazy')
    const res = resolveAnchor(container, { exact: 'lazy', prefix: 'over the ', suffix: ' dog', offset: start })
    expect(res).toEqual({ start, end: start + 4 })
  })
  it('disambiguates duplicate quotes by prefix/suffix', () => {
    container.innerHTML = '<p>alpha beta gamma</p><p>delta beta omega</p>'
    const text = textContentOf(container)
    const second = text.indexOf('beta', text.indexOf('beta') + 1)
    const res = resolveAnchor(container, { exact: 'beta', prefix: 'delta ', suffix: ' omega', offset: 0 })
    expect(res).toEqual({ start: second, end: second + 4 })
  })
  it('tie-breaks identical context by nearest stored offset', () => {
    container.innerHTML = '<p>x beta y</p><p>x beta y</p>'
    const text = textContentOf(container)
    const second = text.indexOf('beta', text.indexOf('beta') + 1)
    const res = resolveAnchor(container, { exact: 'beta', prefix: 'x ', suffix: ' y', offset: second })
    expect(res!.start).toBe(second)
  })
  it('survives edits elsewhere in the document (offset drift)', () => {
    container.innerHTML = '<p>NEW INTRO PARAGRAPH. The quick brown fox.</p><p>It jumps over the lazy dog.</p>'
    const text = textContentOf(container)
    const res = resolveAnchor(container, { exact: 'jumps', prefix: 'It ', suffix: ' over', offset: 23 })
    expect(res).toEqual({ start: text.indexOf('jumps'), end: text.indexOf('jumps') + 5 })
  })
  it('returns null (orphan) when the quote no longer exists', () => {
    expect(resolveAnchor(container, { exact: 'vanished text', prefix: '', suffix: '', offset: 0 })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/annotations-anchor.test.ts`
Expected: FAIL — `resolveAnchor` / `rangeFromOffsets` not exported.

- [ ] **Step 3: Append the implementation**

```ts
// append to app/lib/annotations/anchor.ts

/** Map a character span over the container text back to a DOM Range.
 *  Boundary at a node junction lands at the START of the later node. */
export function rangeFromOffsets(container: Element, start: number, end: number): Range | null {
  if (end <= start || start < 0) return null
  const doc = container.ownerDocument
  if (!doc) return null
  const range = doc.createRange()
  let pos = 0
  let startSet = false
  for (const node of textNodesOf(container)) {
    const next = pos + node.data.length
    if (!startSet && start < next) {
      range.setStart(node, start - pos)
      startSet = true
    }
    if (startSet && end <= next) {
      range.setEnd(node, end - pos)
      return range
    }
    pos = next
  }
  return null
}

/** Re-locate a captured anchor in (possibly edited) container text.
 *  Score every occurrence of `exact` by prefix/suffix agreement, tie-break by
 *  distance from the stored offset. Returns character offsets, or null → orphan. */
export function resolveAnchor(
  container: Element,
  anchor: AnnotationAnchor,
): { start: number; end: number } | null {
  const { exact, prefix, suffix, offset } = anchor
  if (!exact) return null
  const text = textContentOf(container)

  const candidates: number[] = []
  let i = text.indexOf(exact)
  while (i !== -1) {
    candidates.push(i)
    i = text.indexOf(exact, i + 1)
  }
  if (candidates.length === 0) return null

  const scored = candidates.map((start) => {
    const p = text.slice(Math.max(0, start - prefix.length), start)
    const s = text.slice(start + exact.length, start + exact.length + suffix.length)
    let score = 0
    if (prefix) {
      if (p === prefix) score += 2
      else if (p && (prefix.endsWith(p) || p.endsWith(prefix.slice(-8)))) score += 1
    }
    if (suffix) {
      if (s === suffix) score += 2
      else if (s && (suffix.startsWith(s) || s.startsWith(suffix.slice(0, 8)))) score += 1
    }
    return { start, score, dist: Math.abs(start - offset) }
  })
  scored.sort((a, b) => b.score - a.score || a.dist - b.dist)
  const winner = scored[0]!
  return { start: winner.start, end: winner.start + exact.length }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/annotations-anchor.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/annotations/anchor.ts tests/unit/annotations-anchor.test.ts
git commit -m "feat(annotations): anchor resolution with duplicate-quote scoring and orphan fallback"
```

---

### Task 4: Painting and clearing marks

**Files:**
- Create: `app/lib/annotations/paint.ts`
- Test: `tests/unit/annotations-paint.test.ts`

**Interfaces:**
- Consumes: `rangeFromOffsets` semantics (offsets over concatenated text nodes); `AnnotationColor` from `~/types/annotations`.
- Produces: `paintOffsets(container: Element, start: number, end: number, id: string, color: AnnotationColor): HTMLElement[]` (returns created marks so the caller can decorate them) and `clearAnnotations(container: Element): void` (unwraps ALL `mark[data-ann-id]` and normalizes). Marks carry `class="ann ann--{color}" data-ann-id tabindex="0" role="button"`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/annotations-paint.test.ts
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { paintOffsets, clearAnnotations } from '~/lib/annotations/paint'
import { textContentOf } from '~/lib/annotations/anchor'

let container: HTMLElement
beforeEach(() => {
  container = document.createElement('div')
  container.innerHTML = '<p>The quick <strong>brown</strong> fox.</p><p>It jumps.</p>'
  document.body.appendChild(container)
})

describe('paintOffsets', () => {
  it('wraps a same-node span in a single mark with id, color, and a11y attrs', () => {
    const text = textContentOf(container)
    const start = text.indexOf('quick')
    const marks = paintOffsets(container, start, start + 5, 'a1', 'yellow')
    expect(marks).toHaveLength(1)
    const m = marks[0]!
    expect(m.tagName).toBe('MARK')
    expect(m.textContent).toBe('quick')
    expect(m.dataset.annId).toBe('a1')
    expect(m.className).toBe('ann ann--yellow')
    expect(m.getAttribute('tabindex')).toBe('0')
    expect(m.getAttribute('role')).toBe('button')
  })
  it('spans element boundaries with one mark per text-node segment', () => {
    const text = textContentOf(container)
    const start = text.indexOf('quick')
    const end = text.indexOf('fox') + 3
    const marks = paintOffsets(container, start, end, 'a2', 'pink')
    expect(marks.length).toBeGreaterThanOrEqual(3) // 'quick ', 'brown', ' fox'
    expect(marks.map((m) => m.textContent).join('')).toBe('quick brown fox')
    expect(container.textContent).toBe('The quick brown fox.It jumps.') // text unchanged
  })
  it('does not paint whitespace-only segments', () => {
    container.innerHTML = '<p>end.</p>\n<p>start</p>'
    const text = textContentOf(container)
    const start = text.indexOf('end')
    const end = text.indexOf('start') + 5
    const marks = paintOffsets(container, start, end, 'a3', 'blue')
    expect(marks.every((m) => (m.textContent ?? '').trim().length > 0)).toBe(true)
  })
})

describe('clearAnnotations', () => {
  it('round-trips: paint → clear restores identical HTML', () => {
    const before = container.innerHTML
    const text = textContentOf(container)
    paintOffsets(container, text.indexOf('quick'), text.indexOf('quick') + 5, 'a1', 'yellow')
    paintOffsets(container, text.indexOf('jumps'), text.indexOf('jumps') + 5, 'a2', 'green')
    expect(container.querySelectorAll('mark[data-ann-id]').length).toBeGreaterThan(0)
    clearAnnotations(container)
    expect(container.querySelectorAll('mark').length).toBe(0)
    expect(container.innerHTML).toBe(before)
  })
  it('is idempotent and repaint-safe (paint → clear → paint at same offsets)', () => {
    const text = textContentOf(container)
    const start = text.indexOf('brown')
    paintOffsets(container, start, start + 5, 'a1', 'yellow')
    clearAnnotations(container)
    const marks = paintOffsets(container, start, start + 5, 'a1', 'blue')
    expect(marks).toHaveLength(1)
    expect(marks[0]!.textContent).toBe('brown')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/annotations-paint.test.ts`
Expected: FAIL — cannot resolve `~/lib/annotations/paint`.

- [ ] **Step 3: Write the implementation**

```ts
// app/lib/annotations/paint.ts
// Paint resolved anchors as <mark data-ann-id> elements (spec §5). Real elements —
// focusable, clickable, screen-reader reachable — chosen over the CSS Custom
// Highlight API for accessibility. clearAnnotations() unwraps + normalize()s, so
// paint→clear→paint is idempotent and offsets stay valid (textContent never changes).
import type { AnnotationColor } from '~/types/annotations'

export function paintOffsets(
  container: Element,
  start: number,
  end: number,
  id: string,
  color: AnnotationColor,
): HTMLElement[] {
  const doc = container.ownerDocument
  if (!doc || end <= start) return []
  const marks: HTMLElement[] = []

  // Snapshot text nodes first — wrapping mutates the tree mid-walk otherwise.
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)

  let pos = 0
  for (const node of nodes) {
    const nodeStart = pos
    const nodeEnd = pos + node.data.length
    pos = nodeEnd
    if (nodeEnd <= start) continue
    if (nodeStart >= end) break

    const s = Math.max(start, nodeStart) - nodeStart
    const e = Math.min(end, nodeEnd) - nodeStart
    if (e <= s) continue

    let target = node
    if (s > 0) target = node.splitText(s)
    if (e - s < target.data.length) target.splitText(e - s)
    if (!target.data.trim()) continue // skip inter-block whitespace segments

    const mark = doc.createElement('mark')
    mark.className = `ann ann--${color}`
    mark.dataset.annId = id
    mark.setAttribute('tabindex', '0')
    mark.setAttribute('role', 'button')
    target.parentNode?.replaceChild(mark, target)
    mark.appendChild(target)
    marks.push(mark)
  }
  return marks
}

/** Unwrap every annotation mark under `container` and merge the split text nodes back. */
export function clearAnnotations(container: Element): void {
  for (const mark of Array.from(container.querySelectorAll('mark[data-ann-id]'))) {
    const parent = mark.parentNode
    if (!parent) continue
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
  }
  container.normalize()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/annotations-paint.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/annotations/paint.ts tests/unit/annotations-paint.test.ts
git commit -m "feat(annotations): mark painting + idempotent clear over rendered preview"
```

---

### Task 5: localStorage store adapter

**Files:**
- Create: `app/lib/annotations/store-local.ts`
- Test: `tests/unit/annotations-store-local.test.ts`

**Interfaces:**
- Consumes: `AnnotationStore`, `ReviewAnnotation`, `AnnotationComment` from `~/types/annotations`.
- Produces: `ANNOTATIONS_STORAGE_PREFIX = 'icjia-studio-annotations-v1'`, `annotationsStorageKey(contentType, documentId): string`, `createLocalAnnotationStore(opts?: { storage?: Storage | null; onPersistFailure?: () => void }): AnnotationStore`. Unknown ids reject with `Error('annotation not found')`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/annotations-store-local.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createLocalAnnotationStore, annotationsStorageKey, ANNOTATIONS_STORAGE_PREFIX } from '~/lib/annotations/store-local'
import type { ReviewAnnotation } from '~/types/annotations'

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  } as Storage
}

const ann = (id: string): ReviewAnnotation => ({
  id, contentType: 'article', documentId: 'doc-1',
  anchor: { exact: 'quote', prefix: 'p', suffix: 's', offset: 10 },
  color: 'yellow', resolved: false, createdAt: '2026-07-04T00:00:00.000Z',
  createdBy: { name: 'Jane', email: 'jane@icjia.gov', roleLabel: 'Author' },
  comments: [{ id: 'c1', body: 'First note', authorName: 'Jane', authorEmail: 'jane@icjia.gov', createdAt: '2026-07-04T00:00:00.000Z' }],
})

describe('annotationsStorageKey', () => {
  it('is namespaced and versioned per content entry', () => {
    expect(annotationsStorageKey('article', 'doc-1')).toBe(`${ANNOTATIONS_STORAGE_PREFIX}:article:doc-1`)
  })
})

describe('createLocalAnnotationStore', () => {
  it('creates, lists (per key), and round-trips through JSON', async () => {
    const storage = memoryStorage()
    const store = createLocalAnnotationStore({ storage })
    await store.create(ann('a1'))
    await store.create({ ...ann('a2'), documentId: 'doc-2' })
    expect(await store.list('article', 'doc-1')).toEqual([ann('a1')])
    expect(storage.getItem(annotationsStorageKey('article', 'doc-1'))).toContain('"a1"')
  })
  it('addComment appends to the thread; setResolved flips; remove deletes', async () => {
    const store = createLocalAnnotationStore({ storage: memoryStorage() })
    await store.create(ann('a1'))
    const withReply = await store.addComment('a1', { id: 'c2', body: 'Reply', authorName: 'Ed', authorEmail: 'ed@icjia.gov', createdAt: '2026-07-04T01:00:00.000Z' })
    expect(withReply.comments.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect((await store.setResolved('a1', true)).resolved).toBe(true)
    await store.remove('a1')
    expect(await store.list('article', 'doc-1')).toEqual([])
  })
  it('rejects unknown ids', async () => {
    const store = createLocalAnnotationStore({ storage: memoryStorage() })
    await expect(store.setResolved('nope', true)).rejects.toThrow('annotation not found')
  })
  it('ignores corrupt JSON (treats as empty)', async () => {
    const storage = memoryStorage()
    storage.setItem(annotationsStorageKey('article', 'doc-1'), '{not json')
    const store = createLocalAnnotationStore({ storage })
    expect(await store.list('article', 'doc-1')).toEqual([])
  })
  it('falls back to memory (and reports once) when storage throws', async () => {
    const onPersistFailure = vi.fn()
    const throwing = { getItem: () => { throw new Error('quota') }, setItem: () => { throw new Error('quota') } } as unknown as Storage
    const store = createLocalAnnotationStore({ storage: throwing, onPersistFailure })
    await store.create(ann('a1'))
    await store.create(ann('a2'))
    expect((await store.list('article', 'doc-1')).map((a) => a.id)).toEqual(['a1', 'a2'])
    expect(onPersistFailure).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/annotations-store-local.test.ts`
Expected: FAIL — cannot resolve `~/lib/annotations/store-local`.

- [ ] **Step 3: Write the implementation**

```ts
// app/lib/annotations/store-local.ts
// localStorage AnnotationStore adapter (spec §4a). Used for ALL sessions in Phase 1 and
// permanently for demo builds/sessions — zero network, so the public demo's audited
// "fully self-contained" posture is untouched. Storage failures (quota, privacy mode)
// degrade to an in-memory Map for the session; onPersistFailure fires ONCE so the UI
// can toast "comments won't survive a reload in this browser".
import type { AnnotationComment, AnnotationContentType, AnnotationStore, ReviewAnnotation } from '~/types/annotations'

export const ANNOTATIONS_STORAGE_PREFIX = 'icjia-studio-annotations-v1'

export function annotationsStorageKey(contentType: string, documentId: string): string {
  return `${ANNOTATIONS_STORAGE_PREFIX}:${contentType}:${documentId}`
}

function defaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function createLocalAnnotationStore(opts: {
  storage?: Storage | null
  onPersistFailure?: () => void
} = {}): AnnotationStore {
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage
  const memory = new Map<string, ReviewAnnotation[]>() // per-key fallback
  let failed = storage == null

  function reportFailureOnce() {
    if (!failed) {
      failed = true
      opts.onPersistFailure?.()
    }
  }
  if (storage == null && opts.onPersistFailure) {
    // No storage at all counts as a persist failure (report on first use, not eagerly).
  }

  function read(key: string): ReviewAnnotation[] {
    if (failed) return memory.get(key) ?? []
    try {
      const raw = storage!.getItem(key)
      if (!raw) return memory.get(key) ?? []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ReviewAnnotation[]) : []
    } catch {
      // getItem threw (privacy mode) OR corrupt JSON. Only a throwing storage flips
      // the fallback; corrupt JSON just reads as empty.
      if (isStorageThrow(key)) reportFailureOnce()
      return memory.get(key) ?? []
    }
  }

  function isStorageThrow(key: string): boolean {
    try {
      storage!.getItem(key)
      return false
    } catch {
      return true
    }
  }

  function write(key: string, list: ReviewAnnotation[]): void {
    memory.set(key, list) // memory mirror keeps the session consistent either way
    if (failed) return
    try {
      storage!.setItem(key, JSON.stringify(list))
    } catch {
      reportFailureOnce()
    }
  }

  /** Find the storage key + list containing an annotation id (scan the memory mirror
   *  first, then any persisted keys under our prefix). */
  function locate(id: string): { key: string; list: ReviewAnnotation[]; index: number } | null {
    for (const [key, list] of memory) {
      const index = list.findIndex((a) => a.id === id)
      if (index !== -1) return { key, list: [...list], index }
    }
    if (!failed && storage) {
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (!key || !key.startsWith(ANNOTATIONS_STORAGE_PREFIX)) continue
          const list = read(key)
          const index = list.findIndex((a) => a.id === id)
          if (index !== -1) return { key, list, index }
        }
      } catch {
        reportFailureOnce()
      }
    }
    return null
  }

  return {
    async list(contentType: AnnotationContentType, documentId: string) {
      return read(annotationsStorageKey(contentType, documentId))
    },
    async create(a: ReviewAnnotation) {
      const key = annotationsStorageKey(a.contentType, a.documentId)
      write(key, [...read(key), a])
      return a
    },
    async addComment(id: string, c: AnnotationComment) {
      const found = locate(id)
      if (!found) throw new Error('annotation not found')
      const updated: ReviewAnnotation = { ...found.list[found.index]!, comments: [...found.list[found.index]!.comments, c] }
      found.list[found.index] = updated
      write(found.key, found.list)
      return updated
    },
    async setResolved(id: string, resolved: boolean) {
      const found = locate(id)
      if (!found) throw new Error('annotation not found')
      const updated: ReviewAnnotation = { ...found.list[found.index]!, resolved }
      found.list[found.index] = updated
      write(found.key, found.list)
      return updated
    },
    async remove(id: string) {
      const found = locate(id)
      if (!found) throw new Error('annotation not found')
      found.list.splice(found.index, 1)
      write(found.key, found.list)
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/annotations-store-local.test.ts`
Expected: PASS (6 tests). If the "falls back to memory" test double-fires `onPersistFailure`, check that `reportFailureOnce` is the only caller and `failed` short-circuits `write`.

- [ ] **Step 5: Commit**

```bash
git add app/lib/annotations/store-local.ts tests/unit/annotations-store-local.test.ts
git commit -m "feat(annotations): localStorage AnnotationStore adapter with in-memory fallback"
```

---

### Task 6: `useAnnotations` composable

**Files:**
- Create: `app/composables/useAnnotations.ts`
- Test: `tests/nuxt/use-annotations.test.ts`

**Interfaces:**
- Consumes: `createLocalAnnotationStore`, `annotationAuthor`, types, `useAuthStore` (getters `displayName`, `canPublish`, `user.email`), `isDemoSession` from `~/lib/demo`, `useToast`.
- Produces (the preview page consumes exactly this):

```ts
function useAnnotations(contentType: AnnotationContentType, documentId: string): {
  annotations: Ref<ReviewAnnotation[]>
  loading: Ref<boolean>
  load(): Promise<void>
  createAnnotation(anchor: AnnotationAnchor, color: AnnotationColor, body: string): Promise<ReviewAnnotation>
  reply(id: string, body: string): Promise<void>
  setResolved(id: string, resolved: boolean): Promise<void>
  removeAnnotation(id: string): Promise<void>
  author(): AnnotationAuthor          // current session's attribution
}
```

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/use-annotations.test.ts
// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from 'vitest'
import { useAnnotations } from '~/composables/useAnnotations'
import { useAuthStore } from '~/stores/auth'
import { makeDevAdminSession } from '~/lib/dev-auth'
import { ANNOTATIONS_STORAGE_PREFIX } from '~/lib/annotations/store-local'

beforeEach(() => {
  // clear any keys from earlier tests
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const k = window.localStorage.key(i)
    if (k?.startsWith(ANNOTATIONS_STORAGE_PREFIX)) window.localStorage.removeItem(k)
  }
  useAuthStore().setSession(makeDevAdminSession('editor'))
})

describe('useAnnotations', () => {
  it('creates an annotation with session attribution and the body as comments[0]', async () => {
    const ann = useAnnotations('article', 'doc-xyz')
    await ann.load()
    const created = await ann.createAnnotation({ exact: 'q', prefix: '', suffix: '', offset: 0 }, 'green', 'Tighten this.')
    expect(created.comments[0]!.body).toBe('Tighten this.')
    expect(created.createdBy.name).toBe('Dev Editor')
    expect(created.createdBy.roleLabel).toBe('Editor · demo')  // dev session ⇒ demo marker
    expect(created.color).toBe('green')
    expect(ann.annotations.value).toHaveLength(1)
  })
  it('reply, resolve, and remove update reactive state and persist', async () => {
    const ann = useAnnotations('article', 'doc-xyz')
    await ann.load()
    const created = await ann.createAnnotation({ exact: 'q', prefix: '', suffix: '', offset: 0 }, 'yellow', 'Note')
    await ann.reply(created.id, 'Agreed')
    expect(ann.annotations.value[0]!.comments).toHaveLength(2)
    await ann.setResolved(created.id, true)
    expect(ann.annotations.value[0]!.resolved).toBe(true)
    const fresh = useAnnotations('article', 'doc-xyz')
    await fresh.load()
    expect(fresh.annotations.value[0]!.resolved).toBe(true) // persisted
    await ann.removeAnnotation(created.id)
    expect(ann.annotations.value).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/use-annotations.test.ts`
Expected: FAIL — `useAnnotations` not found.

- [ ] **Step 3: Write the implementation**

```ts
// app/composables/useAnnotations.ts
// Reactive orchestration for reviewer annotations on the preview page (spec §4, §7).
// Adapter seam: Phase 1 is localStorage for every session. Phase 2 swaps in the Strapi
// repository adapter for real (non-demo) sessions right here — `isDemoData()` keeps
// demo builds on localStorage forever:
//   const store = isDemoData() ? createLocalAnnotationStore(...) : createStrapiAnnotationStore(...)
import { ref } from '#imports'
import type { AnnotationAnchor, AnnotationColor, AnnotationContentType, ReviewAnnotation } from '~/types/annotations'
import { createLocalAnnotationStore } from '~/lib/annotations/store-local'
import { annotationAuthor, type AnnotationAuthor } from '~/lib/annotations/attribution'
import { isDemoSession } from '~/lib/demo'
import { useAuthStore } from '~/stores/auth'

export function useAnnotations(contentType: AnnotationContentType, documentId: string) {
  const auth = useAuthStore()
  const toast = useToast()

  const store = createLocalAnnotationStore({
    onPersistFailure: () => toast.add({
      title: 'Comments are session-only in this browser',
      description: 'Storage is unavailable, so review comments will not survive a reload.',
      color: 'warning',
    }),
  })

  const annotations = ref<ReviewAnnotation[]>([])
  const loading = ref(true)

  function author(): AnnotationAuthor {
    return annotationAuthor({
      displayName: auth.displayName,
      email: auth.user?.email,
      canPublish: auth.canPublish,
      demo: isDemoSession(),
    })
  }

  async function load() {
    annotations.value = await store.list(contentType, documentId)
    loading.value = false
  }

  function replaceOne(updated: ReviewAnnotation) {
    annotations.value = annotations.value.map((a) => (a.id === updated.id ? updated : a))
  }

  async function createAnnotation(anchor: AnnotationAnchor, color: AnnotationColor, body: string): Promise<ReviewAnnotation> {
    const by = author()
    const now = new Date().toISOString()
    const a: ReviewAnnotation = {
      id: crypto.randomUUID(),
      contentType, documentId, anchor, color,
      resolved: false, createdAt: now,
      createdBy: by,
      comments: [{ id: crypto.randomUUID(), body, authorName: by.name, authorEmail: by.email, createdAt: now }],
    }
    await store.create(a)
    annotations.value = [...annotations.value, a]
    return a
  }

  async function reply(id: string, body: string) {
    const by = author()
    replaceOne(await store.addComment(id, {
      id: crypto.randomUUID(), body, authorName: by.name, authorEmail: by.email, createdAt: new Date().toISOString(),
    }))
  }

  async function setResolved(id: string, resolved: boolean) {
    replaceOne(await store.setResolved(id, resolved))
  }

  async function removeAnnotation(id: string) {
    await store.remove(id)
    annotations.value = annotations.value.filter((a) => a.id !== id)
  }

  return { annotations, loading, load, createAnnotation, reply, setResolved, removeAnnotation, author }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/use-annotations.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Full suite + commit**

Run: `npm test` — expected: 514 + new tests all green.

```bash
git add app/composables/useAnnotations.ts tests/nuxt/use-annotations.test.ts
git commit -m "feat(annotations): useAnnotations composable over the AnnotationStore seam"
```

---

### Task 7: Annotation CSS, bundled icons, and `AnnotationBar`

**Files:**
- Create: `app/assets/css/annotations.css`
- Modify: `nuxt.config.ts` (css array; `icon.clientBundle.icons`)
- Create: `app/components/annotations/AnnotationBar.vue`
- Test: `tests/nuxt/annotation-bar.test.ts`

**Interfaces:**
- Produces: `<AnnotationBar>` with props `{ armed: boolean; color: AnnotationColor; filter: 'open' | 'resolved' | 'all'; openCount: number }` and emits `update:armed (boolean)`, `update:color (AnnotationColor)`, `update:filter ('open' | 'resolved' | 'all')`, `toggle-rail ()`. Mark CSS classes `ann ann--{yellow|green|blue|pink}` + `.ann--resolved` + `.ann--active`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/annotation-bar.test.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AnnotationBar from '~/components/annotations/AnnotationBar.vue'

const base = { armed: false, color: 'yellow' as const, filter: 'open' as const, openCount: 3 }

describe('AnnotationBar', () => {
  it('shows the open-thread count and arms the highlighter', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base })
    expect(wrapper.text()).toContain('3')
    await wrapper.find('[data-test="ann-arm"]').trigger('click')
    expect(wrapper.emitted('update:armed')![0]).toEqual([true])
  })
  it('emits the picked color and marks it selected (aria-pressed)', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base })
    const green = wrapper.find('[data-test="ann-color-green"]')
    await green.trigger('click')
    expect(wrapper.emitted('update:color')![0]).toEqual(['green'])
    expect(wrapper.find('[data-test="ann-color-yellow"]').attributes('aria-pressed')).toBe('true')
  })
  it('cycles the filter', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: base })
    await wrapper.find('[data-test="ann-filter"]').trigger('click')
    expect(wrapper.emitted('update:filter')![0]).toEqual(['resolved'])
  })
  it('announces armed state accessibly', async () => {
    const wrapper = await mountSuspended(AnnotationBar, { props: { ...base, armed: true } })
    expect(wrapper.find('[data-test="ann-arm"]').attributes('aria-pressed')).toBe('true')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/annotation-bar.test.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Write CSS + config + component**

```css
/* app/assets/css/annotations.css
   Reviewer-annotation marks + print rules (spec §6). The PREVIEW SURFACE IS ALWAYS
   LIGHT (commit b8bd666: published prose renders on white in both themes), so mark
   tints are tuned once for the dark prose text: all four pastels keep ≥ 4.5:1 with
   near-black text (#1f2937 on the tints below is ≥ 9:1). Bar/rail chrome uses Nuxt UI
   utilities in the components and inherits the app theme. */

mark.ann {
  padding: 0 0.08em;
  border-radius: 2px;
  cursor: pointer;
  color: inherit;
}
mark.ann--yellow { background-color: #fde68a; }
mark.ann--green  { background-color: #bbf7d0; }
mark.ann--blue   { background-color: #bfdbfe; }
mark.ann--pink   { background-color: #fbcfe8; }

mark.ann:focus-visible {
  outline: 2px solid #1d4ed8;
  outline-offset: 1px;
}
mark.ann.ann--active {
  box-shadow: 0 0 0 2px #1d4ed8;
}
mark.ann.ann--resolved {
  opacity: 0.55;
  text-decoration: underline dotted;
}

@media (prefers-reduced-motion: no-preference) {
  mark.ann { transition: box-shadow 120ms ease-in-out; }
}

/* Print: review chrome never prints; highlight tints are stripped (the article print
   path also unwraps marks in its iframe clone — this covers direct browser printing). */
@media print {
  .ann-bar, .ann-rail, .ann-composer { display: none !important; }
  mark.ann {
    background: none !important;
    box-shadow: none !important;
    opacity: 1 !important;
    text-decoration: none !important;
    padding: 0;
  }
}
```

Modify `nuxt.config.ts` — add the stylesheet after `prose-preview.css`:

```ts
  css: [
    '~/assets/css/main.css',
    '~/assets/css/prose-preview.css',
    // Guided onboarding tour — base highlight-ring styles (ported from nuxt-guided-tour).
    '~/assets/css/guided-tour.css',
    // Reviewer annotations — mark tints + print rules (components style themselves with UI utilities).
    '~/assets/css/annotations.css',
  ],
```

and append the annotation icons to `icon.clientBundle.icons` (fallbackToApi is false — un-bundled icons silently don't render):

```ts
        // Reviewer-annotation UI (bar/rail/composer). Explicit for the same reason as
        // the tour icons: string usages the source scan may miss.
        'lucide:highlighter', 'lucide:message-square-text', 'lucide:reply',
        'lucide:trash-2', 'lucide:rotate-ccw', 'lucide:panel-right', 'lucide:map-pin-off',
```

```vue
<!-- app/components/annotations/AnnotationBar.vue -->
<!--
  The "static reviewers nav bar" (spec §6): arm the highlighter, pick the tint, filter
  open/resolved threads, open the rail. Dumb component — page owns all state; v-model
  style updates keep it trivially testable.
-->
<script setup lang="ts">
import { ANNOTATION_COLORS, type AnnotationColor } from '~/types/annotations'

type Filter = 'open' | 'resolved' | 'all'
const props = defineProps<{ armed: boolean; color: AnnotationColor; filter: Filter; openCount: number }>()
const emit = defineEmits<{
  'update:armed': [value: boolean]
  'update:color': [value: AnnotationColor]
  'update:filter': [value: Filter]
  'toggle-rail': []
}>()

const FILTER_ORDER: Filter[] = ['open', 'resolved', 'all']
const FILTER_LABEL: Record<Filter, string> = { open: 'Open', resolved: 'Resolved', all: 'All' }
function cycleFilter() {
  const i = FILTER_ORDER.indexOf(props.filter)
  emit('update:filter', FILTER_ORDER[(i + 1) % FILTER_ORDER.length]!)
}

/** Swatch backgrounds mirror annotations.css mark tints (kept inline: tiny + colocated). */
const SWATCH: Record<AnnotationColor, string> = {
  yellow: '#fde68a', green: '#bbf7d0', blue: '#bfdbfe', pink: '#fbcfe8',
}
</script>

<template>
  <div class="ann-bar flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Review tools">
    <UButton
      data-test="ann-arm"
      size="xs"
      :variant="armed ? 'solid' : 'outline'"
      color="primary"
      icon="i-lucide-highlighter"
      :aria-pressed="armed ? 'true' : 'false'"
      :label="armed ? 'Highlighting on' : 'Highlight'"
      @click="emit('update:armed', !armed)"
    />
    <div class="flex items-center gap-1" role="group" aria-label="Highlight color">
      <button
        v-for="c in ANNOTATION_COLORS"
        :key="c"
        type="button"
        :data-test="`ann-color-${c}`"
        class="h-5 w-5 rounded-full border border-neutral-400 dark:border-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
        :style="{ backgroundColor: SWATCH[c], boxShadow: c === color ? '0 0 0 2px #1d4ed8' : 'none' }"
        :aria-pressed="c === color ? 'true' : 'false'"
        :aria-label="`Highlight color ${c}`"
        @click="emit('update:color', c)"
      />
    </div>
    <UButton
      data-test="ann-filter"
      size="xs"
      variant="outline"
      color="neutral"
      :label="`Showing: ${FILTER_LABEL[filter]}`"
      @click="cycleFilter"
    />
    <UButton
      data-test="ann-rail-toggle"
      size="xs"
      variant="outline"
      color="neutral"
      icon="i-lucide-panel-right"
      :label="`Comments (${openCount})`"
      @click="emit('toggle-rail')"
    />
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/annotation-bar.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck + commit**

```bash
npm run typecheck
git add app/assets/css/annotations.css nuxt.config.ts app/components/annotations/AnnotationBar.vue tests/nuxt/annotation-bar.test.ts
git commit -m "feat(annotations): reviewer bar, mark tint CSS, bundled icons"
```

---

### Task 8: `AnnotationComposer` (floating add-comment popover)

**Files:**
- Create: `app/components/annotations/AnnotationComposer.vue`
- Test: `tests/nuxt/annotation-composer.test.ts`

**Interfaces:**
- Produces: `<AnnotationComposer>` with props `{ position: { x: number; y: number }; quote: string }` and emits `save (body: string)`, `cancel ()`. Renders `class="ann-composer"` fixed at `position`, autofocuses its textarea, traps Tab, Esc cancels, Save disabled while empty.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/annotation-composer.test.ts
// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AnnotationComposer from '~/components/annotations/AnnotationComposer.vue'

const props = { position: { x: 120, y: 240 }, quote: 'the quick brown fox' }

describe('AnnotationComposer', () => {
  it('shows the quote, disables Save while empty, saves trimmed body', async () => {
    const wrapper = await mountSuspended(AnnotationComposer, { props })
    expect(wrapper.text()).toContain('the quick brown fox')
    const save = wrapper.find('[data-test="ann-save"]')
    expect(save.attributes('disabled')).toBeDefined()
    await wrapper.find('textarea').setValue('  Needs a citation.  ')
    await wrapper.find('[data-test="ann-save"]').trigger('click')
    expect(wrapper.emitted('save')![0]).toEqual(['Needs a citation.'])
  })
  it('cancels on Escape', async () => {
    const wrapper = await mountSuspended(AnnotationComposer, { props })
    await wrapper.find('textarea').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
  it('positions itself at the given viewport coordinates', async () => {
    const wrapper = await mountSuspended(AnnotationComposer, { props })
    const style = wrapper.find('.ann-composer').attributes('style') ?? ''
    expect(style).toContain('120px')
    expect(style).toContain('240px')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/annotation-composer.test.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Write the implementation**

```vue
<!-- app/components/annotations/AnnotationComposer.vue -->
<!--
  Floating "Add comment" popover at the text selection (spec §6). The page owns
  positioning (viewport coords from the selection rect) and creation; this component
  only collects the body. Focus is trapped (textarea ↔ buttons); Esc cancels; the
  page restores focus after close.
-->
<script setup lang="ts">
import { ref, onMounted, computed } from '#imports'

const props = defineProps<{ position: { x: number; y: number }; quote: string }>()
const emit = defineEmits<{ save: [body: string]; cancel: [] }>()

const body = ref('')
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const rootEl = ref<HTMLElement | null>(null)
const canSave = computed(() => body.value.trim().length > 0)

/** Clamp so the popover never overflows the right viewport edge (320px wide + 16px gutter). */
const style = computed(() => {
  const left = import.meta.client ? Math.min(props.position.x, Math.max(16, window.innerWidth - 336)) : props.position.x
  return { left: `${left}px`, top: `${props.position.y}px` }
})

onMounted(() => textareaEl.value?.focus())

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { e.stopPropagation(); emit('cancel'); return }
  if (e.key !== 'Tab') return
  // Minimal focus trap over the popover's focusable controls.
  const focusables = Array.from(rootEl.value?.querySelectorAll<HTMLElement>('textarea, button:not([disabled])') ?? [])
  if (focusables.length === 0) return
  const first = focusables[0]!, last = focusables[focusables.length - 1]!
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

function save() {
  if (canSave.value) emit('save', body.value.trim())
}
</script>

<template>
  <div
    ref="rootEl"
    class="ann-composer fixed z-50 w-80 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 p-3 shadow-lg"
    :style="style"
    role="dialog"
    aria-label="Add review comment"
    @keydown="onKeydown"
  >
    <p class="text-xs text-muted italic mb-2 line-clamp-2">“{{ quote }}”</p>
    <textarea
      ref="textareaEl"
      v-model="body"
      rows="3"
      class="w-full rounded border border-neutral-300 dark:border-neutral-600 bg-transparent p-2 text-sm"
      placeholder="Add a comment for the author…"
      aria-label="Comment text"
    />
    <div class="mt-2 flex justify-end gap-2">
      <UButton data-test="ann-cancel" size="xs" variant="ghost" color="neutral" label="Cancel" @click="emit('cancel')" />
      <UButton data-test="ann-save" size="xs" color="primary" label="Comment" :disabled="!canSave" @click="save" />
    </div>
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/annotation-composer.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/annotations/AnnotationComposer.vue tests/nuxt/annotation-composer.test.ts
git commit -m "feat(annotations): floating add-comment composer with focus trap"
```

---

### Task 9: `AnnotationRail` (threads panel)

**Files:**
- Create: `app/components/annotations/AnnotationRail.vue`
- Test: `tests/nuxt/annotation-rail.test.ts`

**Interfaces:**
- Consumes: `canDeleteAnnotation` from `~/lib/annotations/attribution`; `RailThread` from `~/types/annotations`; `useAuthStore` (email + canPublish) — reads the store directly (repo precedent: `PublishButton`).
- Produces: `<AnnotationRail>` with props:

```ts
props: { threads: RailThread[]; filter: 'open' | 'resolved' | 'all'; activeId: string | null }
emits: reply(id: string, body: string) · resolve(id: string, resolved: boolean) · remove(id: string) · jump(id: string)
```

Sorting: non-orphans by `start` asc, orphans last by `createdAt`. Filter: `open` → unresolved, `resolved` → resolved, `all` → everything. Cards carry `:id="'ann-card-' + annotation.id"`; the active card auto-scrolls into view.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/annotation-rail.test.ts
// @vitest-environment nuxt
import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AnnotationRail from '~/components/annotations/AnnotationRail.vue'
import { useAuthStore } from '~/stores/auth'
import { makeDevAdminSession } from '~/lib/dev-auth'
import type { ReviewAnnotation } from '~/types/annotations'

const ann = (id: string, over: Partial<ReviewAnnotation> = {}): ReviewAnnotation => ({
  id, contentType: 'article', documentId: 'd1',
  anchor: { exact: `quote ${id}`, prefix: '', suffix: '', offset: 0 },
  color: 'yellow', resolved: false, createdAt: '2026-07-04T00:00:00.000Z',
  createdBy: { name: 'Dev Author', email: 'dev-author@localhost', roleLabel: 'Author · demo' },
  comments: [{ id: `c-${id}`, body: `Note on ${id}`, authorName: 'Dev Author', authorEmail: 'dev-author@localhost', createdAt: '2026-07-04T00:00:00.000Z' }],
  ...over,
})

beforeEach(() => { useAuthStore().setSession(makeDevAdminSession('editor')) })

describe('AnnotationRail', () => {
  it('sorts by document position with orphans last and flags them', async () => {
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [
        { annotation: ann('late'), orphan: false, start: 500 },
        { annotation: ann('lost'), orphan: true, start: null },
        { annotation: ann('early'), orphan: false, start: 10 },
      ],
      filter: 'all', activeId: null,
    } })
    const cards = wrapper.findAll('[data-test="ann-card"]')
    expect(cards.map((c) => c.attributes('id'))).toEqual(['ann-card-early', 'ann-card-late', 'ann-card-lost'])
    expect(cards[2]!.text()).toContain('text changed')
  })
  it('filters open vs resolved', async () => {
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [
        { annotation: ann('open1'), orphan: false, start: 1 },
        { annotation: ann('done1', { resolved: true }), orphan: false, start: 2 },
      ],
      filter: 'open', activeId: null,
    } })
    expect(wrapper.text()).toContain('Note on open1')
    expect(wrapper.text()).not.toContain('Note on done1')
  })
  it('emits reply with the typed body', async () => {
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [{ annotation: ann('a1'), orphan: false, start: 1 }], filter: 'all', activeId: null,
    } })
    await wrapper.find('[data-test="ann-reply-input"]').setValue('Fixed in draft')
    await wrapper.find('[data-test="ann-reply-send"]').trigger('click')
    expect(wrapper.emitted('reply')![0]).toEqual(['a1', 'Fixed in draft'])
  })
  it('emits resolve and jump; shows delete for permitted users (editor session)', async () => {
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [{ annotation: ann('a1'), orphan: false, start: 1 }], filter: 'all', activeId: null,
    } })
    await wrapper.find('[data-test="ann-resolve"]').trigger('click')
    expect(wrapper.emitted('resolve')![0]).toEqual(['a1', true])
    await wrapper.find('[data-test="ann-quote"]').trigger('click')
    expect(wrapper.emitted('jump')![0]).toEqual(['a1'])
    expect(wrapper.find('[data-test="ann-delete"]').exists()).toBe(true)
  })
  it('hides delete when not permitted (author session, someone else’s thread)', async () => {
    useAuthStore().setSession(makeDevAdminSession('author'))
    const other = ann('a1')
    other.createdBy = { name: 'Someone', email: 'someone@icjia.gov', roleLabel: 'Author' }
    const wrapper = await mountSuspended(AnnotationRail, { props: {
      threads: [{ annotation: other, orphan: false, start: 1 }], filter: 'all', activeId: null,
    } })
    expect(wrapper.find('[data-test="ann-delete"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/annotation-rail.test.ts`
Expected: FAIL — component not found.

- [ ] **Step 3: Write the implementation**

```vue
<!-- app/components/annotations/AnnotationRail.vue -->
<!--
  The comments rail (spec §6): threads in document order (orphans last), reply box,
  resolve/reopen, delete (creator or Editor — canDeleteAnnotation), click-quote → jump
  to the highlight. Reads the auth store directly (PublishButton precedent). Comment
  bodies are Vue-interpolated text — NEVER v-html.
-->
<script setup lang="ts">
import { ref, computed, watch, nextTick } from '#imports'
import type { RailThread } from '~/types/annotations'
import { canDeleteAnnotation } from '~/lib/annotations/attribution'
import { useAuthStore } from '~/stores/auth'

type Filter = 'open' | 'resolved' | 'all'

const props = defineProps<{ threads: RailThread[]; filter: Filter; activeId: string | null }>()
const emit = defineEmits<{
  reply: [id: string, body: string]
  resolve: [id: string, resolved: boolean]
  remove: [id: string]
  jump: [id: string]
}>()

const auth = useAuthStore()
const me = computed(() => ({ email: auth.user?.email ?? '', canPublish: auth.canPublish }))

const drafts = ref<Record<string, string>>({})

const visible = computed(() => {
  const byFilter = props.threads.filter((t) =>
    props.filter === 'all' ? true : props.filter === 'resolved' ? t.annotation.resolved : !t.annotation.resolved,
  )
  return [...byFilter].sort((a, b) => {
    if (a.orphan !== b.orphan) return a.orphan ? 1 : -1
    if (!a.orphan) return (a.start ?? 0) - (b.start ?? 0)
    return a.annotation.createdAt.localeCompare(b.annotation.createdAt)
  })
})

function sendReply(id: string) {
  const body = (drafts.value[id] ?? '').trim()
  if (!body) return
  emit('reply', id, body)
  drafts.value = { ...drafts.value, [id]: '' }
}

function timeOf(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString()
}

watch(() => props.activeId, async (id) => {
  if (!id) return
  await nextTick()
  const el = document.getElementById(`ann-card-${id}`)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' })
})
</script>

<template>
  <section class="ann-rail" aria-label="Review comments">
    <p v-if="visible.length === 0" class="text-sm text-muted p-3">
      No {{ filter === 'all' ? '' : filter + ' ' }}comments yet. Turn on <strong>Highlight</strong> and select text to add one.
    </p>
    <article
      v-for="t in visible"
      :key="t.annotation.id"
      :id="`ann-card-${t.annotation.id}`"
      data-test="ann-card"
      class="rounded-lg border p-3 mb-3 bg-white dark:bg-neutral-900"
      :class="t.annotation.id === activeId ? 'border-blue-600 dark:border-blue-400' : 'border-neutral-200 dark:border-neutral-700'"
    >
      <header class="flex items-center gap-2 mb-1">
        <span class="h-3 w-3 rounded-full shrink-0" :class="`ann-dot--${t.annotation.color}`" aria-hidden="true" />
        <span class="text-sm font-medium">{{ t.annotation.createdBy.name }}</span>
        <span class="text-xs text-muted">{{ t.annotation.createdBy.roleLabel }}</span>
        <span v-if="t.annotation.resolved" class="text-xs text-muted ml-auto">Resolved</span>
      </header>

      <button
        type="button"
        data-test="ann-quote"
        class="text-left text-xs italic text-muted line-clamp-2 hover:underline"
        :disabled="t.orphan"
        :aria-label="`Go to highlight: ${t.annotation.anchor.exact}`"
        @click="emit('jump', t.annotation.id)"
      >“{{ t.annotation.anchor.exact }}”</button>
      <p v-if="t.orphan" class="text-xs text-warning mt-1">
        <UIcon name="i-lucide-map-pin-off" class="align-text-bottom" /> text changed — highlight not found
      </p>

      <ul class="mt-2 space-y-2">
        <li v-for="c in t.annotation.comments" :key="c.id" class="text-sm">
          <span class="font-medium">{{ c.authorName }}</span>
          <span class="text-xs text-muted ml-1">{{ timeOf(c.createdAt) }}</span>
          <p class="whitespace-pre-wrap">{{ c.body }}</p>
        </li>
      </ul>

      <div class="mt-2 flex items-center gap-1">
        <input
          data-test="ann-reply-input"
          :value="drafts[t.annotation.id] ?? ''"
          type="text"
          class="flex-1 rounded border border-neutral-300 dark:border-neutral-600 bg-transparent px-2 py-1 text-sm"
          placeholder="Reply…"
          :aria-label="`Reply to ${t.annotation.createdBy.name}`"
          @input="drafts = { ...drafts, [t.annotation.id]: ($event.target as HTMLInputElement).value }"
          @keydown.enter.prevent="sendReply(t.annotation.id)"
        >
        <UButton data-test="ann-reply-send" size="xs" variant="ghost" icon="i-lucide-reply" aria-label="Send reply" @click="sendReply(t.annotation.id)" />
      </div>

      <footer class="mt-2 flex items-center gap-2">
        <UButton
          data-test="ann-resolve"
          size="xs"
          :variant="t.annotation.resolved ? 'outline' : 'soft'"
          :color="t.annotation.resolved ? 'neutral' : 'success'"
          :icon="t.annotation.resolved ? 'i-lucide-rotate-ccw' : 'i-lucide-check'"
          :label="t.annotation.resolved ? 'Reopen' : 'Resolve'"
          @click="emit('resolve', t.annotation.id, !t.annotation.resolved)"
        />
        <UButton
          v-if="canDeleteAnnotation(t.annotation, me)"
          data-test="ann-delete"
          size="xs"
          variant="ghost"
          color="error"
          icon="i-lucide-trash-2"
          aria-label="Delete thread"
          @click="emit('remove', t.annotation.id)"
        />
      </footer>
    </article>
  </section>
</template>

<style scoped>
.ann-dot--yellow { background-color: #fde68a; }
.ann-dot--green  { background-color: #bbf7d0; }
.ann-dot--blue   { background-color: #bfdbfe; }
.ann-dot--pink   { background-color: #fbcfe8; }
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/annotation-rail.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/components/annotations/AnnotationRail.vue tests/nuxt/annotation-rail.test.ts
git commit -m "feat(annotations): comments rail with threads, resolve, delete gating"
```

---

### Task 10: Preview-page integration

**Files:**
- Modify: `app/pages/preview/[type]/[documentId].vue` (full replacement shown below)
- Test: `tests/nuxt/preview-annotations.test.ts`

**Interfaces:**
- Consumes everything produced so far: `useAnnotations`, `captureAnchor`, `resolveAnchor`, `paintOffsets`, `clearAnnotations`, `AnnotationBar`, `AnnotationComposer`, `AnnotationRail` (+ its `RailThread` shape).
- Produces: the assembled feature. Last-used color persists at `localStorage['icjia-studio-annotations-v1:color']`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/preview-annotations.test.ts
// @vitest-environment nuxt
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAuthStore } from '~/stores/auth'
import { makeDevAdminSession } from '~/lib/dev-auth'
import { annotationsStorageKey, ANNOTATIONS_STORAGE_PREFIX } from '~/lib/annotations/store-local'
import type { Article } from '~/types/content'
import type { ReviewAnnotation } from '~/types/annotations'

const article: Partial<Article> = {
  documentId: 'a1', title: 'Annotated Draft',
  markdown: 'The quick brown fox jumps over the lazy dog.',
}
const findOneMock = vi.fn().mockResolvedValue(article)
mockNuxtImport('useArticles', () => () => ({ list: vi.fn(), findOne: findOneMock, create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
mockNuxtImport('useRoute', () => () => ({ params: { type: 'article', documentId: 'a1' } }))

import PreviewPage from '~/pages/preview/[type]/[documentId].vue'

const seed: ReviewAnnotation = {
  id: 'seed-1', contentType: 'article', documentId: 'a1',
  anchor: { exact: 'brown fox', prefix: 'The quick ', suffix: ' jumps over', offset: 10 },
  color: 'green', resolved: false, createdAt: '2026-07-04T00:00:00.000Z',
  createdBy: { name: 'Dev Editor', email: 'dev-editor@localhost', roleLabel: 'Editor · demo' },
  comments: [{ id: 'c1', body: 'Consider a citation here.', authorName: 'Dev Editor', authorEmail: 'dev-editor@localhost', createdAt: '2026-07-04T00:00:00.000Z' }],
}

beforeEach(() => {
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const k = window.localStorage.key(i)
    if (k?.startsWith(ANNOTATIONS_STORAGE_PREFIX)) window.localStorage.removeItem(k)
  }
  useAuthStore().setSession(makeDevAdminSession('editor'))
  window.localStorage.setItem(annotationsStorageKey('article', 'a1'), JSON.stringify([seed]))
})

describe('preview page — annotations', () => {
  it('mounts the reviewer bar and rail with the stored thread', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0)) // load → nextTick paint
    expect(wrapper.find('[data-test="ann-arm"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Consider a citation here.')
  })
  it('paints the stored annotation over the rendered markdown', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    const mark = wrapper.find('mark[data-ann-id="seed-1"]')
    expect(mark.exists()).toBe(true)
    expect(mark.text()).toBe('brown fox')
    expect(mark.classes()).toContain('ann--green')
  })
  it('shows an orphan flag when the quote no longer matches', async () => {
    window.localStorage.setItem(annotationsStorageKey('article', 'a1'), JSON.stringify([
      { ...seed, id: 'ghost', anchor: { exact: 'vanished words', prefix: '', suffix: '', offset: 3 } },
    ]))
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="ghost"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('text changed — highlight not found')
  })
  it('resolving via the rail unpaints under the default open filter', async () => {
    const wrapper = await mountSuspended(PreviewPage)
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.find('[data-test="ann-resolve"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(wrapper.find('mark[data-ann-id="seed-1"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/preview-annotations.test.ts`
Expected: FAIL — no `[data-test="ann-arm"]` on the page.

- [ ] **Step 3: Replace the preview page**

```vue
<!-- app/pages/preview/[type]/[documentId].vue -->
<!--
  /preview/:type/:documentId — render a saved DRAFT exactly as it would publish, via the same
  Published*Preview components + renderMarkdown the editor modal uses (so preview == published),
  inside the swappable hub stylesheet (prose-preview.css). This is the shareable draft link: it
  stays private behind the global auth guard, so anyone signed in to the Studio (the reviewers)
  can open it — the "Copy share link" button grabs the stable URL.

  REVIEWER ANNOTATIONS (spec: docs/superpowers/specs/2026-07-04-reviewer-annotations-design.md):
  highlights + threaded comments as a pure overlay on the rendered preview. Anchors are captured
  from text selections over .published-content, stored via useAnnotations (localStorage in
  Phase 1), and painted as <mark data-ann-id> elements after render. The article markdown is
  never touched.
-->
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from '#imports'
import type { Article, App, Dataset } from '~/types/content'
import type { AnnotationAnchor, AnnotationColor, AnnotationContentType, RailThread } from '~/types/annotations'
import { ANNOTATION_COLORS } from '~/types/annotations'
import { captureAnchor, resolveAnchor } from '~/lib/annotations/anchor'
import { paintOffsets, clearAnnotations } from '~/lib/annotations/paint'
import { ANNOTATIONS_STORAGE_PREFIX } from '~/lib/annotations/store-local'

const route = useRoute()
const type = route.params.type as 'article' | 'app' | 'dataset'
const documentId = route.params.documentId as string
const toast = useToast()

const repo = type === 'article' ? useArticles() : type === 'app' ? useApps() : useDatasets()
const entry = ref<Article | App | Dataset | null>(null)
const loading = ref(true)

const asArticle = computed(() => (type === 'article' ? (entry.value as Article | null) : null))
const asApp = computed(() => (type === 'app' ? (entry.value as App | null) : null))
const asDataset = computed(() => (type === 'dataset' ? (entry.value as Dataset | null) : null))

/** Copy this draft's stable preview URL — opens for anyone signed in to the Studio. */
async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    toast.add({ title: 'Share link copied', description: 'Anyone signed in to the Studio can open it.', color: 'success' })
  } catch {
    toast.add({ title: 'Could not copy link', description: window.location.href, color: 'error' })
  }
}

// ---------------------------------------------------------------------------
// Reviewer annotations
// ---------------------------------------------------------------------------

const ann = useAnnotations(type as AnnotationContentType, documentId)

const COLOR_KEY = `${ANNOTATIONS_STORAGE_PREFIX}:color`
function initialColor(): AnnotationColor {
  try {
    const saved = window.localStorage.getItem(COLOR_KEY) as AnnotationColor | null
    return saved && (ANNOTATION_COLORS as readonly string[]).includes(saved) ? saved : 'yellow'
  } catch { return 'yellow' }
}

const armed = ref(false)
const color = ref<AnnotationColor>('yellow')
const filter = ref<'open' | 'resolved' | 'all'>('open')
const railOpen = ref(true)
const activeId = ref<string | null>(null)
/** Pending composer state: anchor captured, waiting for the comment body. */
const composer = ref<{ anchor: AnnotationAnchor; position: { x: number; y: number } } | null>(null)
/** id → resolved start offset (null = orphan). Drives rail order + orphan flags. */
const resolvedStarts = ref<Record<string, number | null>>({})

const previewWrap = ref<HTMLElement | null>(null)
function annotationContainer(): Element | null {
  return previewWrap.value?.querySelector('.published-content') ?? null
}

const openCount = computed(() => ann.annotations.value.filter((a) => !a.resolved).length)
const threads = computed<RailThread[]>(() => ann.annotations.value.map((a) => ({
  annotation: a,
  orphan: resolvedStarts.value[a.id] === null,
  start: resolvedStarts.value[a.id] ?? null,
})))

function setColor(c: AnnotationColor) {
  color.value = c
  try { window.localStorage.setItem(COLOR_KEY, c) } catch { /* preference only */ }
}

/** Whether a painted annotation is visible under the current filter. */
function visibleUnderFilter(resolved: boolean): boolean {
  return filter.value === 'all' || (filter.value === 'resolved') === resolved
}

/** Re-resolve + repaint every annotation. Idempotent: clears first, then paints the
 *  filtered set; records start offsets (null → orphan) for the rail. */
function repaint() {
  const container = annotationContainer()
  if (!container) return
  clearAnnotations(container)
  const starts: Record<string, number | null> = {}
  for (const a of ann.annotations.value) {
    const span = resolveAnchor(container, a.anchor)
    starts[a.id] = span ? span.start : null
    if (!span || !visibleUnderFilter(a.resolved)) continue
    const marks = paintOffsets(container, span.start, span.end, a.id, a.color)
    for (const m of marks) {
      if (a.resolved) m.classList.add('ann--resolved')
      if (a.id === activeId.value) m.classList.add('ann--active')
      m.setAttribute('aria-label', `Review comment by ${a.createdBy.name}: ${a.anchor.exact.slice(0, 60)}`)
    }
  }
  resolvedStarts.value = starts
}

/** Open a thread from its highlight: activate, open the rail, let the rail scroll to it. */
function openThread(id: string) {
  activeId.value = id
  railOpen.value = true
  repaint()
}

/** Click / keyboard activation on painted marks (event delegation on the wrapper). */
function onContainerClick(e: MouseEvent) {
  const mark = (e.target as HTMLElement).closest?.('mark[data-ann-id]') as HTMLElement | null
  if (mark?.dataset.annId) openThread(mark.dataset.annId)
}
function onContainerKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' && e.key !== ' ') return
  const mark = (e.target as HTMLElement).closest?.('mark[data-ann-id]') as HTMLElement | null
  if (mark?.dataset.annId) { e.preventDefault(); openThread(mark.dataset.annId) }
}

/** Armed-highlighter selection flow → composer. */
function onMouseUp() {
  if (!armed.value || composer.value) return
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
  const container = annotationContainer()
  if (!container) return
  const range = sel.getRangeAt(0)
  const res = captureAnchor(container, range)
  if (!res.ok) {
    if (res.reason !== 'outside' && res.reason !== 'empty') {
      const msg = res.reason === 'katex'
        ? 'Math and rendered widgets can’t be highlighted — select the surrounding text instead.'
        : 'That selection is too long to highlight — pick a shorter passage.'
      toast.add({ title: 'Can’t highlight that selection', description: msg, color: 'warning' })
    }
    return
  }
  const rect = range.getBoundingClientRect()
  composer.value = { anchor: res.anchor, position: { x: rect.left, y: rect.bottom + 8 } }
}

/** Screen-reader announcements for actions with no visible focus change (spec §6). */
const announce = ref('')

async function saveComposer(body: string) {
  if (!composer.value) return
  const created = await ann.createAnnotation(composer.value.anchor, color.value, body)
  composer.value = null
  window.getSelection()?.removeAllRanges()
  await nextTick()
  activeId.value = created.id
  repaint()
  announce.value = 'Comment added'
}

async function onReply(id: string, body: string) { await ann.reply(id, body) }
async function onResolve(id: string, resolved: boolean) {
  await ann.setResolved(id, resolved)
  repaint()
  announce.value = resolved ? 'Thread resolved' : 'Thread reopened'
}
async function onRemove(id: string) {
  await ann.removeAnnotation(id)
  if (activeId.value === id) activeId.value = null
  repaint()
  announce.value = 'Thread deleted'
}

/** Rail → highlight: scroll the mark into view and flash it active. */
function jumpToMark(id: string) {
  activeId.value = id
  repaint()
  const mark = annotationContainer()?.querySelector<HTMLElement>(`mark[data-ann-id="${CSS.escape(id)}"]`)
  if (!mark) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  mark.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
  mark.focus({ preventScroll: true })
}

/** Another tab wrote annotations for this document → reload + repaint. */
async function onStorage(e: StorageEvent) {
  if (!e.key?.startsWith(ANNOTATIONS_STORAGE_PREFIX)) return
  await ann.load()
  repaint()
}

watch(filter, () => repaint())

onMounted(async () => {
  color.value = initialColor()
  window.addEventListener('storage', onStorage)
  try {
    entry.value = await repo.findOne(documentId, { status: 'draft' })
  } finally {
    loading.value = false
  }
  await ann.load()
  await nextTick() // let the Published*Preview render its v-html body first
  repaint()
})

onBeforeUnmount(() => window.removeEventListener('storage', onStorage))
</script>

<template>
  <!-- the page has the sticky Studio header (~4rem), so the TOC sticks below it -->
  <div class="max-w-6xl mx-auto" style="--published-toc-top: 5rem">
    <p v-if="loading" class="text-muted">Loading…</p>
    <template v-else-if="entry">
      <div class="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <p class="text-xs text-muted uppercase tracking-wide">Draft preview</p>
        <div class="flex items-center gap-3 flex-wrap">
          <AnnotationBar
            :armed="armed"
            :color="color"
            :filter="filter"
            :open-count="openCount"
            @update:armed="armed = $event"
            @update:color="setColor"
            @update:filter="filter = $event"
            @toggle-rail="railOpen = !railOpen"
          />
          <UButton size="xs" variant="outline" color="neutral" icon="i-lucide-link" label="Copy share link" @click="copyShareLink" />
        </div>
      </div>

      <div class="flex items-start gap-6">
        <!-- -mx-4 sm:-mx-6 cancels the layout <main>'s horizontal padding so the article (and its
             full-bleed splash) reaches the container's edges. The body inset is carried
             by .published-layout / .published-content in prose-preview.css, so text stays readable. -->
        <div
          ref="previewWrap"
          class="-mx-4 sm:-mx-6 min-w-0 flex-1"
          :class="{ 'ann-arming': armed }"
          @click="onContainerClick"
          @keydown="onContainerKeydown"
          @mouseup="onMouseUp"
        >
          <PublishedArticlePreview v-if="asArticle" :article="asArticle" />
          <PublishedAppPreview v-else-if="asApp" :app="asApp" />
          <PublishedDatasetPreview v-else-if="asDataset" :dataset="asDataset" />
        </div>

        <aside v-if="railOpen" class="ann-rail-wrap hidden lg:block w-80 shrink-0 sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <AnnotationRail :threads="threads" :filter="filter" :active-id="activeId"
            @reply="onReply" @resolve="onResolve" @remove="onRemove" @jump="jumpToMark" />
        </aside>
      </div>

      <!-- Mobile: the rail as a slide-over drawer -->
      <div v-if="railOpen" class="lg:hidden fixed inset-y-0 right-0 z-40 w-80 max-w-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 shadow-xl overflow-y-auto p-3">
        <div class="flex justify-end mb-2">
          <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-x" aria-label="Close comments" @click="railOpen = false" />
        </div>
        <AnnotationRail :threads="threads" :filter="filter" :active-id="activeId"
          @reply="onReply" @resolve="onResolve" @remove="onRemove" @jump="jumpToMark" />
      </div>

      <AnnotationComposer
        v-if="composer"
        :position="composer.position"
        :quote="composer.anchor.exact"
        @save="saveComposer"
        @cancel="composer = null"
      />

      <p class="sr-only" role="status" aria-live="polite">{{ announce }}</p>
    </template>
    <p v-else class="text-muted">Not found.</p>
  </div>
</template>

<style scoped>
/* Crosshair-ish cue while the highlighter is armed. */
.ann-arming :deep(.published-content) { cursor: text; }
</style>
```

Note for the implementer: the desktop rail sits OUTSIDE the `-mx-4` wrapper so the
negative margins keep applying to the preview only. `min-w-0 flex-1` preserves the
existing full-width render when the rail is closed.

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/nuxt/preview-annotations.test.ts tests/nuxt/preview-page.test.ts`
Expected: BOTH files PASS — the pre-existing preview-page tests must keep passing unchanged (same fetch, same render, same not-found copy).

- [ ] **Step 5: Full suite + typecheck + commit**

Run: `npm test && npm run typecheck`
Expected: all green.

```bash
git add app/pages/preview/\[type\]/\[documentId\].vue tests/nuxt/preview-annotations.test.ts
git commit -m "feat(annotations): preview-page integration — select→comment, paint, rail, drawer"
```

---

### Task 11: Print path strips annotation marks

**Files:**
- Modify: `app/components/PublishedArticlePreview.vue` (the `printArticle` function only)
- Test: append to `tests/nuxt/published-article-preview-print.test.ts`

**Interfaces:**
- Consumes: `clearAnnotations` from `~/lib/annotations/paint`.

- [ ] **Step 1: Append the failing test**

Append inside the existing `describe('PublishedArticlePreview – printArticle()')` block. It reuses the file's established fake-iframe pattern (createElement spy + `docWrite` mock + `wrapper.vm.$.exposed!.printArticle()`) and the existing `article` fixture, whose body renders the literal text `Body text here.`:

```ts
  it('print clone contains no annotation marks (highlights never print)', async () => {
    const wrapper = await mountSuspended(PublishedArticlePreview, { props: { article } })

    // Paint an annotation into the live DOM exactly as the preview page does.
    const { textContentOf } = await import('~/lib/annotations/anchor')
    const { paintOffsets } = await import('~/lib/annotations/paint')
    const body = wrapper.element.querySelector('.prose-preview')!
    const text = textContentOf(body)
    const start = text.indexOf('Body text')
    expect(start).toBeGreaterThan(-1)
    paintOffsets(body, start, start + 'Body text'.length, 'a1', 'yellow')
    expect(wrapper.element.querySelectorAll('mark[data-ann-id]')).toHaveLength(1)

    // Fake iframe (same shape as the first test in this file).
    const docWrite = vi.fn()
    const mockIwin = {
      print: vi.fn(), focus: vi.fn(), addEventListener: vi.fn(),
      document: { open: vi.fn(), write: docWrite, close: vi.fn() },
    }
    const mockIframe = {
      setAttribute: vi.fn(), style: { cssText: '' }, contentWindow: mockIwin, parentNode: null,
    } as unknown as HTMLIFrameElement
    const origCreate = document.createElement.bind(document)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(vi.spyOn(document, 'createElement') as any).mockImplementation((tag: string) => {
      if (tag === 'iframe') return mockIframe
      return origCreate(tag)
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(vi.spyOn(document.body, 'appendChild') as any).mockReturnValue(mockIframe)

    wrapper.vm.$.exposed!.printArticle()

    const written = docWrite.mock.calls[0]![0] as string
    expect(written).not.toContain('data-ann-id')     // mark wrapper stripped from the clone
    expect(written).toContain('Body text here.')     // …but the text survives
    // The LIVE DOM keeps its highlight — only the print clone is unwrapped.
    expect(wrapper.element.querySelectorAll('mark[data-ann-id]')).toHaveLength(1)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/published-article-preview-print.test.ts`
Expected: the new test FAILS — printed HTML contains `data-ann-id`.

- [ ] **Step 3: Modify `printArticle`**

In `app/components/PublishedArticlePreview.vue`, add the import:

```ts
import { clearAnnotations } from '~/lib/annotations/paint'
```

and replace the final `doc.write(...)` block's use of `rootEl.value.outerHTML`:

```ts
  // Write the article into the iframe. The dark class is NOT copied — print must be light.
  // Reviewer-annotation marks are UNWRAPPED from the clone (spec §6): printed output is
  // always annotation-free; the live DOM keeps its highlights.
  const printClone = rootEl.value.cloneNode(true) as HTMLElement
  clearAnnotations(printClone)
  const doc = iwin.document
  doc.open()
  doc.write(
    `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>${safeTitle}</title>\n${styleLinks}\n</head>\n<body>${printClone.outerHTML}</body>\n</html>`,
  )
  doc.close()
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/nuxt/published-article-preview-print.test.ts`
Expected: PASS (all pre-existing print tests + the new one).

- [ ] **Step 5: Commit**

```bash
git add app/components/PublishedArticlePreview.vue tests/nuxt/published-article-preview-print.test.ts
git commit -m "fix(annotations): print clone strips annotation marks"
```

---

### Task 12: Strapi drop-in files, schema-parity test, changelog

**Files:**
- Create: `deploy/strapi/review-annotation/content-types/review-annotation/schema.json`
- Create: `deploy/strapi/review-annotation/controllers/review-annotation.ts`
- Create: `deploy/strapi/review-annotation/routes/review-annotation.ts`
- Create: `deploy/strapi/review-annotation/services/review-annotation.ts`
- Create: `deploy/strapi/review-annotation/INSTALL.md`
- Test: `tests/unit/annotations-strapi-schema.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: `ANNOTATION_COLORS`, `ANNOTATION_CONTENT_TYPES` from `~/types/annotations` (the parity test pins the deploy schema to the app enums).

- [ ] **Step 1: Write the failing parity test**

```ts
// tests/unit/annotations-strapi-schema.test.ts
// Pins the Phase-2 drop-in Strapi schema to the app's enums so they can never drift
// (same guard style as security-headers.test.ts pinning deploy/headers-demo.txt).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ANNOTATION_COLORS, ANNOTATION_CONTENT_TYPES } from '~/types/annotations'

const schemaPath = resolve(__dirname, '../../deploy/strapi/review-annotation/content-types/review-annotation/schema.json')

describe('review-annotation Strapi schema (deploy drop-in)', () => {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'))
  it('is a collection type with Draft & Publish OFF', () => {
    expect(schema.kind).toBe('collectionType')
    expect(schema.options.draftAndPublish).toBe(false)
  })
  it('color and contentType enums match the app', () => {
    expect(schema.attributes.color.enum).toEqual([...ANNOTATION_COLORS])
    expect(schema.attributes.contentType.enum).toEqual([...ANNOTATION_CONTENT_TYPES])
  })
  it('carries the anchor + thread fields the mapper will need', () => {
    for (const f of ['targetDocumentId', 'exact', 'prefix', 'suffix', 'offsetHint', 'resolved', 'authorName', 'authorEmail', 'authorRole', 'comments']) {
      expect(schema.attributes[f], `missing attribute ${f}`).toBeDefined()
    }
    expect(schema.attributes.comments.type).toBe('json')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/annotations-strapi-schema.test.ts`
Expected: FAIL — schema file does not exist.

- [ ] **Step 3: Create the drop-in files**

`deploy/strapi/review-annotation/content-types/review-annotation/schema.json` — exactly the schema from spec §8:

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

`deploy/strapi/review-annotation/controllers/review-annotation.ts`:

```ts
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::review-annotation.review-annotation')
```

`deploy/strapi/review-annotation/routes/review-annotation.ts`:

```ts
import { factories } from '@strapi/strapi'

export default factories.createCoreRouter('api::review-annotation.review-annotation')
```

`deploy/strapi/review-annotation/services/review-annotation.ts`:

```ts
import { factories } from '@strapi/strapi'

export default factories.createCoreService('api::review-annotation.review-annotation')
```

`deploy/strapi/review-annotation/INSTALL.md`:

```markdown
# Installing the `review-annotation` content type (Strapi 5)

Drop-in for the Studio's reviewer-annotation feature (Phase 2 — see
`docs/superpowers/specs/2026-07-04-reviewer-annotations-design.md` §8). Content types are
CODE in Strapi: they cannot be created remotely with an API token or on a production-mode
server. This folder is copied into the Strapi PROJECT and deployed like any code change.

## Steps

1. Copy this folder into the Strapi project as `src/api/review-annotation/`
   (so the schema lands at `src/api/review-annotation/content-types/review-annotation/schema.json`).
   If the Strapi project is JavaScript, rename the three `.ts` stubs to `.js` and change each to
   `const { factories } = require('@strapi/strapi')` + `module.exports = factories.createCore…(…)`.
2. Deploy / restart Strapi. The type appears in the admin under Content Manager.
3. Permissions — Settings → Administration panel → Roles:
   - **Author** and **Editor** (and Super Admin implicitly): grant full Create / Read /
     Update / Delete on **Review Annotation**. RBAC stays coarse on purpose — the Studio
     enforces the finer creator-or-Editor delete rule in the UI (spec §1).
   - **Settings → Users & Permissions plugin → Roles → Public (and Authenticated):**
     leave Review Annotation at ZERO access. Review threads are internal workflow data
     and must not be exposed via the public REST/GraphQL surface.
4. Optional smoke test with the dev API token (server-side only — never ship it to a client):
   `curl -H "Authorization: Bearer $STRAPI_API_TOKEN" https://v2.hub.icjia-api.cloud/api/review-annotations`
   Expect `200 {"data":[]}` if the token's scope includes the new type, or `403` if not —
   either confirms the type exists. The Studio itself reaches the type via the
   Content-Manager admin API with the signed-in admin JWT, not this token.

## Field notes

- `targetDocumentId` is a plain string (the annotated entry's documentId) — deliberately
  NOT a relation, because one field can't relate to all three content types.
- `comments` is a JSON array (`{ id, body, authorName, authorEmail, createdAt }[]`);
  `comments[0]` is the annotation's initial note.
- Draft & Publish is OFF — annotations have no draft state.
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/unit/annotations-strapi-schema.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Changelog + final verification + commit**

Add under `## [Unreleased]` in `CHANGELOG.md`, below the `### 2026-07-04` heading's existing spec entry (same `_Added_` list):

```markdown
- **Reviewer annotations on the draft preview (Phase 1).** On `/preview/:type/:documentId`, any signed-in user can highlight a passage (4 colors), attach a comment, reply in threads, and resolve/reopen — Word-style review for drafts. Highlights are anchored by quote (survive edits elsewhere; orphaned threads stay listed as "text changed"), painted as accessible `<mark>` elements (keyboard + screen-reader reachable), excluded from print, and stored in versioned `localStorage` (`icjia-studio-annotations-v1:*`) behind an `AnnotationStore` seam — zero network calls, demo posture unchanged. The article markdown is never modified. Phase 2 (Strapi 5 persistence) ships as a drop-in content type under `deploy/strapi/review-annotation/` with an install guide.
```

Run: `npm test && npm run typecheck`
Expected: full suite green (514 pre-existing + ~35 new), typecheck 0 errors.

```bash
git add deploy/strapi/review-annotation tests/unit/annotations-strapi-schema.test.ts CHANGELOG.md
git commit -m "feat(annotations): Strapi 5 drop-in content type + schema-parity guard + changelog"
```

---

## Manual verification checklist (after Task 12)

Run `npm run dev`, log in as `admin`/`admin` (Editor), open any article → Preview:

1. Highlight → comment → thread appears in the rail; highlight painted in the chosen color.
2. Switch role to Author (log out / Enter as Author): reply works; delete hidden on the Editor's thread.
3. Resolve → highlight disappears under "Open" filter; "All" shows it muted.
4. Reload → annotations persist. Second tab → changes appear (storage event).
5. Print button → no highlights in the print preview.
6. Narrow window → rail becomes drawer.
7. Keyboard: Tab reaches a highlight, Enter opens its thread; composer traps focus, Esc closes.
8. `NUXT_PUBLIC_DEMO_MODE=true npm run generate` succeeds (demo build intact).
