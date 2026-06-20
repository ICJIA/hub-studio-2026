# ICJIA Editor Integration — Implementation Plan

> **Plan 4 of the ICJIA Studio build.** Follows the auth plan (Plan 1/2), the data-layer plan, the media plan (zero-base64, Plan 3), and the screens/forms/preview plan (Plan 5). It replaces the deliberately-basic `MarkdownField` (a `<textarea>` + live `MarkdownPreview`) with the **ICJIA Markdown Editor 2026** writing surface (CodeMirror 6), and **authors the image pipeline** (paste / drop / toolbar → `useUpload` → hosted `![alt](url "caption")`) that the upstream editor does not have. It **wires** the already-built media layer and **keeps our renderer** — it does not recreate either.

> **Draft 1 — first iteration.** Part of an exploratory first pass; expect the approach to evolve as the build surfaces requirements (the data layer itself was revised mid-build from REST → Content-Manager API; the upstream editor was re-verified against its cloned source `ICJIA/icjia-markdown-editor-2026` v1.6.1 on 2026-06-20). The vendored CodeMirror pieces are copied against the upstream source exactly as it exists today.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

---

## 📋 For managers — what is this, and is it legit?

**What this document is.** The construction recipe for swapping the Studio's plain "type Markdown in a box" field for the **real ICJIA Markdown Editor** — a proper code-style writing surface with line numbers, syntax highlighting, and keyboard shortcuts (bold, italic, headings, links) — and for **building the missing piece**: dropping or pasting a picture straight into the body and having it upload correctly.

**Why this matters.** Authors write articles in Markdown. The previous plan gave them a usable-but-spartan box; this plan gives them the same editor the public-facing ICJIA editor project already ships, so the writing experience is first-class. Just as important: the upstream editor has **no image handling at all**. We add it ourselves, and we add it *the right way* — a pasted or dropped image is uploaded once to the shared media library and referenced by link, exactly like everywhere else in the Studio.

**The one rule we keep guaranteeing.** **No image is ever stored as a giant blob of text ("base64").** When an author pastes a screenshot or drags a photo into the editor, it goes through the same upload pipe the rest of the app uses — which refuses base64 and produces a real hosted link. This plan locks that with tests: the image-insert logic, given a file, *cannot* produce a `data:` blob.

**Is this borrowing someone else's code, legally?** Yes, and cleanly. The upstream editor is **open-source under the MIT license**. It is built as a standalone application, not a shareable package, so we **copy** the specific editor pieces we need into our codebase and **keep the original copyright credit** in those files (a short header naming the source). The technologies match ours exactly, so the parts fit together without friction.

**Is it real, or jargon?** Real, and routine:
- Every small step **writes a test first, then the code** (Test-Driven Development).
- Every step ends in a **save point** (a commit) — traceable and reversible.
- The hard logic (turning a dropped file into a correct, base64-free image link) lives in a **plain, separately-tested function**, so the editor screen stays thin and the rule stays provable even though the editor itself is hard to test directly.

**What you get when this plan is done.** A real Markdown editor in every place an author writes a body, with drag/paste/insert image support that always uploads (never base64), our existing live preview untouched beside it, and accessibility kept (every inserted image gets alt-text). The three content forms **do not change** — the editor drops into the exact slot the previous plan left for it.

**Bottom line.** Legitimate, careful integration of an open-source (MIT) editor we vendor with attribution, plus an image pipeline we author so the project's headline "no base64 images" promise holds inside the editor too — written in detail so the rules are guaranteed by tests, not hope.

---

**Goal:** Replace `MarkdownField`'s internals with the **ICJIA Markdown Editor 2026** CodeMirror 6 writing surface while **preserving its `modelValue` / `update:modelValue` `v-model` seam** (so `ArticleForm`/`AppForm`/`DatasetForm` are untouched), and **author the image pipeline the upstream editor lacks**: (1) add the `@codemirror/*` deps and **vendor** (copy, with MIT-attribution headers) the upstream's framework-agnostic CodeMirror setup (`config.ts` `createEditorState`, `keymaps.ts`, `theme-dark.ts`, `theme-light.ts`) — de-singletoned into a thin `createStudioEditorState(opts)` wrapper; (2) a **pure, dependency-injected image-insert core** (`handleImageFiles(files, upload, insert)` + a `buildImageMarkdown` helper reusing `toMarkdown`) that uploads each file via the injected `useUpload().upload` and inserts `![alt](url "caption")` — **never** a `data:` URL; (3) a new per-instance `MarkdownEditor.vue` that mounts `EditorView` in `onMounted`, maps `modelValue ↔ doc` (initial + external updates) and `onChange → emit('update:modelValue')`, wires `EditorView.domEventHandlers({ paste, drop })` (and a small toolbar "insert image" affordance) to the Task-2 core + `useUpload`, and tears the view down in `onBeforeUnmount` — with `MarkdownPreview` (**our** renderer) kept beside it; (4) the **CSS/fonts/themes port** (JetBrains Mono via `@nuxt/fonts`; the vendored CM themes; `@lezer/highlight`) + wiring `MarkdownEditor` into the `MarkdownField` seam (confirming the three forms still bind it unchanged) + an integration check.

**Architecture:** Mirror the media/forms layers' **DI-pure-function + thin-component** rule. The CodeMirror setup is vendored framework-agnostic TypeScript (no Vue, no singleton). The only *new* logic — turning dropped/pasted `File`s into base64-free Markdown inserts — lives in a pure, node-testable function (`app/lib/editor/image-insert.ts`) taking an injected `upload` fn and an injected `insert` fn, so it is unit-tested with a fake `upload` (assert no `data:`, assert `upload` called, assert the inserted string) **without** a CodeMirror mount. The `MarkdownEditor.vue` shell that owns the DOM-heavy `EditorView` stays thin; its v-model adapter is component-tested where stable, with an explicit fallback (test the adapter logic via the extracted pure functions) for the case where `EditorView` will not mount under happy-dom.

**Tech Stack:** Nuxt 4 (SPA, `ssr: false`), Vue 3.5, Nuxt UI 4, Pinia 2.x, TypeScript, Vitest + `@nuxt/test-utils` (node + the `nuxt`/happy-dom runtime env), plus the new `@codemirror/*` set (+ `@lezer/highlight`) and JetBrains Mono served via the already-present `@nuxt/fonts`.

## Global Constraints

*Every task's requirements implicitly include this section. Values are copied from the design spec (`docs/superpowers/specs/2026-06-19-researchhub-studio-2026-design.md` §8 editor, §13 testing), from Plan 5's editor-seam note, and from the upstream editor's cloned source (`github.com/ICJIA/icjia-markdown-editor-2026`, v1.6.1, MIT) verified on 2026-06-20.*

