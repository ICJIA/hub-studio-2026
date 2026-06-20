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

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
  .use(footnote)
  .use(katex)
  .use(multimdTable, { multiline: true, rowspan: true, headerless: true })

/** Render Markdown source to HTML with the Studio/public-site parity plugin set. */
export function renderMarkdown(source: string): string {
  return md.render(source ?? '')
}
