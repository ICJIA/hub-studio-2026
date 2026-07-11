#!/usr/bin/env node
/**
 * Build the compiled Word edition of the Analysis & Launch Roadmap:
 * the article + the three companion docs as Appendices A–C, prefixed by a
 * DETAILED, CLICKABLE table of contents.
 *
 * Word-friendliness constraints (the whole reason this script exists):
 *  - NO TOC *field* (pandoc --toc marks it dirty → Word's scary "this document
 *    contains fields/links that may refer to other files" prompt on open). The
 *    TOC here is a static list of internal hyperlinks to explicit heading ids —
 *    real Word bookmarks, no fields, no prompt.
 *  - NO relative-file hyperlinks (they become external file references that are
 *    dead in an emailed copy). Links to repo files are flattened to plain text;
 *    https:// links are kept.
 *  - Appendix content is demoted one heading level so Word's navigation pane
 *    nests each appendix under its title.
 *
 * Usage: node scripts/build-word-edition.mjs
 * Requires: pandoc (gfm+attributes+raw_attribute → docx).
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const docs = join(root, 'docs')

const ARTICLE = join(docs, 'ICJIA-Research-Hub-Studio-2026-Analysis-and-Launch-Roadmap.md')
const OUT = join(docs, 'ICJIA-Research-Hub-Studio-2026-Analysis-and-Launch-Roadmap.docx')
const APPENDICES = [
  ['Appendix A — Design & Implementation Specification', join(docs, 'ICJIA-Research-Hub-Studio-2026-Design-and-Implementation-Spec.md')],
  ['Appendix B — Security Audit (Red Team / Blue Team)', join(docs, 'security-audit.md')],
  ['Appendix C — Demo → Production Cutover Runbook', join(docs, 'demo-to-production.md')],
]

const PAGE_BREAK = '\n```{=openxml}\n<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n```\n'

/** Flatten [text](target) to plain text unless target is https?:// or an in-doc #anchor. */
const flattenRelativeLinks = (md) =>
  md.replace(/\[([^\]]+)\]\((?!https?:|#)[^)]+\)/g, '$1')

/** Demote every ATX heading by one level (outside fenced code blocks). */
function demoteHeadings(md) {
  let fenced = false
  return md
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
      if (!fenced && /^#{1,5}\s/.test(line)) return '#' + line
      return line
    })
    .join('\n')
}

// ── Assemble the raw document ────────────────────────────────────────────────
const article = flattenRelativeLinks(readFileSync(ARTICLE, 'utf8')).replace(
  'It analyzes the application as it stands, recommends improvements, and lays out the path to launch.',
  'It analyzes the application as it stands, recommends improvements, and lays out the path to launch. ' +
    '**In this Word edition the three companion references are included in full as Appendix A (Design & Implementation Spec), ' +
    'Appendix B (Security Audit), and Appendix C (Demo → Production Runbook) — the Contents below links to every section.**',
)

// The TOC marker goes right after the article's opening meta block (first `---`
// after the audience line); headings BEFORE the marker (the title block) stay
// out of the TOC.
const TOC_MARKER = '<!--TOC-->'
const articleWithMarker = article.replace('\n---\n', `\n---\n\n${TOC_MARKER}\n`)
if (!articleWithMarker.includes(TOC_MARKER)) {
  throw new Error('Could not place the TOC marker after the article title block')
}

let assembled =
  articleWithMarker +
  APPENDICES.map(
    ([title, path]) =>
      `\n${PAGE_BREAK}\n# ${title}\n\n*Companion document, included in full (current as of this edition's date). Sections below keep their own internal numbering.*\n\n` +
      demoteHeadings(flattenRelativeLinks(readFileSync(path, 'utf8'))),
  ).join('')

// ── Assign explicit heading ids and build the linked TOC ─────────────────────
// Explicit {#tocN} ids sidestep any mismatch with pandoc's auto-identifier
// algorithm, so every TOC link is guaranteed to hit its bookmark.
const lines = assembled.split('\n')
const entries = []
let fenced = false
let seenMarker = false
let n = 0
for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  if (line.includes(TOC_MARKER)) seenMarker = true
  if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
  if (fenced || !seenMarker) continue
  const m = /^(#{1,3})\s+(.*)$/.exec(line)
  if (!m) continue
  const id = `toc${++n}`
  const display = m[2]
    .replace(/\{#[^}]+\}\s*$/, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/<https?:\/\/[^>]+>/g, '')
    .trim()
  lines[i] = `${m[1]} ${m[2]} {#${id}}`
  entries.push({ level: m[1].length, display, id })
}

// 2-space nesting: 4+ leading spaces would turn a leading sub-entry into a
// CommonMark indented CODE BLOCK and silently strip its hyperlink.
const tocList = entries
  .map((e) => `${'  '.repeat(e.level - 1)}- [${e.display}](#${e.id})`)
  .join('\n')
const toc = `## Contents\n\n${tocList}\n\n${PAGE_BREAK}`
assembled = lines.join('\n').replace(TOC_MARKER, toc)

// ── Render ───────────────────────────────────────────────────────────────────
const tmp = mkdtempSync(join(tmpdir(), 'word-edition-'))
const src = join(tmp, 'assembled.md')
writeFileSync(src, assembled)
execFileSync('pandoc', ['-f', 'gfm+attributes+raw_attribute', '-t', 'docx', src, '-o', OUT])
console.log(`Wrote ${OUT} — ${entries.length} TOC entries, ${APPENDICES.length} appendices`)