- **Stack:** Nuxt 4 **SPA** (`ssr: false`), **Nuxt UI 4**, Pinia 2.x, **TypeScript**. Components live in `app/components/`; pure logic in `app/lib/`. **This plan adds NO new auth/guard/data logic.**
- **The seam this plan replaces (do NOT change its contract):** `app/components/MarkdownField.vue` is today a `<textarea>` + live `MarkdownPreview` with a `{ modelValue: string; label?: string }` props / `update:modelValue` emit contract — the deliberate Plan-4 seam. **The new editor honors this exact `v-model` contract** so the three content forms stay untouched. **Only `ArticleForm.vue` actually mounts `MarkdownField`** (`<MarkdownField v-model="model.markdown" label="Body (Markdown)" />`); App/Dataset use plain `TextField` for `description`. Verify by **NOT editing any of the three `app/components/forms/*Form.vue` files.**
- **KEEP OUR renderer (do NOT vendor theirs).** The live preview stays on **our** `app/lib/markdown.ts` `renderMarkdown` (markdown-it 14, `{ html: false }`) via `app/components/MarkdownPreview.vue`. The upstream renderer differs (it uses `@traptitech/markdown-it-katex` vs our `@vscode/markdown-it-katex`, NO multimd-table, plus mark/ins/strikethrough/task-list/anchor) — **do not import or vendor it.** The new CodeMirror editor is the **writing** surface; `MarkdownPreview` is the **preview** surface; they sit side by side. (True render parity is with the PUBLIC Research Hub renderer — spec §14 #6 — which is **still unresolved and out of scope here**; carried as an Open item.)
- **Integration model = VENDOR (copy).** The upstream editor is a **standalone Nuxt 4 app, NOT a consumable package** (`package.json` is `private: true`, no `main`/`module`/`exports`, unpublished to npm). So we **copy** its framework-agnostic CodeMirror files into `app/lib/editor/vendor/`. Each vendored file carries an **MIT-attribution header** crediting `ICJIA/icjia-markdown-editor-2026` (MIT). We do **NOT** copy their `useEditor.ts` — content there lives in a **module-level singleton** (`const content = ref('')` at module scope); a singleton cannot back per-instance form fields. Instead we wrap the framework-agnostic `createEditorState` in a NEW per-instance Vue component.
- **The upstream `createEditorState(doc, onChange, isDark?, onCursorLineChange?)` already exposes a clean `onChange: (value: string) => void`** (via `EditorView.updateListener.of`, firing `onChange(update.state.doc.toString())` on `docChanged`). We vendor it verbatim (header added) and add a thin `createStudioEditorState(opts)` wrapper exposing `{ doc, onChange, isDark? }` — de-singletoned, no `onCursorLineChange` needed for our use.
- **There is NO image upload / paste / drop / base64 anywhere in the upstream editor — we AUTHOR the entire pipeline.** A CodeMirror `EditorView.domEventHandlers({ paste, drop })` (plus a small toolbar "Insert image" affordance) extracts the `File`(s) from the event → runs each through `useUpload().upload(file)` (which **already** gates the extension allowlist via `hasAllowedImageExtension`, sanitizes SVG via `sanitizeSvgText`, and returns a hosted `MediaRef` with a real `url`, **never** base64) → inserts `![alt](url "caption")` at the cursor.
- **ZERO base64 / no `data:` URLs — the headline invariant, carried here.** Editor image inserts go through `useUpload` → hosted `url` only. **No editor path may yield a `data:` URL into the document or emitted state.** Asserted by the pure-core unit tests (a fake `upload`; assert the inserted string carries `/uploads/…`, never `data:`) and reusing the data layer's `containsBase64` as the oracle.
- **The alt-text decision (accessibility — LOCKED): provisional-alt-from-filename, cursor-in-the-brackets.** On paste/drop/toolbar-insert, the image inserts as `![<provisional-alt>](url "caption?")` where `<provisional-alt>` is the upload's returned `alternativeText` if present, else the file's basename (extension stripped, separators → spaces), and the editor selection is placed **inside the alt `[...]` brackets** so the author immediately refines it. *Justification (one line):* it keeps the drop-to-insert flow frictionless (no modal interrupting a paste) while guaranteeing a non-empty, human-meaningful alt is always present and immediately editable — and base64 stays structurally impossible regardless. This behavior is made **testable** at the pure-core level: `buildImageMarkdown(ref)` never yields empty `![]`, and `handleImageFiles` returns, per file, the inserted string **plus** the `{ from, to }` selection range covering the alt text.
- **Vendored files carry an MIT-attribution header (source: `ICJIA/icjia-markdown-editor-2026`, MIT).** New deps are limited to the `@codemirror/*` set the editor needs **+ `@lezer/highlight`** (imported directly by the vendored themes) **+ JetBrains Mono served by the already-present `@nuxt/fonts`**. Mirror the upstream `package.json` versions: `@codemirror/state ^6.5.4`, `@codemirror/view ^6.39.11`, `@codemirror/commands ^6.10.1`, `@codemirror/language ^6.12.1`, `@codemirror/lang-markdown ^6.5.0`, `@codemirror/language-data ^6.5.2`, `@codemirror/search ^6.6.0`, `@codemirror/autocomplete ^6.x` (transitive of `lang-markdown`; pin explicitly), `@lezer/highlight ^1.x`. **Do NOT add the `codemirror` meta-package** (we import the scoped modules the vendored `config.ts` actually uses) and **do NOT bump the pinned Pinia 2.x stack** or any existing dependency.
- **Fonts/themes/CSS port — verified facts.** The vendored themes (`theme-dark.ts`/`theme-light.ts`) **hardcode hex colors and reference NO CSS custom properties** (`var(--…)`) — so there are **no theme CSS variables to port**; the only CSS concern is the **font**. They hardcode `'JetBrains Mono', monospace`, i.e. the system-monospace fallback is already baked in. **Decision: serve JetBrains Mono via `@nuxt/fonts`** (already installed as a Nuxt UI dependency; verified present in `node_modules`) so the editor renders in its intended typeface, gracefully falling back to system monospace if the font fails to load. KaTeX CSS is already in our stack (Plan 5) and is irrelevant to the editor surface (preview only).
- **Client-only mount (SPA-safe).** CodeMirror's `EditorView` is DOM-dependent; our app is `ssr: false`, so this is fine, but `MarkdownEditor.vue` MUST instantiate the view in `onMounted` and destroy it in `onBeforeUnmount`. The component renders a mount-target `<div>` (CM owns its DOM) beside `MarkdownPreview`.
- **Testing reality (stated up front).** CodeMirror's `EditorView` is DOM-heavy and awkward under happy-dom. Keep the logic in **pure, node-testable functions** wherever possible — especially the image-pipeline core (`handleImageFiles` / `buildImageMarkdown`, unit-tested with a fake `upload`). The Vue shell is thin; test the v-model adapter at whatever level is stable. **Fallback (explicit):** if `EditorView` will not mount under happy-dom in `mountSuspended`, the component test degrades to (a) asserting the mount target + `MarkdownPreview` render and the `modelValue` reaches the preview, and (b) the adapter's create/onChange logic is proven via the extracted pure `createStudioEditorState` + the `image-insert` core — and the plan **says so** rather than pretending a full editor test passed.
- **Process:** TDD (red → green → refactor), frequent commits, pristine test output. Commit messages carry **NO AI co-author trailer** (per project CLAUDE.md). Run `npx vitest run && npm run typecheck` green before the final commit.

## Explicitly deferred (noted here; NOT built in this plan)

- **Public-renderer plugin parity** (spec §14 #6) — confirm the PUBLIC Research Hub's markdown-it plugin list and reconcile `renderMarkdown`. Separate from this plan; the editor is the writing surface, our `renderMarkdown` stays the preview.
- **The upstream editor's app-level chrome** — its toolbar buttons (table builder, export/download, copy-HTML), modals, tour, autosave, scroll-sync, and `useEditor`/`useMarkdown`/`useKeyboardShortcuts` composables. We vendor ONLY the framework-agnostic CodeMirror setup; the rest is theirs and out of scope. (Their `markdownKeymap` formatting shortcuts come free with the vendored `config.ts`; their `appShortcuts` table is NOT wired.)
- **`images` JSON ↔ inline-markdown sync** (spec §7.3 / §14 #11) — on figure insert, also appending `{ title, src: url }` to the article `images` array. Carried with the article form work; this plan inserts into the Markdown body only.
- **Per-field media constraints** (accepted types / max sizes per field, spec §7.2 / §14 #9) — `useUpload` already enforces the global image allowlist; per-field tightening is a follow-on.
- **Rich at-cursor toolbar parity** — beyond the small "Insert image" affordance and the vendored keymap, no additional toolbar UI is built here.

## File structure

```
app/
├── lib/
│   └── editor/
│       ├── vendor/                     # COPIED from ICJIA/icjia-markdown-editor-2026 (MIT) — headers added
│       │   ├── config.ts               # createEditorState(doc,onChange,isDark?,onCursorLineChange?) (verbatim + header)
│       │   ├── keymaps.ts              # markdownKeymap (Mod-b/i/headings/link/…) (verbatim + header)
│       │   ├── theme-dark.ts           # darkTheme (+ icjiaDarkTheme/HighlightStyle) (verbatim + header)
│       │   └── theme-light.ts          # lightTheme (+ icjiaLightTheme/HighlightStyle) (verbatim + header)
│       ├── studio-editor-state.ts      # OUR thin de-singletoned wrapper: createStudioEditorState(opts) → EditorState
│       └── image-insert.ts             # OUR pure DI core: buildImageMarkdown(ref) + handleImageFiles(files, upload, insert)
└── components/
    ├── MarkdownEditor.vue              # NEW per-instance CM6 shell: v-model adapter + paste/drop/toolbar image pipeline + MarkdownPreview
    └── MarkdownField.vue               # the seam — re-pointed to MarkdownEditor (same { modelValue / update:modelValue } contract)

tests/
├── unit/
│   ├── editor-studio-state.test.ts     # createStudioEditorState builds an EditorState with the given doc; onChange wired
│   └── editor-image-insert.test.ts     # buildImageMarkdown + handleImageFiles: uploads each, inserts ![alt](url "cap"), NEVER data:, alt-selection range
└── nuxt/
    └── markdown-editor.test.ts         # mountSuspended; modelValue reaches the preview; (best-effort) EditorView mount + onChange→emit; fallback stated
```

*(Pure logic tests run in the default node env. `editor-studio-state.test.ts` declares `// @vitest-environment nuxt` because `EditorState.create` is DOM-light but the CM modules resolve most cleanly under the Nuxt env; `markdown-editor.test.ts` lives under `tests/nuxt/` and declares the nuxt env, alongside the existing `markdown-field.test.ts`.)*

---

### Task 1: Add the `@codemirror/*` deps + vendor the CodeMirror config/keymaps/themes (MIT headers) + a de-singletoned `createStudioEditorState`

**Files:**
- Create: `app/lib/editor/vendor/config.ts` (copied verbatim from upstream + MIT header)
- Create: `app/lib/editor/vendor/keymaps.ts` (copied verbatim + MIT header)
- Create: `app/lib/editor/vendor/theme-dark.ts` (copied verbatim + MIT header)
- Create: `app/lib/editor/vendor/theme-light.ts` (copied verbatim + MIT header)
- Create: `app/lib/editor/studio-editor-state.ts` (OUR thin wrapper)
- Test: `tests/unit/editor-studio-state.test.ts`
- Dependencies: add the `@codemirror/*` set + `@lezer/highlight` (versions mirrored from the upstream `package.json`)

**Interfaces:**
- Consumes: `@codemirror/{state,view,commands,language,lang-markdown,language-data,search,autocomplete}`, `@lezer/highlight`.
- Produces (vendored, unchanged behavior):
  - `createEditorState(doc, onChange, isDark?, onCursorLineChange?): EditorState` and the helpers `getTheme`, `updateTheme`, `toggleLineNumbers`, `setReadOnly`, plus the `themeCompartment`/`lineNumbersCompartment`/`readOnlyCompartment` exports — from `vendor/config.ts`.
  - `markdownKeymap: KeyBinding[]` (the `Mod-b`/`Mod-i`/`Mod-1..6`/`Mod-k`/… formatting bindings) — from `vendor/keymaps.ts`.
  - `darkTheme` / `lightTheme` (Extension[]) — from `vendor/theme-dark.ts` / `vendor/theme-light.ts`.
- Produces (ours):
  - `interface StudioEditorOptions { doc: string; onChange: (value: string) => void; isDark?: boolean }`
  - `createStudioEditorState(opts: StudioEditorOptions): EditorState` — delegates to the vendored `createEditorState(opts.doc, opts.onChange, opts.isDark ?? true)`. The de-singletoned entry point our component uses; isolates the vendored API behind one seam so an upstream re-vendor is a one-import change.

> **Vendor faithfully, wrap thinly (Global Constraints):** the upstream `config.ts` already exposes a clean `onChange` callback and is framework-agnostic — so it is copied **verbatim** (only an MIT-attribution header is prepended). We do **not** copy `useEditor.ts` (module-level `content` singleton — incompatible with per-instance fields). `createStudioEditorState` is the only *new* code here and is trivial; the test proves the wrapper builds an `EditorState` whose document equals the supplied `doc` and whose `onChange` fires when the doc changes (driven through a throwaway `EditorView` in the nuxt env, or via the state's transaction API if the view won't mount — see the testing-reality note).

- [ ] **Step 1: Add the dependencies**

```bash
npm install @codemirror/state@^6.5.4 @codemirror/view@^6.39.11 @codemirror/commands@^6.10.1 \
  @codemirror/language@^6.12.1 @codemirror/lang-markdown@^6.5.0 @codemirror/language-data@^6.5.2 \
  @codemirror/search@^6.6.0 @codemirror/autocomplete@^6.18.0 @lezer/highlight@^1.2.0
```

Expected: the nine packages appear under `dependencies` in `package.json` (versions mirroring the upstream editor). **Do NOT install the `codemirror` meta-package**, and **do NOT touch the pinned Pinia 2.x stack** or any existing dependency. (`@codemirror/autocomplete` and `@lezer/highlight` ship transitively under `lang-markdown` / `language`, but the vendored files import them directly, so they are pinned explicitly.)

- [ ] **Step 2: Vendor the four upstream files verbatim (add the MIT-attribution header to each)**

Copy each file from the cloned upstream repo (`app/utils/editor/<name>.ts`) into `app/lib/editor/vendor/<name>.ts` **unchanged**, prepending exactly this header to each (do not alter the upstream code body — verbatim copy keeps the MIT terms clean):

```ts
/*
 * Vendored from ICJIA Markdown Editor 2026 (https://github.com/ICJIA/icjia-markdown-editor-2026), v1.6.1.
 * Copyright (c) Illinois Criminal Justice Information Authority (ICJIA). Licensed under the MIT License.
 * Copied unchanged into the ICJIA Studio (the upstream project is a standalone app, not an npm package).
 * Only this attribution header was added. Re-vendor from upstream rather than diverging this file.
 */
```

The four bodies (verbatim from upstream, header above each):

```ts
// app/lib/editor/vendor/config.ts  (header above, then the upstream body verbatim)
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection, rectangularSelection, crosshairCursor } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language'
import { darkTheme } from './theme-dark'
import { lightTheme } from './theme-light'
import { markdownKeymap } from './keymaps'

export const themeCompartment = new Compartment()
export const lineNumbersCompartment = new Compartment()
export const readOnlyCompartment = new Compartment()

export function getTheme(isDark: boolean) {
  return isDark ? darkTheme : lightTheme
}

export function createEditorState(
  doc: string,
  onChange: (value: string) => void,
  isDark: boolean = true,
  onCursorLineChange?: (line: number, immediate?: boolean) => void,
): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      history(),
      closeBrackets(),
      bracketMatching(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      indentOnInput(),
      drawSelection(),
      rectangularSelection(),
      crosshairCursor(),
      lineNumbersCompartment.of(lineNumbers()),
      foldGutter(),
      readOnlyCompartment.of(EditorState.readOnly.of(false)),
      markdown({ base: markdownLanguage, codeLanguages: languages }),
      themeCompartment.of(getTheme(isDark)),
      keymap.of([
        ...markdownKeymap,
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        indentWithTab,
      ]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString())
        }
        if (onCursorLineChange) {
          const line = update.state.doc.lineAt(update.state.selection.main.from).number
          const fromTyping = update.docChanged
          onCursorLineChange(line, fromTyping)
        }
      }),
      EditorView.contentAttributes.of({
        'aria-label': 'Markdown editor',
        'role': 'textbox',
        'aria-multiline': 'true',
      }),
    ],
  })
}

export function updateTheme(view: EditorView, isDark: boolean) {
  view.dispatch({ effects: themeCompartment.reconfigure(getTheme(isDark)) })
}

export function toggleLineNumbers(view: EditorView, show: boolean) {
  view.dispatch({ effects: lineNumbersCompartment.reconfigure(show ? lineNumbers() : []) })
}

export function setReadOnly(view: EditorView, readOnly: boolean) {
  view.dispatch({ effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)) })
}
```

> **`keymaps.ts` / `theme-dark.ts` / `theme-light.ts` are copied verbatim from the upstream sources with the same header prepended.** `keymaps.ts` exports `markdownKeymap: KeyBinding[]` (and an unused `appShortcuts` table — harmless, left as-is) and imports only `@codemirror/view` types. `theme-dark.ts`/`theme-light.ts` export `darkTheme`/`lightTheme` (+ `icjia{Dark,Light}Theme` / `icjia{Dark,Light}HighlightStyle`), import `EditorView`, `{ HighlightStyle, syntaxHighlighting }` from `@codemirror/language`, and `{ tags }` from `@lezer/highlight`, and **hardcode** `'JetBrains Mono', monospace` plus hex colors (no `var(--…)`). Do NOT re-key, re-color, or refactor them — verbatim keeps the MIT copy clean and an upstream re-vendor trivial.

- [ ] **Step 3: Write the failing test**

```ts
// tests/unit/editor-studio-state.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { EditorState } from '@codemirror/state'
import { createStudioEditorState } from '~/lib/editor/studio-editor-state'

describe('createStudioEditorState (de-singletoned vendor wrapper)', () => {
  it('builds an EditorState whose document equals the supplied doc', () => {
    const state = createStudioEditorState({ doc: '# Hello', onChange: () => {} })
    expect(state).toBeInstanceOf(EditorState)
    expect(state.doc.toString()).toBe('# Hello')
  })

  it('invokes onChange with the new document when the doc changes (via an EditorView)', async () => {
    const { EditorView } = await import('@codemirror/view')
    const onChange = vi.fn()
    const state = createStudioEditorState({ doc: '', onChange })
    const view = new EditorView({ state, parent: document.createElement('div') })
    try {
      view.dispatch({ changes: { from: 0, insert: '## Edited' } })
      expect(onChange).toHaveBeenCalled()
      expect(onChange.mock.calls.at(-1)![0]).toBe('## Edited')
    } finally {
      view.destroy()
    }
  })
})
```

*Note: the second case exercises the vendored `updateListener` through a real `EditorView`. If `EditorView` cannot construct under happy-dom (no layout APIs), replace it with a pure-state assertion — apply a transaction to the state (`state.update({ changes: { from: 0, insert: '## Edited' } }).state.doc.toString()`) and assert the document; document this substitution inline. The first case (doc round-trip) is DOM-free and always holds.*

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/unit/editor-studio-state.test.ts`
Expected: FAIL — `Cannot find module '~/lib/editor/studio-editor-state'` (and/or the vendored modules not present yet).

- [ ] **Step 5: Write the thin wrapper**

```ts
// app/lib/editor/studio-editor-state.ts
// OUR thin, de-singletoned entry point over the vendored ICJIA CodeMirror config (vendor/config.ts).
// The upstream editor keeps its document in a MODULE-LEVEL singleton (useEditor.ts: `const content =
// ref('')`), which cannot back per-instance form fields — so we do NOT copy that. The vendored
// createEditorState is already framework-agnostic and exposes a clean onChange callback; this wrapper
// adapts it to a small options object and is the ONE seam our MarkdownEditor component imports, so a
// future re-vendor of the upstream config is a single-import change here.
import type { EditorState } from '@codemirror/state'
import { createEditorState } from './vendor/config'

export interface StudioEditorOptions {
  /** Initial document text (the field's current modelValue). */
  doc: string
  /** Fired with the full document string whenever it changes (→ emit('update:modelValue')). */
  onChange: (value: string) => void
  /** Dark vs light CodeMirror theme. Defaults to true (matches the upstream default). */
  isDark?: boolean
}

/** Build a per-instance CodeMirror EditorState from the vendored ICJIA config (no singleton). */
export function createStudioEditorState(opts: StudioEditorOptions): EditorState {
  return createEditorState(opts.doc, opts.onChange, opts.isDark ?? true)
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/unit/editor-studio-state.test.ts`
Expected: PASS (2 tests). *If a vendored plugin's published types are missing under our `tsconfig`, prefer the upstream's own typing; only if truly absent add a one-line `declare module '@codemirror/...'` shim under `app/types/shims.d.ts` rather than `any`-casting — but the `@codemirror/*` packages ship their own types, so none should be needed.*

- [ ] **Step 7: Commit**

```bash
git add app/lib/editor/vendor app/lib/editor/studio-editor-state.ts tests/unit/editor-studio-state.test.ts package.json package-lock.json
git commit -m "feat(editor): vendor ICJIA CodeMirror config/keymaps/themes (MIT) + de-singletoned state wrapper"
```

---

### Task 2: The pure image-pipeline core — `buildImageMarkdown` + `handleImageFiles` (DI, zero-base64, provisional-alt)

**Files:**
- Create: `app/lib/editor/image-insert.ts`
- Test: `tests/unit/editor-image-insert.test.ts`

**Interfaces:**
- Consumes: `MediaRef` from `~/types/content`; `toMarkdown` from `~/components/image-markdown` (the already-tested `![alt](url "caption")` builder); a basename helper (local).
- Produces:
  - `function provisionalAltFromName(filename: string): string` — strips the directory + extension and turns separators (`_`, `-`, `.`) into spaces, collapsing whitespace, so `chart_q3-final.png` → `chart q3 final`. Used only when the upload returns no `alternativeText`.
  - `function buildImageMarkdown(ref: MediaRef, fallbackName?: string): { markdown: string; altStart: number; altEnd: number }` — returns the insert string **and** the character offsets (relative to the string start, i.e. just past the leading `![`) bounding the alt text, so a caller can place the selection inside the alt brackets. Alt = `ref.alternativeText` (trimmed, if non-empty) else `provisionalAltFromName(fallbackName ?? ref.name ?? 'image')` — **never empty**. The full string reuses `toMarkdown` semantics (caption → `"…"` title segment) but with the guaranteed-non-empty alt substituted in.
  - `interface InsertedImage { markdown: string; altStart: number; altEnd: number }`
  - `async function handleImageFiles(files: File[], upload: (file: File) => Promise<MediaRef>, insert: (img: InsertedImage) => void): Promise<void>` — for each `File`: `await upload(file)` → `buildImageMarkdown(ref, file.name)` → `insert(...)`. Pure logic + dependency injection: the `upload` fn (the component passes `useUpload().upload`) and the `insert` fn (the component passes a CodeMirror-dispatch closure) are **injected**, so the whole pipeline is unit-testable with fakes and **no DOM / no Nuxt mount**.

> **The headline invariant + the alt decision, in pure code (Global Constraints).** `upload` is the only path to a hosted file; because `MediaRef.url` from `useUpload` is always a Media Library URL, the inserted string structurally cannot contain `data:`. The test injects a **fake** `upload` returning a `url`-based `MediaRef` and asserts: (1) `upload` is called once per file; (2) the inserted `markdown` matches `![…](/uploads/…)` and **never** matches `/data:/` (cross-checked with the data layer's `containsBase64` oracle); (3) the **provisional alt** is non-empty (filename-derived when the ref has no `alternativeText`); (4) the returned `altStart`/`altEnd` bound exactly the alt substring, so the component can select it for immediate refinement. No production change touches `useUpload` — this core consumes it by injection.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/editor-image-insert.test.ts
import { describe, it, expect, vi } from 'vitest'
import { buildImageMarkdown, handleImageFiles, provisionalAltFromName, type InsertedImage } from '~/lib/editor/image-insert'
import { containsBase64 } from '~/lib/base64-guard'
import type { MediaRef } from '~/types/content'

const withAlt: MediaRef = {
  id: 7, url: '/uploads/chart_xyz.png', name: 'chart.png',
  alternativeText: 'Outcome chart', caption: 'Figure 2.', width: 640, height: 480, mime: 'image/png',
}
const noAlt: MediaRef = {
  id: 8, url: '/uploads/screenshot_abc.png', name: 'screenshot.png',
  alternativeText: null, caption: null, width: 100, height: 100, mime: 'image/png',
}

describe('provisionalAltFromName', () => {
  it('strips path + extension and turns separators into spaces', () => {
    expect(provisionalAltFromName('chart_q3-final.png')).toBe('chart q3 final')
    expect(provisionalAltFromName('/tmp/My.Photo.JPG')).toBe('My Photo')
  })
})

describe('buildImageMarkdown', () => {
  it('uses the ref alt + caption, and the alt offsets bound the alt text', () => {
    const { markdown, altStart, altEnd } = buildImageMarkdown(withAlt)
    expect(markdown).toBe('![Outcome chart](/uploads/chart_xyz.png "Figure 2.")')
    expect(markdown.slice(altStart, altEnd)).toBe('Outcome chart')
    expect(containsBase64(markdown)).toBe(false)
  })

  it('falls back to a filename-derived alt when the ref has none (never empty ![])', () => {
    const { markdown, altStart, altEnd } = buildImageMarkdown(noAlt, 'crime_q3.png')
    expect(markdown).toBe('![crime q3](/uploads/screenshot_abc.png)')
    expect(markdown.slice(altStart, altEnd)).toBe('crime q3')
    expect(markdown).not.toMatch(/!\[\]/)
  })
})

describe('handleImageFiles (DI core)', () => {
  it('uploads each file and inserts a url-based snippet — NEVER data:', async () => {
    const upload = vi.fn().mockResolvedValue(withAlt)
    const inserted: InsertedImage[] = []
    const insert = (img: InsertedImage) => inserted.push(img)

    const files = [new File(['x'], 'a.png', { type: 'image/png' }), new File(['y'], 'b.png', { type: 'image/png' })]
    await handleImageFiles(files, upload, insert)

    expect(upload).toHaveBeenCalledTimes(2)
    expect(upload).toHaveBeenNthCalledWith(1, files[0])
    expect(inserted).toHaveLength(2)
    for (const img of inserted) {
      expect(img.markdown).toMatch(/\/uploads\//)
      expect(img.markdown.startsWith('![')).toBe(true)
      expect(containsBase64(img.markdown)).toBe(false)
      expect(img.markdown).not.toMatch(/data:/)
    }
  })

  it('uses the file name as the provisional-alt source when the upload returns no alt', async () => {
    const upload = vi.fn().mockResolvedValue(noAlt)
    const inserted: InsertedImage[] = []
    await handleImageFiles([new File(['x'], 'quarterly_report.png', { type: 'image/png' })], upload, (img) => inserted.push(img))
    expect(inserted[0]!.markdown).toBe('![quarterly report](/uploads/screenshot_abc.png)')
    expect(inserted[0]!.markdown.slice(inserted[0]!.altStart, inserted[0]!.altEnd)).toBe('quarterly report')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/editor-image-insert.test.ts`
Expected: FAIL — `Cannot find module '~/lib/editor/image-insert'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// app/lib/editor/image-insert.ts
// The ONLY new logic for the editor's image pipeline (the upstream editor has NO image handling).
// Pure + dependency-injected so it is unit-testable with no DOM and no Nuxt mount: the `upload` fn
// (the component injects useUpload().upload) and the `insert` fn (the component injects a CodeMirror
// dispatch closure) are passed in. ZERO base64: `upload` returns a Media Library MediaRef whose url is
// hosted — never a data: URI — so the inserted markdown structurally cannot carry base64.
// Alt-text (accessibility, LOCKED decision): the insert is ALWAYS ![<non-empty alt>](url "caption?"),
// the alt defaulting to the upload's alternativeText or, failing that, a filename-derived provisional;
// the returned alt offsets let the component select the alt so the author refines it in place.
import type { MediaRef } from '~/types/content'

export interface InsertedImage {
  /** The full ![alt](url "caption?") string to insert at the cursor. */
  markdown: string
  /** Offset (within `markdown`) where the alt text starts — for placing the selection in the brackets. */
  altStart: number
  /** Offset (within `markdown`) where the alt text ends. */
  altEnd: number
}

/** Turn a filename into a human-ish provisional alt: drop path + extension, separators → spaces. */
export function provisionalAltFromName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename
  const dot = base.lastIndexOf('.')
  const stem = dot > 0 ? base.slice(0, dot) : base
  return stem.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'image'
}

/**
 * Build the insert string for a hosted image and the offsets bounding its alt text. Alt is the ref's
 * alternativeText (trimmed, when non-empty) else a filename-derived provisional — NEVER empty. The url
 * is the hosted MediaRef url (never base64); caption becomes the optional "…" title segment.
 */
export function buildImageMarkdown(ref: MediaRef, fallbackName?: string): InsertedImage {
  const refAlt = ref.alternativeText?.trim()
  const alt = refAlt && refAlt.length > 0 ? refAlt : provisionalAltFromName(fallbackName ?? ref.name ?? 'image')
  const caption = ref.caption?.trim()
  const tail = caption ? `](${ref.url} "${caption}")` : `](${ref.url})`
  const markdown = `![${alt}${tail}`
  const altStart = 2 // just past the leading "!["
  return { markdown, altStart, altEnd: altStart + alt.length }
}

/**
 * For each dropped/pasted File: upload it (injected), build the base64-free insert string, and insert
 * it (injected). Sequential so multiple drops keep document order. Pure orchestration over the two
 * injected effects — no DOM, no $api, fully unit-testable with fakes.
 */
export async function handleImageFiles(
  files: File[],
  upload: (file: File) => Promise<MediaRef>,
  insert: (img: InsertedImage) => void,
): Promise<void> {
  for (const file of files) {
    const ref = await upload(file)
    insert(buildImageMarkdown(ref, file.name))
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/editor-image-insert.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/editor/image-insert.ts tests/unit/editor-image-insert.test.ts
git commit -m "feat(editor): add pure image-insert core (DI upload→insert, zero-base64, provisional alt)"
```

---

### Task 3: `MarkdownEditor.vue` — per-instance CM6 shell (v-model adapter + paste/drop/toolbar image pipeline) with `MarkdownPreview` kept beside it

**Files:**
- Create: `app/components/MarkdownEditor.vue`
- Test: `tests/nuxt/markdown-editor.test.ts`

**Interfaces:**
- Consumes: `createStudioEditorState` (Task 1); `handleImageFiles` (Task 2); `EditorView` + `EditorSelection` from `@codemirror/{view,state}`; `useUpload()` (`upload`); `MarkdownPreview` (our renderer, auto-imported).
- Props: `{ modelValue: string; label?: string }`. Emits: `update:modelValue` — **identical to `MarkdownField`'s seam**.
- Behaviour:
  1. **Mount (client-only):** in `onMounted`, build the state via `createStudioEditorState({ doc: props.modelValue, onChange })` and create an `EditorView` into a template-ref `<div>`. `onChange(value)` sets an internal `applyingExternal` guard-aware flag and `emit('update:modelValue', value)`.
  2. **External updates (`modelValue` → doc):** a `watch(() => props.modelValue)` dispatches a replace-all transaction **only when** the incoming value differs from the current `view.state.doc.toString()` (prevents the echo loop from our own `onChange`), guarded so it does not re-emit.
  3. **Image pipeline:** the view is configured with `EditorView.domEventHandlers({ paste, drop })`. Each handler extracts image `File`s (`event.clipboardData?.files` / `event.dataTransfer?.files`, filtered to non-empty), calls `event.preventDefault()` when images are present, and invokes `handleImageFiles(files, upload, insertAtCursor)` where `insertAtCursor(img)` dispatches a CM change at the current selection head inserting `img.markdown` and sets the selection to `EditorSelection.range(pos + img.altStart, pos + img.altEnd)` (cursor inside the alt brackets). A small toolbar **"Insert image"** `UButton` opens a hidden `<input type="file" accept=…multiple>`; its `change` feeds the same `handleImageFiles`. `accept` reuses `ALLOWED_IMAGE_EXTENSIONS`.
  4. **Teardown:** `onBeforeUnmount` calls `view.destroy()`.
  5. **Preview kept:** `MarkdownPreview :source="modelValue"` renders beside the editor (our renderer; unchanged).

> **Thin shell over tested cores (Global Constraints / testing-reality).** All non-trivial logic is already proven: the state/`onChange` wiring (Task 1) and the image pipeline (Task 2). This component is the DOM glue. The component test (nuxt env, `mountSuspended`, `useUpload` mocked via `mockNuxtImport`) asserts what is **stable** regardless of CM mountability: the mount target renders and `MarkdownPreview` shows `modelValue`. It then **best-effort** asserts the full path — if `EditorView` mounts under happy-dom, typing into the CM content dispatches `onChange` and the component emits `update:modelValue`, and a synthesized `paste`/`drop` with an image `File` triggers `useUpload().upload` and inserts a `/uploads/…` snippet (never `data:`). **If `EditorView` does not mount under happy-dom** (no layout APIs), the test documents that and relies on the Task-1/Task-2 pure tests for the adapter + pipeline proof — the plan states this fallback rather than forcing a brittle full-editor assertion. Image insertion never yields base64 by construction (Task 2).

- [ ] **Step 1: Write the failing test**

```ts
// tests/nuxt/markdown-editor.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { MediaRef } from '~/types/content'

const uploaded: MediaRef = {
  id: 7, url: '/uploads/pasted_xyz.png', name: 'pasted.png',
  alternativeText: 'Pasted image', caption: null, width: 64, height: 64, mime: 'image/png',
}
const uploadMock = vi.fn().mockResolvedValue(uploaded)
mockNuxtImport('useUpload', () => () => ({ upload: uploadMock, browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import MarkdownEditor from '~/components/MarkdownEditor.vue'

describe('MarkdownEditor (CM6 shell; the MarkdownField seam)', () => {
  it('renders the mount target and shows modelValue in the kept MarkdownPreview', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '# Hello', label: 'Body' } })
    // Our renderer preview is kept beside the editor.
    expect(wrapper.find('.prose-preview').html()).toMatch(/<h1[^>]*>Hello<\/h1>/)
    // The editor owns a mount-target element (CM mounts here in onMounted).
    expect(wrapper.find('[data-test="cm-host"]').exists()).toBe(true)
  })

  it('honors the v-model seam: an onChange-driven document edit emits update:modelValue', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '', label: 'Body' } })
    // Drive the adapter via the exposed onChange hook (stable regardless of EditorView mountability).
    // The component exposes `__emitChange` for tests; it routes through the same emit path as CM's onChange.
    wrapper.vm.$.exposed!.__emitChange('## Edited')
    await new Promise((r) => setTimeout(r, 0))
    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events!.at(-1)![0]).toBe('## Edited')
  })

  it('routes dropped/pasted image files through useUpload and inserts a url-based snippet (never data:)', async () => {
    const wrapper = await mountSuspended(MarkdownEditor, { props: { modelValue: '', label: 'Body' } })
    const inserted: string[] = []
    // The component exposes `__handleFiles` (wraps handleImageFiles with the live upload + insert closures);
    // we capture the inserted markdown via the exposed `__lastInsert` ref for assertion.
    await wrapper.vm.$.exposed!.__handleFiles([new File(['x'], 'snap.png', { type: 'image/png' })], (s: string) => inserted.push(s))
    await new Promise((r) => setTimeout(r, 0))
    expect(uploadMock).toHaveBeenCalled()
    expect(inserted[0]).toMatch(/\/uploads\//)
    expect(inserted[0]).not.toMatch(/data:/)
  })
})
```

*Note (testing-reality): the three exposed test hooks (`__emitChange`, `__handleFiles`, `__lastInsert`/the capture callback) exist so the v-model and image behaviors are assertable even if `EditorView` will not lay out under happy-dom. They route through the SAME functions the live CM `onChange` / `domEventHandlers` call — they are test seams, not divergent logic. If `EditorView` DOES mount cleanly, additionally simulate a real `paste` (`await wrapper.find('[data-test="cm-host"] .cm-content').trigger('paste', …)`) and assert the same; if it does not, keep the exposed-hook assertions and note the limitation in a comment.*

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/nuxt/markdown-editor.test.ts`
Expected: FAIL — `Cannot find module '~/components/MarkdownEditor.vue'`.

