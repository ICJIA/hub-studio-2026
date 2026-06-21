// The Studio's single Markdown renderer. ONE configured markdown-it instance with the parity
// plugin set (footnotes, KaTeX, multi-row tables) — aligned with the public Research Hub
// renderer so the in-editor preview (MarkdownField, Plan 5) matches published output (spec §8;
// the exact public plugin list is Open item §14 #6, swapped here in one place). The SAME
// renderMarkdown powers the /preview route. `html: false` ESCAPES raw HTML / <script> in
// author-supplied markdown (security default); only trusted plugin output is emitted.
import MarkdownIt from 'markdown-it'
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
