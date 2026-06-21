// The Studio's single Markdown renderer. ONE configured markdown-it instance with the parity
// plugin set (footnotes, KaTeX, multi-row tables) — aligned with the public Research Hub
// renderer so the in-editor preview (MarkdownField, Plan 5) matches published output (spec §8;
// the exact public plugin list is Open item §14 #6, swapped here in one place). The SAME
// renderMarkdown powers the /preview route. `html: false` ESCAPES raw HTML / <script> in
// author-supplied markdown (security default); only trusted plugin output is emitted.
import MarkdownIt from 'markdown-it'
import type { PluginSimple } from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import footnote from 'markdown-it-footnote'
import katex from '@vscode/markdown-it-katex'
import multimdTable from 'markdown-it-multimd-table'

/** Apply a link_open renderer rule that adds target="_blank" and rel="noopener noreferrer". */
function addLinkTargetBlank(instance: MarkdownIt): void {
  // Capture any existing rule so we can call it after setting the attributes.
  const existing = instance.renderer.rules['link_open']
  instance.renderer.rules['link_open'] = function (tokens, idx, options, env, self) {
    const token = tokens[idx]!
    token.attrSet('target', '_blank')
    token.attrSet('rel', 'noopener noreferrer')
    if (existing) return existing(tokens, idx, options, env, self)
    return self.renderToken(tokens, idx, options)
  }
}

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
  .use(footnote)
  .use(katex)
  .use(multimdTable, { multiline: true, rowspan: true, headerless: true })

addLinkTargetBlank(md)

/** Render Markdown source to HTML with the Studio/public-site parity plugin set. */
export function renderMarkdown(source: string): string {
  return md.render(source ?? '')
}

// Inline-only renderer: no footnote plugin (so [^1] references pass through as literal text),
// same link→new-window rule. Used for abstract/summary fields.
const mdInline = new MarkdownIt({ html: false, linkify: true, typographer: true })
  .use(katex)
  .use(multimdTable, { multiline: true, rowspan: true, headerless: true })

addLinkTargetBlank(mdInline)

/** Render inline Markdown (bold, italic, code, links) without footnotes or references.
 *  [^1] notations are NOT converted to footnote refs — they appear as literal text.
 *  Safe for v-html: html:false, trusted plugin output only. */
export function renderInline(source: string): string {
  return mdInline.render(source ?? '')
}

// ── Article-body rendering with a Table of Contents (audit M-2) ──────────────────────────────
// The TOC + per-h2 ids are derived from the markdown-it token AST (a core rule that walks
// heading_open tokens), NOT by regex-rewriting rendered HTML. The id is built from `slugify`
// (a strict [a-z0-9_-] allowlist) and then HTML-attribute-escaped before it reaches the
// rendered `id="..."`, so a heading carrying markup/special chars can never break the attribute.

/** Heading-text → anchor id. Strict allowlist: lowercase, `[^\w]+`→`-`, trimmed of stray `-`.
 *  The allowlist alone guarantees the id contains no quote/`<`/`>`/`&`, so it cannot break out of
 *  the rendered `id="..."` attribute; markdown-it's own renderer additionally HTML-escapes the
 *  attribute value (verified: a raw `"` → `&quot;`), giving belt-and-suspenders escaping. */
export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '')
}

export interface TocEntry { id: string; text: string }

/** markdown-it core rule: assign each <h2> a slugified, de-duplicated id and collect the TOC
 *  into env.toc. Reads the heading's inline token (`.content` = source text), never raw HTML. */
const h2TocRule: PluginSimple = (instance) => {
  instance.core.ruler.push('h2_toc_ids', (state) => {
    const env = state.env as { toc?: TocEntry[] }
    const toc: TocEntry[] = (env.toc = [])
    const seen = new Map<string, number>()
    const tokens = state.tokens as Token[]
    for (let i = 0; i < tokens.length; i++) {
      const open = tokens[i]!
      if (open.type !== 'heading_open' || open.tag !== 'h2') continue
      const inline = tokens[i + 1]
      const text = (inline?.content ?? '').trim()
      if (!text) continue
      let id = slugify(text)
      if (!id) continue
      // De-duplicate collisions deterministically (heading-2, heading-3, …).
      const n = seen.get(id) ?? 0
      seen.set(id, n + 1)
      if (n > 0) id = `${id}-${n + 1}`
      open.attrSet('id', id)
      toc.push({ id, text })
    }
    return true
  })
}

// A SEPARATE instance for article bodies: same parity plugin set + link rule as `md`, plus the
// h2-TOC core rule. Kept separate so renderMarkdown's output is unchanged for other callers.
const mdArticle = new MarkdownIt({ html: false, linkify: true, typographer: true })
  .use(footnote)
  .use(katex)
  .use(multimdTable, { multiline: true, rowspan: true, headerless: true })
  .use(h2TocRule)

addLinkTargetBlank(mdArticle)

/** Render an article body to HTML AND extract its h2 Table of Contents, in a single AST pass.
 *  Each <h2> gets a slugified, HTML-attribute-escaped, de-duplicated id; `toc` lists them in
 *  document order. Safe for v-html (html:false, trusted plugin output, escaped ids). */
export function renderArticleBody(source: string): { html: string; toc: TocEntry[] } {
  const env: { toc?: TocEntry[] } = {}
  const html = mdArticle.render(source ?? '', env)
  return { html, toc: env.toc ?? [] }
}