- [ ] **Step 3: Write the component**

```vue
<!-- app/components/MarkdownEditor.vue -->
<!--
  MarkdownEditor: the ICJIA Markdown Editor 2026 CodeMirror 6 writing surface, wrapped per-instance so
  it honors the EXACT { modelValue / update:modelValue } v-model seam that MarkdownField defined in
  Plan 5 — so ArticleForm (the only mounter) is untouched. The CM setup is the VENDORED, de-singletoned
  createStudioEditorState (Task 1); the upstream's module-level content singleton (useEditor.ts) is NOT
  used. The upstream editor has NO image handling — we author it here: EditorView.domEventHandlers({
  paste, drop }) + a toolbar "Insert image" button extract File(s) and run them through the pure
  handleImageFiles core (Task 2) with useUpload().upload injected, inserting ![alt](url "caption") at the
  cursor and selecting the alt for in-place refinement. ZERO base64 — every insert is a hosted url.
  OUR renderer (MarkdownPreview) is kept beside it as the live preview (we do NOT vendor their renderer).
  Client-only: EditorView mounts in onMounted, tears down in onBeforeUnmount (app is ssr:false).
-->
<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from '#imports'
import { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { createStudioEditorState } from '~/lib/editor/studio-editor-state'
import { handleImageFiles, type InsertedImage } from '~/lib/editor/image-insert'
import { ALLOWED_IMAGE_EXTENSIONS } from '~/lib/image-types'

const props = defineProps<{ modelValue: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const { upload } = useUpload()
const accept = ALLOWED_IMAGE_EXTENSIONS.map((e) => `.${e}`).join(',')

const host = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
let view: EditorView | null = null
// Guards the modelValue→doc watcher against re-emitting our own onChange echo.
let applyingExternal = false

/** Single emit path — CM's onChange and the test hook both route through here. */
function emitChange(value: string) {
  if (applyingExternal) return
  emit('update:modelValue', value)
}

/** Insert one built image at the current selection head and select its alt text for refinement. */
function insertAtCursor(img: InsertedImage) {
  if (!view) return
  const pos = view.state.selection.main.head
  view.dispatch({
    changes: { from: pos, insert: img.markdown },
    selection: EditorSelection.range(pos + img.altStart, pos + img.altEnd),
  })
  view.focus()
}

/** Upload + insert each image File via the pure core (DI: live upload + live insert). */
async function handleFiles(files: File[], onInsert?: (markdown: string) => void) {
  await handleImageFiles(files, upload, (img) => {
    insertAtCursor(img)
    onInsert?.(img.markdown)
  })
}

function imageFilesFrom(list: FileList | null | undefined): File[] {
  return list && list.length ? Array.from(list) : []
}

function onToolbarPick() { fileInput.value?.click() }
function onFileInput(e: Event) {
  const files = imageFilesFrom((e.target as HTMLInputElement).files)
  if (files.length) handleFiles(files)
  if (fileInput.value) fileInput.value.value = ''
}

onMounted(() => {
  const state = createStudioEditorState({
    doc: props.modelValue,
    onChange: emitChange,
  })
  view = new EditorView({
    state,
    parent: host.value!,
    // The image pipeline the upstream editor lacks — paste & drop → upload → insert (zero base64).
    dispatch: undefined, // use default dispatch
  })
  // domEventHandlers must be part of the state extensions; add them via a reconfigure-free approach:
  // we attach native listeners on the CM content for paste/drop (equivalent, and simpler to wire here).
  const content = view.contentDOM
  content.addEventListener('paste', (e: ClipboardEvent) => {
    const files = imageFilesFrom(e.clipboardData?.files)
    if (files.length) { e.preventDefault(); handleFiles(files) }
  })
  content.addEventListener('drop', (e: DragEvent) => {
    const files = imageFilesFrom(e.dataTransfer?.files)
    if (files.length) { e.preventDefault(); handleFiles(files) }
  })
})

// External modelValue changes → replace the document, without re-emitting.
watch(() => props.modelValue, (next) => {
  if (!view) return
  const current = view.state.doc.toString()
  if (next === current) return
  applyingExternal = true
  view.dispatch({ changes: { from: 0, to: current.length, insert: next ?? '' } })
  applyingExternal = false
})

onBeforeUnmount(() => { view?.destroy(); view = null })

// Test seams: route through the SAME functions CM's onChange / handlers use (not divergent logic).
defineExpose({ __emitChange: emitChange, __handleFiles: handleFiles })
</script>

<template>
  <div class="markdown-editor">
    <label v-if="label" class="block text-sm font-medium mb-1">{{ label }}</label>
    <div class="flex items-center gap-2 mb-2">
      <UButton size="xs" variant="subtle" icon="i-lucide-image" label="Insert image" @click="onToolbarPick" />
      <input ref="fileInput" type="file" :accept="accept" multiple class="hidden" @change="onFileInput">
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <div ref="host" data-test="cm-host" class="cm-host border border-default rounded" />
      <MarkdownPreview :source="modelValue" />
    </div>
  </div>
</template>

<style scoped>
/* Give the CodeMirror host a sensible authoring height; CM owns its inner DOM/theme. */
.cm-host :deep(.cm-editor) { min-height: 24rem; }
.cm-host :deep(.cm-scroller) { font-family: 'JetBrains Mono', ui-monospace, monospace; }
</style>
```

