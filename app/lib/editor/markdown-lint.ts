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
          message: '"#" is the article title — start your sections at "##".',
        })
      } else if (level > prevHeadingLevel + 1) {
        const need = '#'.repeat(prevHeadingLevel + 1)
        issues.push({
          line: lineNo,
          severity: 'warn',
          rule: 'heading-increment',
          message: `Heading jumps from H${prevHeadingLevel} to H${level} — add the missing "${need}" level.`,
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
