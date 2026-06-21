// app/lib/editor/figure-insert.ts
// Pure builder for a body FIGURE: an image paragraph + an optional caption paragraph laid out so the
// renderer + prose-preview.css figure rules pick it up. The renderer convention (markdown-it-attrs is
// live, the CSS centers images + tables, and caption adjacency is supported below/above with a
// `.fig-caption-left` left-justify class):
//   - image alone in a paragraph:                 ![alt](url)
//   - optional caption = an emphasis-only paragraph immediately AFTER (below) or BEFORE (above):  *caption*
//   - a LEFT-justified caption appends the attrs tag:  *caption*{.fig-caption-left}
// No DOM, no upload — fully unit-testable. The url is always the hosted MediaRef url at the call site,
// so the produced markdown structurally cannot carry base64 (ZERO base64).

export type FigureCaptionPosition = 'below' | 'above' | 'none'
export type FigureCaptionAlign = 'center' | 'left'

export interface BuildFigureMarkdownInput {
  /** Hosted image url (never a data: URI — the caller passes a Media Library MediaRef url). */
  url: string
  /** Alt text (required upstream; always written as ![alt](url)). */
  alt: string
  /** Optional caption text; an empty/whitespace caption is treated as "no caption". */
  caption?: string
  /** Caption placement relative to the image. 'none' (or an empty caption) → image only. */
  position: FigureCaptionPosition
  /** Caption alignment; 'left' appends the {.fig-caption-left} attrs tag. Ignored without a caption. */
  align: FigureCaptionAlign
}

/**
 * Build the figure markdown block for insertion at the cursor. Branches:
 *   - caption empty OR position 'none' → `![alt](url)\n`
 *   - 'below' → `![alt](url)\n\n*caption*` (+ `{.fig-caption-left}` when left) + `\n`
 *   - 'above' → `*caption*` (+ `{.fig-caption-left}` when left) + `\n\n![alt](url)\n`
 */
export function buildFigureMarkdown({ url, alt, caption, position, align }: BuildFigureMarkdownInput): string {
  const image = `![${alt}](${url})`
  const text = caption?.trim() ?? ''
  if (text.length === 0 || position === 'none') {
    return `${image}\n`
  }
  const captionMd = align === 'left' ? `*${text}*{.fig-caption-left}` : `*${text}*`
  if (position === 'above') {
    return `${captionMd}\n\n${image}\n`
  }
  // 'below' (default)
  return `${image}\n\n${captionMd}\n`
}