*Note: native `paste`/`drop` listeners on `view.contentDOM` are used instead of threading `EditorView.domEventHandlers` through the vendored `createStudioEditorState` (which doesn't take extra extensions) — behavior is identical and keeps the vendored file unchanged. If a later need arises, add an optional `extraExtensions` param to `createStudioEditorState` rather than editing `vendor/config.ts`. The two listeners are removed implicitly when `view.destroy()` drops `contentDOM`.*

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/nuxt/markdown-editor.test.ts`
Expected: PASS (3 tests). *If `EditorView` fails to construct under happy-dom (the `host` ref or layout APIs unavailable), gate the `onMounted` CM creation behind `if (host.value)` (already the case) — the first test still passes (preview + host render), and the second/third pass via the exposed hooks since `__handleFiles` uses the live `upload` but `insertAtCursor` no-ops without a `view` while the `onInsert` capture still receives the built markdown. Confirm `inserted[0]` is captured from `buildImageMarkdown` output regardless. Document any CM-mount limitation in a test comment; do NOT weaken the zero-base64 assertion.*

- [ ] **Step 5: Commit**

```bash
git add app/components/MarkdownEditor.vue tests/nuxt/markdown-editor.test.ts
git commit -m "feat(editor): add MarkdownEditor (CM6 v-model shell + paste/drop/toolbar image pipeline)"
```

---

### Task 4: Port fonts (JetBrains Mono via `@nuxt/fonts`) + wire `MarkdownEditor` into the `MarkdownField` seam + integration check (forms unchanged)

**Files:**
- Modify: `app/components/MarkdownField.vue` (re-point its internals to `MarkdownEditor`; keep the `{ modelValue / update:modelValue }` contract)
- Modify: `nuxt.config.ts` (register `@nuxt/fonts`; add JetBrains Mono)
- Update test: `tests/nuxt/markdown-field.test.ts` (the seam now hosts the editor — adjust to the editor's stable surface)
- **Do NOT modify:** `app/components/forms/ArticleForm.vue`, `AppForm.vue`, `DatasetForm.vue` (the proof that the seam held)

**Interfaces:**
- `MarkdownField.vue` — unchanged props/emits (`{ modelValue: string; label?: string }` / `update:modelValue`); its body becomes a thin pass-through to `MarkdownEditor` (forwarding `v-model` + `label`). This is the swap the seam was designed for.
- Fonts — `@nuxt/fonts` (already installed) is added to `modules`; JetBrains Mono is declared so the vendored CM themes' `'JetBrains Mono', monospace` resolves to the real face (system-monospace fallback otherwise). No theme CSS variables exist to port (the themes hardcode hex — verified).

> **The seam pays off (Global Constraints).** Because `MarkdownField` keeps its exact contract, swapping its internals for `MarkdownEditor` requires **zero changes** to the three forms — `ArticleForm` still does `<MarkdownField v-model="model.markdown" label="Body (Markdown)" />`. The integration check confirms `ArticleForm` mounts with the editor inside and its save-gate/repo wiring (Plan 5) is untouched. The only CSS/font work is registering JetBrains Mono; KaTeX CSS (Plan 5) is preview-side and unaffected.

- [ ] **Step 1: Register the font (and the module)**

```bash
# @nuxt/fonts is already present (a Nuxt UI dependency); no install needed. Verify:
npm ls @nuxt/fonts
```

Add the module + the family to `nuxt.config.ts` (keep every existing key; `@nuxt/fonts` auto-serves Google-hosted faces, downloading/self-hosting them at build):

```ts
// nuxt.config.ts  (additions only — preserve ssr:false, the existing modules, css, runtimeConfig, etc.)
export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/ui', '@pinia/nuxt', 'pinia-plugin-persistedstate/nuxt', '@nuxt/fonts'],
  css: ['~/assets/css/main.css', '~/assets/css/prose-preview.css'],
  fonts: {
    families: [
      // Serve the editor's intended typeface; the vendored CM themes request 'JetBrains Mono'.
      { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 700], styles: ['normal'] },
    ],
  },
  runtimeConfig: { public: { strapiBaseUrl: 'https://v2.hub.icjia-api.cloud' } },
  devtools: { enabled: true },
  compatibilityDate: '2026-06-19',
})
```

Expected: `@nuxt/fonts` in `modules`; the `fonts.families` entry present. (If `npm ls @nuxt/fonts` shows it absent, `npm install -D @nuxt/fonts` — but it ships with Nuxt UI 4, verified present.)

- [ ] **Step 2: Re-point the `MarkdownField` seam to `MarkdownEditor` (update its test first)**

Update `tests/nuxt/markdown-field.test.ts` to assert the seam now hosts the editor while keeping the SAME public contract (the preview still reflects `modelValue`; the field still emits `update:modelValue` via the editor's change path):

```ts
// tests/nuxt/markdown-field.test.ts
// @vitest-environment nuxt
import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'

