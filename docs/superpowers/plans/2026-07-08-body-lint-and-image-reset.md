# Body markdown linter + empty body-images on new articles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an on-demand "Check" linter to the article-body editor (plain-language heading/image/link issues, click-to-jump), and make new articles start with an empty Body-images tray (authors add their own).

**Architecture:** A dependency-free pure `lintMarkdown(source)` function drives a "Check" toolbar button + results panel in `MarkdownEditor.vue` (full mode only). Separately, the `BodyImagesField` sample-figure seed moves from an `isDemoMode()` auto-seed to an explicit `seedSamples` prop set only by the `?sample=1` create path, plus a demo-build-only opt-in "Load sample figures" button.

**Tech Stack:** Nuxt 4 (SPA, `ssr: false`), Vue 3 `<script setup>`, CodeMirror 6, Nuxt UI (`UButton`/`UIcon`), Pinia, Vitest (+ `@nuxt/test-utils`), happy-dom.

## Global Constraints

- **No new dependencies** — pinned-deps posture; the linter is hand-written, no `markdownlint`/`@codemirror/lint`.
- **Node** `>=20` (repo runs 22.22.2).
- **Renderer untouched** — `app/lib/markdown.ts` (`html:false`) is not modified; the linter never renders.
- **Zero base64** — the image insert/upload path is unchanged.
- **Commit messages: NO AI co-author trailer** and no `Co-Authored-By` line (user global rule) — end the message at the description.
- **Tests:** unit files default to node env; Nuxt component files start with `// @vitest-environment nuxt`. Run all with `npm test`; run one file with `npx vitest run <path>`.
- **Lint UI is body-only** — gated on `!compact`, so the compact Abstract editor never shows it.

---

### Task 1: `lintMarkdown()` pure module

**Files:**
- Create: `app/lib/editor/markdown-lint.ts`
- Test: `tests/unit/markdown-lint.test.ts`

**Interfaces:**
- Consumes: nothing (pure, no imports).
- Produces: `lintMarkdown(source: string): LintIssue[]`; types `LintIssue`, `LintRuleId`, `LintSeverity`. `LintIssue = { line: number; column?: number; severity: 'warn' | 'info'; rule: LintRuleId; message: string }`. Task 2 imports these.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/markdown-lint.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { lintMarkdown } from '~/lib/editor/markdown-lint'
import { renderAllSampleBodies } from '~/lib/sample-article'

