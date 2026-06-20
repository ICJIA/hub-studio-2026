// The zero-base64 invariant (design spec §7, §13). Every image must be a Media Library
// reference; a base64 `data:...;base64,...` blob must never enter a write payload.
const BASE64_DATA_URI = /data:[^;,\s]*;base64,/i

export function containsBase64(value: unknown): boolean {
  if (typeof value === 'string') return BASE64_DATA_URI.test(value)
  if (Array.isArray(value)) return value.some(containsBase64)
  if (value && typeof value === 'object') return Object.values(value).some(containsBase64)
  return false
}

export function assertNoBase64(value: unknown, label = 'content'): void {
  if (containsBase64(value)) {
    throw new Error(
      `Base64 image data is not allowed in ${label}. Upload the image to the Media Library and reference its URL instead.`,
    )
  }
}