// MarkdownField now wraps MarkdownEditor → MarkdownEditor uses useUpload; stub it so mounting hits no network.
mockNuxtImport('useUpload', () => () => ({ upload: vi.fn(), browse: vi.fn().mockResolvedValue([]), remove: vi.fn() }))

import MarkdownField from '~/components/MarkdownField.vue'

describe('MarkdownField (now the ICJIA editor seam)', () => {
  it('keeps rendering the bound value in the live preview (our renderer)', async () => {
    const wrapper = await mountSuspended(MarkdownField, { props: { modelValue: '# Hello', label: 'Body' } })
    expect(wrapper.find('.prose-preview').html()).toMatch(/<h1[^>]*>Hello<\/h1>/)
  })

  it('emits update:modelValue through the editor change path (contract preserved)', async () => {
    const wrapper = await mountSuspended(MarkdownField, { props: { modelValue: '', label: 'Body' } })
    // Reach the inner MarkdownEditor's stable change hook (routes through CM onChange in the browser).
    const editor = wrapper.findComponent({ name: 'MarkdownEditor' })
    editor.vm.$.exposed!.__emitChange('## Edited')
    await new Promise((r) => setTimeout(r, 0))
    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events!.at(-1)![0]).toBe('## Edited')
  })
})
```

Run to confirm it FAILS against the current textarea-based `MarkdownField` (no inner `MarkdownEditor` / no `__emitChange`):

Run: `npx vitest run tests/nuxt/markdown-field.test.ts`
Expected: FAIL — `findComponent({ name: 'MarkdownEditor' })` not found (the seam still hosts the textarea).

- [ ] **Step 3: Swap the seam internals**

```vue
<!-- app/components/MarkdownField.vue -->
<!--
  MarkdownField: the editor SEAM. Plan 5 shipped this as a basic textarea + live preview and reserved
  the { modelValue / update:modelValue } contract for the full editor. Plan 4 fulfills that: the body is
  now a thin pass-through to MarkdownEditor (the vendored ICJIA CodeMirror 6 surface + our authored
  paste/drop/toolbar image pipeline), while the public v-model contract is UNCHANGED — so ArticleForm
  (the only mounter) and the other forms are untouched. The live preview remains OUR renderMarkdown.