describe('lintMarkdown', () => {
  it('returns [] for a clean body (H2 start, alt text, real link text)', () => {
    const src = '## Overview\n\ntext with an ![a chart](/x.png) and a [real link](https://example.com).\n'
    expect(lintMarkdown(src)).toEqual([])
  })

  it('flags a "#" H1 in the body (reserved for the page title)', () => {
    const issues = lintMarkdown('# Title in body\n')
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({ line: 1, rule: 'body-heading-level', severity: 'warn' })
  })

  it('flags a skipped heading level (## -> ####)', () => {
    const issues = lintMarkdown('## Section\n\n#### Too deep\n')
    expect(issues.map((i) => i.rule)).toContain('heading-increment')
    const jump = issues.find((i) => i.rule === 'heading-increment')!
    expect(jump.line).toBe(3)
  })

  it('flags an empty heading', () => {
    const issues = lintMarkdown('##\n')
    expect(issues.some((i) => i.rule === 'empty-heading' && i.line === 1)).toBe(true)
  })

  it('flags an image with missing alt text', () => {
    const issues = lintMarkdown('Some text ![](/chart.png) here.\n')
    const alt = issues.find((i) => i.rule === 'image-alt-missing')!
    expect(alt).toMatchObject({ line: 1, severity: 'warn' })
    expect(alt.column).toBeGreaterThan(0)
  })

  it('flags a link with empty visible text (but not an image or a footnote ref)', () => {
    const issues = lintMarkdown('A [](https://example.com) link, a ![alt](/i.png), a ref[^1].\n')
    const empties = issues.filter((i) => i.rule === 'empty-link-text')
    expect(empties).toHaveLength(1)
    expect(empties[0]!.line).toBe(1)
  })

  it('ignores headings and images inside a fenced code block', () => {
    const src = '## Real\n\n```md\n# not a heading\n![](not-flagged.png)\n```\n'
    expect(lintMarkdown(src)).toEqual([])
  })

  it('sorts issues by line then column', () => {
    const src = '#### Deep first\n\n# H1 later\n'
    const issues = lintMarkdown(src)
    expect(issues[0]!.line).toBeLessThanOrEqual(issues[issues.length - 1]!.line)
  })

  it('does not throw on the real sample bodies and returns an array', () => {
    for (const body of renderAllSampleBodies()) {
      expect(Array.isArray(lintMarkdown(body))).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/markdown-lint.test.ts`
Expected: FAIL — cannot resolve `~/lib/editor/markdown-lint` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `app/lib/editor/markdown-lint.ts`:

```ts
// A small, dependency-free Markdown linter for the article BODY. It is intentionally NOT a full
// markdownlint: the rules are curated for how Hub articles publish (the page title is the H1, the
// public TOC is built from ##, alt text carries the a11y posture) and every message is written for
// non-technical authors. Pure + line-based so it unit-tests trivially and needs no renderer/AST.
export type LintSeverity = 'warn' | 'info'

export type LintRuleId =
  | 'body-heading-level' // a '#' (H1) used in the body — reserved for the page title
  | 'heading-increment' // heading level jumps more than one deeper (## -> ####)
  | 'empty-heading' // a heading line with no text
  | 'image-alt-missing' // ![](url) with empty alt text
  | 'empty-link-text' // [](url) with no visible text

export interface LintIssue {
  line: number // 1-based source line
  column?: number // 1-based column, for image/link matches
  severity: LintSeverity
  rule: LintRuleId
  message: string // plain-language, author-facing
}

const FENCE_RE = /^\s*(?:```|~~~)/
// ATX heading: 1–6 hashes, optional text, optional trailing closing hashes. (Setext ===/--- not handled.)
const HEADING_RE = /^(#{1,6})(?:[ \t]+(.*?))?[ \t]*#*[ \t]*$/
const IMAGE_RE = /!\[([^\]]*)\]\([^)]*\)/g
// Inline link NOT preceded by '!': capture the leading char so images are excluded.
const LINK_RE = /(^|[^!])\[([^\]]*)\]\([^)]*\)/g

/** Lint a Markdown body. Returns issues sorted by (line, column). Fenced code blocks are skipped. */
export function lintMarkdown(source: string): LintIssue[] {
  const issues: LintIssue[] = []
  const lines = (source ?? '').split('\n')
  let inFence = false
  let prevHeadingLevel = 1 // the published page title is the implicit H1

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]!
    const lineNo = i + 1

    if (FENCE_RE.test(raw)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const heading = raw.match(HEADING_RE)
    if (heading) {
      const level = heading[1]!.length
      const text = (heading[2] ?? '').trim()
      if (!text) {
        issues.push({ line: lineNo, severity: 'info', rule: 'empty-heading', message: 'This heading has no text.' })
      }
      if (level === 1) {
        issues.push({
          line: lineNo,
          severity: 'warn',
          rule: 'body-heading-level',
          message: '“#” is the article title — start your sections at “##”.',
        })
      } else if (level > prevHeadingLevel + 1) {
        const need = '#'.repeat(prevHeadingLevel + 1)
        issues.push({
          line: lineNo,
          severity: 'warn',
          rule: 'heading-increment',
          message: `Heading jumps from H${prevHeadingLevel} to H${level} — add the missing “${need}” level.`,
        })
      }
      prevHeadingLevel = level
      continue // a heading line carries no images/links to check
    }

    IMAGE_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = IMAGE_RE.exec(raw)) !== null) {
      if (!m[1]!.trim()) {
        issues.push({
          line: lineNo,
          column: m.index + 1,
          severity: 'warn',
          rule: 'image-alt-missing',
          message: 'Image is missing alt text (needed for screen readers).',
        })
      }
    }

    LINK_RE.lastIndex = 0
    while ((m = LINK_RE.exec(raw)) !== null) {
      const prefix = m[1] ?? ''
      if (!(m[2] ?? '').trim()) {
        issues.push({
          line: lineNo,
          column: m.index + prefix.length + 1,
          severity: 'info',
          rule: 'empty-link-text',
          message: 'This link has no visible text.',
        })
      }
    }
  }

  return issues.sort((a, b) => a.line - b.line || (a.column ?? 0) - (b.column ?? 0))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/markdown-lint.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/editor/markdown-lint.ts tests/unit/markdown-lint.test.ts
git commit -m "feat(editor): pure lintMarkdown() for body headings/images/links"
```

---

### Task 2: "Check" button + results panel in `MarkdownEditor.vue`

**Files:**
- Modify: `app/components/MarkdownEditor.vue`
- Test: `tests/nuxt/markdown-editor.test.ts` (extend)

**Interfaces:**
- Consumes: `lintMarkdown`, `LintIssue` from Task 1.
- Produces: exposed test seams `__issues` (computed `LintIssue[]`) and `__goToLine(line: number)`; DOM hooks `data-test="lint-toggle"`, `data-test="lint-panel"`, `data-test="lint-empty"`, `data-test="lint-issue-<idx>"`.

**Note:** issues are a plain `computed(() => lintMarkdown(props.modelValue))` — the scan is O(n) and cheap, so no debounce is needed (a deliberate simplification of the spec's "debounced" note). It reads the prop, so the badge/panel work in tests without a live CodeMirror mount.

- [ ] **Step 1: Write the failing test** — append these cases inside the existing `describe('MarkdownEditor ...')` block in `tests/nuxt/markdown-editor.test.ts`:

```ts
  it('full mode: the Check button shows the current issue count', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# H1 in body\n\n#### Deep', label: 'Body' } })
    const btn = wrapper.find('[data-test="lint-toggle"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('2') // body-heading-level (L1) + heading-increment (L3)
  })

  it('opening the Check panel lists one row per issue', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# H1 in body\n\n#### Deep', label: 'Body' } })
    expect(wrapper.find('[data-test="lint-panel"]').exists()).toBe(false)
    await wrapper.find('[data-test="lint-toggle"]').trigger('click')
    expect(wrapper.find('[data-test="lint-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="lint-issue-0"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="lint-issue-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="lint-panel"]').text()).toContain('Line 1')
  })

  it('a clean body shows the empty state in the panel', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '## Fine\n\ntext', label: 'Body' } })
    await wrapper.find('[data-test="lint-toggle"]').trigger('click')
    expect(wrapper.find('[data-test="lint-empty"]').exists()).toBe(true)
  })

  it('compact mode (Abstract) shows no Check button', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# whatever', label: 'Abstract', compact: true } })
    expect(wrapper.find('[data-test="lint-toggle"]').exists()).toBe(false)
  })

  it('exposes __goToLine and __issues seams', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# x', label: 'Body' } })
    expect(typeof wrapper.vm.$.exposed!.__goToLine).toBe('function')
    expect(Array.isArray(wrapper.vm.$.exposed!.__issues.value)).toBe(true)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/markdown-editor.test.ts`
Expected: FAIL — no `[data-test="lint-toggle"]` element / `__goToLine` undefined.

- [ ] **Step 3a: Add imports.** In `app/components/MarkdownEditor.vue`, change the `#imports` line to add `computed`, and add the linter import below the existing `image-insert` import.

Change:
```ts
import { ref, watch, onMounted, onBeforeUnmount, useId } from '#imports'
```
to:
```ts
import { ref, computed, watch, onMounted, onBeforeUnmount, useId } from '#imports'
```
Add after `import { ALLOWED_IMAGE_EXTENSIONS, hasAllowedImageExtension } from '~/lib/image-types'`:
```ts
import { lintMarkdown, type LintIssue } from '~/lib/editor/markdown-lint'
```

- [ ] **Step 3b: Add lint state + jump handler.** Immediately after the `const showPreview = ref(false)` line, add:

```ts
// Body linter (full mode only): a cheap O(n) scan over the current source. Reads the prop so the
// badge/panel stay correct even where CodeMirror can't fully mount (tests).
const showIssues = ref(false)
const issues = computed<LintIssue[]>(() => lintMarkdown(props.modelValue))

/** Scroll to + select a 1-based source line in the editor (no-op until CM has mounted). */
function goToLine(line: number) {
  if (!view) return
  const clamped = Math.max(1, Math.min(line, view.state.doc.lines))
  const l = view.state.doc.line(clamped)
  view.dispatch({ selection: EditorSelection.range(l.from, l.to), scrollIntoView: true })
  view.focus()
}
```

- [ ] **Step 3c: Expose the seams.** In the `defineExpose({ ... })` block, add `__issues` and `__goToLine` alongside the existing entries:

```ts
defineExpose({
  insertMarkdown,
  __emitChange: emitChange,
  __handleFiles: handleFiles,
  __insertMarkdown: insertMarkdown,
  __uploadError: uploadError,
  __issues: issues,
  __goToLine: goToLine,
})
```

- [ ] **Step 3d: Add the Check button.** In the template, replace the single Preview `UButton` (the block starting `<UButton` with `data-test="preview-toggle"`) with a wrapper holding Check + Preview:

```html
      <div class="flex items-center gap-2">
        <UButton
          v-if="!compact"
          size="xs"
          :variant="showIssues ? 'solid' : 'outline'"
          :color="issues.length ? 'warning' : 'neutral'"
          icon="i-lucide-list-checks"
          :label="issues.length ? `Check · ${issues.length}` : 'Check'"
          :aria-pressed="showIssues"
          data-test="lint-toggle"
          @click="showIssues = !showIssues"
        />
        <UButton
          size="xs"
          :variant="showPreview ? 'solid' : 'outline'"
          :icon="showPreview ? 'i-lucide-eye-off' : 'i-lucide-eye'"
          :label="showPreview ? 'Hide preview' : 'Preview'"
          :aria-pressed="showPreview"
          data-test="preview-toggle"
          @click="showPreview = !showPreview"
        />
      </div>
```

- [ ] **Step 3e: Add the results panel.** Directly AFTER the closing `</div>` of the `<div class="grid gap-3" ...>` block (the editor+preview grid) and BEFORE the closing `</div>` of `.markdown-editor`, insert:

```html
    <!-- Body linter results: on-demand, plain-language, click a row to jump to the line. -->
    <div
      v-if="showIssues && !compact"
      role="region"
      aria-label="Markdown issues"
      data-test="lint-panel"
      class="mt-3 rounded border border-default"
    >
      <p v-if="issues.length === 0" class="p-3 text-sm text-muted" data-test="lint-empty">
        No issues found.
      </p>
      <ul v-else class="divide-y divide-default">
        <li v-for="(issue, idx) in issues" :key="idx">
          <button
            type="button"
            class="flex w-full items-start gap-2 p-2 text-left text-sm hover:bg-elevated/50"
            :data-test="`lint-issue-${idx}`"
            @click="goToLine(issue.line)"
          >
            <UIcon
              :name="issue.severity === 'warn' ? 'i-lucide-triangle-alert' : 'i-lucide-info'"
              :class="issue.severity === 'warn' ? 'text-warning' : 'text-muted'"
              class="mt-0.5 size-4 shrink-0"
            />
            <span class="shrink-0 font-medium text-muted tabular-nums">Line {{ issue.line }}</span>
            <span class="text-highlighted">{{ issue.message }}</span>
          </button>
        </li>
      </ul>
    </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/markdown-editor.test.ts`
Expected: PASS (existing cases + 5 new).

- [ ] **Step 5: Commit**

```bash
git add app/components/MarkdownEditor.vue tests/nuxt/markdown-editor.test.ts
git commit -m "feat(editor): Check button + results panel for the body linter"
```

---

### Task 3: Empty tray by default in `BodyImagesField.vue` (+ demo opt-in seed)

**Files:**
- Modify: `app/components/forms/BodyImagesField.vue`
- Test: `tests/nuxt/body-images-field.test.ts` (extend) and `tests/nuxt/body-images-field-demo.test.ts` (create)

**Interfaces:**
- Consumes: existing `sampleFigureRef`, `isDemoMode`, `addToTray`.
- Produces: prop `seedSamples?: boolean` (default `false`); exposed seam `__loadSampleFigures()`; DOM hook `data-test="load-sample-figures"`. Task 4 sets `seedSamples`.

- [ ] **Step 1: Write the failing tests.**

(a) Append to the existing `describe` in `tests/nuxt/body-images-field.test.ts`:

```ts
  it('does NOT pre-seed the tray by default (blank new article)', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    expect((wrapper.vm.$.exposed!.__trayImages.value as unknown[]).length).toBe(0)
  })

  it('seeds 8 sample figures when the seedSamples prop is set (the ?sample=1 path)', async () => {
    const wrapper = await mountSuspended(BodyImagesField, { props: { seedSamples: true } })
    expect((wrapper.vm.$.exposed!.__trayImages.value as unknown[]).length).toBe(8)
  })

  it('__loadSampleFigures() seeds 8 and is idempotent (no duplicates)', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    wrapper.vm.$.exposed!.__loadSampleFigures()
    wrapper.vm.$.exposed!.__loadSampleFigures()
    expect((wrapper.vm.$.exposed!.__trayImages.value as unknown[]).length).toBe(8)
  })
```

(b) Create `tests/nuxt/body-images-field-demo.test.ts` (demo build forced on via a partial mock of `~/lib/demo`):

```ts
// tests/nuxt/body-images-field-demo.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

// Force the demo build so the opt-in "Load sample figures" button renders. Partial mock keeps the
// other demo exports real.
vi.mock('~/lib/demo', async (orig) => {
  const actual = await orig<typeof import('~/lib/demo')>()
  return { ...actual, isDemoMode: () => true }
})
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import BodyImagesField from '~/components/forms/BodyImagesField.vue'

describe('BodyImagesField (demo build)', () => {
  it('starts empty and offers an opt-in "Load sample figures" button', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    expect((wrapper.vm.$.exposed!.__trayImages.value as unknown[]).length).toBe(0)
    expect(wrapper.find('[data-test="load-sample-figures"]').exists()).toBe(true)
  })

  it('clicking "Load sample figures" fills the tray and hides the button', async () => {
    const wrapper = await mountSuspended(BodyImagesField)
    await wrapper.find('[data-test="load-sample-figures"]').trigger('click')
    expect((wrapper.vm.$.exposed!.__trayImages.value as unknown[]).length).toBe(8)
    expect(wrapper.find('[data-test="load-sample-figures"]').exists()).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/nuxt/body-images-field.test.ts tests/nuxt/body-images-field-demo.test.ts`
Expected: FAIL — `seedSamples` unknown / `__loadSampleFigures` undefined / no `load-sample-figures` button; the demo test's default mount currently seeds 8 (old `isDemoMode` auto-seed), so `length` is 8 not 0.

- [ ] **Step 3a: Imports + demo flag.** In `app/components/forms/BodyImagesField.vue`, change the `#imports` line to add `computed`:

```ts
import { ref, computed, onMounted } from '#imports'
```
Add a props declaration just above the existing `const emit = defineEmits<{ insert: [markdown: string] }>()` line:
```ts
// `seedSamples` (set by the ?sample=1 create path) pre-fills the tray with bundled sample figures.
const props = defineProps<{ seedSamples?: boolean }>()
```
Add, just below `let trayIdSeq = 0`:
```ts
// The demo build blocks uploads, so it offers an opt-in button to populate the tray on demand.
// Build-time flag — read once.
const demoBuild = isDemoMode()
const showLoadSamples = computed(() => demoBuild && trayImages.value.length === 0)
```

- [ ] **Step 3b: Replace the mount seed with a reusable loader.** Replace the entire existing `onMounted(() => { ... })` block (the one that seeds `if (isDemoMode() && trayImages.value.length === 0)`) with:

```ts
/** Fill the tray with the 8 bundled sample figures (display-only refs). No-op if already populated. */
function loadSampleFigures() {
  if (trayImages.value.length > 0) return
  for (let n = 0; n < 8; n++) {
    const ref = sampleFigureRef(n)
    addToTray(ref, ref.name ?? `figure-${n}.svg`)
  }
}

onMounted(() => {
  // Seed ONLY on the explicit sample-create path — a blank new article starts empty (authors add
  // their own). Non-sample articles (including the demo build) show an empty tray by default.
  if (props.seedSamples) loadSampleFigures()
})
```

- [ ] **Step 3c: Add the demo button to the template.** Inside the `<div class="flex flex-wrap items-center gap-2" @dragover.prevent @drop="onDrop">` row, add after the `<span ...>or drag &amp; drop here</span>` line:

```html
        <UButton
          v-if="showLoadSamples"
          size="xs" variant="outline" color="warning" icon="i-lucide-flask-conical"
          data-test="load-sample-figures"
          @click="loadSampleFigures"
        >
          Load sample figures
        </UButton>
```

- [ ] **Step 3d: Expose the loader seam.** In the `defineExpose({ ... })` block add:
```ts
  __loadSampleFigures: loadSampleFigures,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/nuxt/body-images-field.test.ts tests/nuxt/body-images-field-demo.test.ts`
Expected: PASS. (The pre-existing `body-images-field.test.ts` empty-state case stays green.)

- [ ] **Step 5: Commit**

```bash
git add app/components/forms/BodyImagesField.vue tests/nuxt/body-images-field.test.ts tests/nuxt/body-images-field-demo.test.ts
git commit -m "feat(editor): empty body-images tray by default; opt-in demo seed"
```

---

### Task 4: Thread `seedSampleImages` through `ArticleForm` + the create page

**Files:**
- Modify: `app/components/forms/ArticleForm.vue`
- Modify: `app/pages/create/[type].vue`
- Test: `tests/nuxt/article-form.test.ts` (extend)

**Interfaces:**
- Consumes: `BodyImagesField`'s `seedSamples` prop (Task 3).
- Produces: `ArticleForm` prop `seedSampleImages?: boolean` (default `false`).

- [ ] **Step 1: Write the failing test** — append to the first `describe('ArticleForm ...')` block in `tests/nuxt/article-form.test.ts`:

```ts
  it('leaves the Body images tray empty on a blank new article', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create' } })
    expect(wrapper.find('[data-test="body-images-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="body-images-tray"]').exists()).toBe(false)
  })

  it('seeds the Body images tray when seedSampleImages is set (the ?sample=1 path)', async () => {
    const wrapper = await mountSuspended(ArticleForm, { props: { mode: 'create', seedSampleImages: true } })
    expect(wrapper.find('[data-test="body-images-tray"]').exists()).toBe(true)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/article-form.test.ts`
Expected: FAIL — with `seedSampleImages`, the tray still renders empty (prop not wired), so `body-images-tray` does not exist.

- [ ] **Step 3a: Add the prop to `ArticleForm.vue`.** Change:
```ts
const props = defineProps<{ mode: 'create' | 'edit'; initial?: Article }>()
```
to:
```ts
const props = defineProps<{ mode: 'create' | 'edit'; initial?: Article; seedSampleImages?: boolean }>()
```

- [ ] **Step 3b: Pass it to `BodyImagesField`.** Change:
```html
          <BodyImagesField @insert="bodyField?.insertMarkdown($event)" />
```
to:
```html
          <BodyImagesField :seed-samples="seedSampleImages" @insert="bodyField?.insertMarkdown($event)" />
```

- [ ] **Step 3c: Wire the create page.** In `app/pages/create/[type].vue`, change:
```html
    <ArticleForm v-if="type === 'article'" mode="create" :initial="sampleArticle" />
```
to:
```html
    <ArticleForm v-if="type === 'article'" mode="create" :initial="sampleArticle" :seed-sample-images="isSample" />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/article-form.test.ts`
Expected: PASS (existing cases + 2 new).

- [ ] **Step 5: Manually verify the create-page wiring in the running dev server**

With the dev server up (`http://localhost:3000`, dev sign-in):
- Home → **New article** → the "Body images" panel reads **"No images yet."** (empty).
- Home → **Add sample article** → the "Body images" panel is **pre-filled with sample figures**.
Expected: both behaviors as described.

- [ ] **Step 6: Commit**

```bash
git add app/components/forms/ArticleForm.vue app/pages/create/[type].vue tests/nuxt/article-form.test.ts
git commit -m "feat(editor): wire ?sample=1 to seed the Body images tray; blank articles empty"
```

---

### Task 5: Full suite + docs (CHANGELOG, README note)

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `README.md` (editor section note)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — all pre-existing tests plus the new lint/body-images cases green. If any pre-existing test referenced the old demo auto-seed, reconcile it against Task 3 (there are none expected; the only body-images seeding test is the new one).

- [ ] **Step 2: Run the typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Add the CHANGELOG entry.** In `CHANGELOG.md`, under `## [Unreleased]`, add a new dated section ABOVE the `### 2026-07-05` section:

```markdown
### 2026-07-08

_Added_

- **Body Markdown linter — an on-demand “Check” in the article-body editor.** A toolbar **Check** button (with a live issue-count badge) opens a plain-language results panel; clicking a row jumps to that line. Rules are curated for how Hub articles publish: a `#` H1 in the body (reserved for the page title), skipped heading levels (`##` → `####`), empty headings, images missing alt text (the a11y posture), and empty link text. Dependency-free pure `lib/editor/markdown-lint.ts`; fenced code blocks are skipped. Body-only (the compact Abstract editor is unaffected).
- **New articles start with an empty Body-images tray.** The sidebar “Body images” panel no longer pre-loads sample figures on every article — a blank new article shows “No images yet”, and authors add (and keep adding) their own. The bundled sample figures now seed only on the dev **Add sample article** path; the deployed demo offers an opt-in **Load sample figures** button so presenters can still demonstrate figure insertion.
```

- [ ] **Step 4: Add a short README note.** In `README.md`, in the "Content authoring & the editor" section, add a sentence noting the **Check** button (body linting: headings, image alt text, links) and that the Body-images tray starts empty on new articles (authors add their own). Match the surrounding prose style.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md README.md
git commit -m "docs(changelog+readme): body linter and empty body-images default"
```

---

## Self-Review

**Spec coverage:**
- Feature 1 pure module (spec §3.1) → Task 1. ✓
- Feature 1 UI: Check button + badge + panel + click-to-jump, full-mode only (spec §3.2) → Task 2. ✓
- Feature 2 `seedSamples` prop + `loadSampleFigures()` + demo button (spec §4.1) → Task 3. ✓
- Feature 2 `ArticleForm` + create-page wiring (spec §4.2–4.3) → Task 4. ✓
- Behavior table (spec §4.4): blank→empty, sample→seeded, demo→opt-in button, edit→empty → covered by Tasks 3–4 tests + Task 4 manual step. ✓
- Testing (spec §5): unit `markdown-lint` + editor + body-images extensions → Tasks 1–4. ✓
- Rollout (spec §6): CHANGELOG + README → Task 5. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; every command has an expected result. ✓

**Type consistency:** `LintIssue`/`lintMarkdown` names identical across Tasks 1–2; `seedSamples` (BodyImagesField, Task 3) vs `seedSampleImages` (ArticleForm/page, Task 4) — intentionally distinct props, connected by `:seed-samples="seedSampleImages"` in Task 4 Step 3b. `__trayImages`, `__loadSampleFigures`, `data-test="body-images-tray"`/`"body-images-empty"` match the existing component and Task 3. ✓
