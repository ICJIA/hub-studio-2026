// app/lib/text-excerpt.ts
// Markdown → one clean prose excerpt, for surfaces that show a text preview (the content
// list's card view). NOT a renderer and never emits HTML — it strips the common markdown
// tokens the Studio's abstracts/descriptions use and collapses whitespace, so the result
// is safe to interpolate as plain text.

export function plainExcerpt(source: string | null | undefined, maxLength: number): string {
  if (!source) return ''
  const text = source
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // images (before links — same bracket shape)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')     // links → their label
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')       // inline/fenced code markers
    .replace(/^#{1,6}\s+/gm, '')                 // heading markers
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')     // list markers
    .replace(/^\s*>\s?/gm, '')                   // blockquote markers
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // emphasis/strikethrough
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength)
  const atWord = cut.includes(' ') ? cut.slice(0, cut.lastIndexOf(' ')) : cut
  return `${atWord.replace(/[,;:.\s]+$/, '')}…`
}