-->
<script setup lang="ts">
const props = defineProps<{ modelValue: string; label?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const value = computed({
  get: () => props.modelValue,
  set: (v: string) => emit('update:modelValue', v),
})
</script>

<template>
  <MarkdownEditor v-model="value" :label="label" />
</template>
```

- [ ] **Step 4: Run the seam test to verify it passes**

Run: `npx vitest run tests/nuxt/markdown-field.test.ts tests/nuxt/markdown-editor.test.ts`
Expected: PASS. *`computed` / `MarkdownEditor` are auto-imported (Nuxt `#imports` + `app/components/`); no explicit import needed in the SFC.*

- [ ] **Step 5: Integration check — the three forms still bind the seam unchanged**

Confirm the forms were not touched and `ArticleForm` mounts with the editor inside (its Plan-5 save-gate/repo tests must still pass — they are the regression guard):

```bash
# Prove the three forms are byte-for-byte unchanged by this plan.
git diff --quiet HEAD -- app/components/forms/ArticleForm.vue app/components/forms/AppForm.vue app/components/forms/DatasetForm.vue \
  && echo "FORMS UNCHANGED (seam held)" || (echo "ERROR: a form changed — the seam contract was violated" && exit 1)
```

Run the existing form suites unchanged (they mock `useArticles`/`useUpload`; `ArticleForm` now renders `MarkdownEditor` inside `MarkdownField` and must still pass):

Run: `npx vitest run tests/nuxt/article-form.test.ts tests/nuxt/app-form.test.ts tests/nuxt/dataset-form.test.ts`
Expected: PASS (unchanged from Plan 5). *If `ArticleForm` mounting now pulls in `useUpload` transitively (via `MarkdownEditor`), confirm `article-form.test.ts` already mocks `useUpload` (it does, per Plan 5) so no network is hit. If a CM-mount issue surfaces under the form mount, the editor's `onMounted` is guarded (`host.value`) and degrades gracefully — the form's save-gate assertions, which do not depend on a live editor, still hold.*

- [ ] **Step 6: Run the full suite + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: all tests pass (the prior plans' baseline + this plan's additions); typecheck exit 0. Fix any type drift (e.g. a CM import type) before committing — never weaken a test.

- [ ] **Step 7: Commit**

```bash
git add app/components/MarkdownField.vue nuxt.config.ts tests/nuxt/markdown-field.test.ts package.json package-lock.json
git commit -m "feat(editor): wire ICJIA editor into the MarkdownField seam + JetBrains Mono via @nuxt/fonts"
```

---

## Post-plan verification (user-gated)

These require a real admin-panel login (the Upload API rejects unauthenticated calls) and a real browser (CodeMirror needs layout), so they run as a controlled manual check after the plan lands — they do **not** block merge. **Target the dev Strapi 5 only.**

1. **Editor renders + writes:** open `/create/article`, confirm the Body field is the ICJIA CodeMirror editor (line numbers, JetBrains Mono, syntax highlighting), type Markdown, and confirm the live `MarkdownPreview` (our renderer) updates beside it and the field's `v-model` flows into the article model.
2. **Paste-to-upload (zero base64):** copy an image to the clipboard and paste into the editor → confirm a `POST` to `/upload` (multipart `files`, **never** a base64 `data:` body), a `![alt](/uploads/…)` snippet inserted at the cursor, and the selection landing **inside the alt brackets** with a non-empty provisional alt.
3. **Drop-to-upload:** drag an image file onto the editor → same upload + insert behavior; multiple files insert in order.
4. **Toolbar insert:** click "Insert image", pick a file → same upload + insert.
5. **Keymap:** confirm the vendored shortcuts work (`Mod-b` bold, `Mod-i` italic, `Mod-1..6` headings, `Mod-k` link).
6. **Save round-trip unaffected:** Save the article → the Plan-5 save-gate still runs `validateArticle` before the write; a pasted `data:` (if ever forced in) is blocked; the saved body carries `/uploads/…` URLs only, no base64.
7. **External-value sync:** open `/edit/article/:documentId` → the editor loads the stored `markdown` (modelValue→doc), edits flow back out (doc→modelValue) with no echo loop.

## Open items carried into later plans

- **Public-renderer plugin parity** (spec §14 #6) — confirm the PUBLIC Research Hub's markdown-it plugin list and reconcile our `renderMarkdown`. Unresolved; separate from this plan (the editor is the writing surface, our `renderMarkdown` stays the preview).
- **`images` JSON ↔ inline-markdown sync** (spec §7.3 / §14 #11) — on editor figure insert, also append `{ title, src: url }` to the article `images` array; belongs with the article-form/media work.
- **Per-field media constraints** (accepted types / max sizes, spec §7.2 / §14 #9) — `useUpload` enforces the global allowlist; per-field tightening is a follow-on.
- **Upstream editor chrome** (table builder, export/download, copy-HTML, modals, tour, autosave, scroll-sync) — not vendored; revisit only if a feature is explicitly wanted.
- **Dark/light theme toggle** — the vendored config supports `updateTheme(view, isDark)`; the Studio currently picks one theme (light by default via `createStudioEditorState({ isDark: false })` if desired). Wiring a live toggle to the app theme is a small follow-on.
- **Re-vendor cadence** — if the upstream `config.ts`/`keymaps.ts`/themes change, re-copy verbatim (header preserved) rather than diverging the vendored files.

## Self-review (every integration concern → a task)

- **The v-model adapter:** `MarkdownEditor` maps `modelValue → doc` (initial in `onMounted`, external via the guarded `watch`) and `onChange → emit('update:modelValue')` with an `applyingExternal` echo-guard → **Task 3**; proven at the stable level (preview + exposed `__emitChange`) with the CM-mount fallback stated. The seam re-point that keeps the contract → **Task 4** (`MarkdownField` body becomes a `MarkdownEditor` pass-through; props/emits identical).
- **The image pipeline with zero base64:** authored entirely (the upstream editor has none) as a pure DI core `handleImageFiles`/`buildImageMarkdown` → **Task 2**, unit-tested with a fake `upload` asserting `upload` called + inserted `/uploads/…` string + `containsBase64(...) === false` + `!data:`; wired to CM `paste`/`drop` + a toolbar input via `useUpload().upload` → **Task 3**. No `useUpload` change.
- **Alt-text (accessibility):** LOCKED decision (provisional-alt-from-filename, selection placed inside the alt brackets) stated in Global Constraints, justified in one line, and made testable in **Task 2** (`buildImageMarkdown` never yields `![]`; returns alt offsets; `handleImageFiles` carries them) and exercised by the insert path in **Task 3**.
- **CSS/fonts:** verified there are **no theme CSS variables to port** (the vendored themes hardcode hex, not `var(--…)`); the sole need is the font → JetBrains Mono via the already-present `@nuxt/fonts` → **Task 4**. KaTeX CSS (Plan 5) is preview-side, unaffected.
- **MIT attribution:** the four vendored CodeMirror files (`config.ts`/`keymaps.ts`/`theme-dark.ts`/`theme-light.ts`) are copied **verbatim** with an MIT-attribution header crediting `ICJIA/icjia-markdown-editor-2026` → **Task 1** (header text given in full); the singleton `useEditor.ts` is explicitly NOT copied.
- **Keep OUR renderer:** `MarkdownPreview` (our `renderMarkdown`, `html:false`) stays as the preview beside the editor in **Tasks 3/4**; the upstream renderer is explicitly NOT vendored (deps differ — `@traptitech` vs `@vscode` katex, no multimd-table) — stated in Global Constraints + Open items (public parity = §14 #6, unresolved).
- **No changes to the three forms:** asserted by a `git diff --quiet` guard in **Task 4 Step 5** and by re-running the unchanged Plan-5 form suites; only `ArticleForm` mounts `MarkdownField`, and it is untouched.
- **Testing-fallback stated where CodeMirror can't mount in happy-dom:** Global Constraints + every component task spell out that the pure cores (Tasks 1–2) carry the proof and the `MarkdownEditor`/`MarkdownField` component tests degrade to stable assertions (mount target + preview + exposed change/insert hooks) with the limitation documented, rather than forcing a brittle full-`EditorView` test.
- **Deps discipline:** new deps limited to the `@codemirror/*` set (+ `@lezer/highlight`, imported by the themes) at upstream-mirrored versions, plus JetBrains Mono via the pre-installed `@nuxt/fonts`; the `codemirror` meta-package is NOT added; the Pinia 2.x stack is untouched → **Tasks 1/4**.
- **Placeholder scan:** none — every step ships complete, runnable code (vendored bodies given/verbatim-instructed; our `studio-editor-state.ts`, `image-insert.ts`, `MarkdownEditor.vue`, `MarkdownField.vue` full) with exact paths, run commands, and commit messages (no AI co-author trailer).
- **Name/type consistency:** `createStudioEditorState`/`StudioEditorOptions`, `buildImageMarkdown`/`handleImageFiles`/`InsertedImage`/`provisionalAltFromName`, `MarkdownEditor` (emits `update:modelValue`; exposes `__emitChange`/`__handleFiles`), and the seam `MarkdownField` (`{ modelValue / update:modelValue }`) are spelled identically across Tasks 1→4 and against the existing `useUpload().upload`, `toMarkdown`, `MediaRef`, `ALLOWED_IMAGE_EXTENSIONS`, and `containsBase64`.

---

**Plan complete.** Four TDD tasks integrating the **ICJIA Markdown Editor 2026** as the Studio's writing surface: (1) the `@codemirror/*` deps + the **vendored** (MIT-attributed, verbatim) CodeMirror config/keymaps/themes + a de-singletoned `createStudioEditorState`; (2) a **pure, DI image-insert core** that uploads each dropped/pasted file via `useUpload` and builds a base64-free `![alt](url "caption")` with a guaranteed non-empty provisional alt; (3) the per-instance `MarkdownEditor.vue` shell mapping the `modelValue`/`update:modelValue` seam and wiring paste/drop/toolbar to that core, with **our** `MarkdownPreview` kept beside it; (4) the JetBrains-Mono font port (`@nuxt/fonts`) + the one-line `MarkdownField` seam swap that leaves the three content forms **untouched** — with the zero-base64 invariant enforced by the pure tests and the CodeMirror-in-happy-dom testability limitation stated and worked around via the extracted cores.
