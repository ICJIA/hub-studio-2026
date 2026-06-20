// Ported from v1 slug semantics (design spec §10): lowercase, spaces/slashes → '-',
// strip non-word chars, collapse repeats, trim hyphens.
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[\s/]+/g, '-')   // spaces and slashes → hyphen
    .replace(/[^\w-]+/g, '')    // strip anything not a word char or hyphen
    .replace(/-+/g, '-')        // collapse repeated hyphens
    .replace(/^-+|-+$/g, '')    // trim leading/trailing hyphens
}
