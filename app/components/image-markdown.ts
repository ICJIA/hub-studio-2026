// Build the inline-figure markdown snippet from a Media Library reference (design spec §7.3).
// The `src` is ALWAYS a Media Library url — never base64. Caption becomes the optional title.
import type { MediaRef } from '~/types/content'

export function toMarkdown(ref: MediaRef): string {
  const alt = ref.alternativeText ?? ''
  const caption = ref.caption?.trim()
  return caption
    ? `![${alt}](${ref.url} "${caption}")`
    : `![${alt}](${ref.url})`
}
