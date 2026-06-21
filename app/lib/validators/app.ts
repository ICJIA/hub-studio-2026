import type { App } from '~/types/content'
import { containsBase64 } from '~/lib/base64-guard'
import { hasHostileScheme } from '~/lib/validators/url-scheme'
import type { FieldError } from '~/lib/validators/article'

export function validateApp(a: App): FieldError[] {
  const errors: FieldError[] = []
  if (!a.title?.trim()) errors.push({ field: 'title', message: 'Title is required.' })
  if (!a.slug?.trim()) errors.push({ field: 'slug', message: 'Slug is required.' })
  if (a.description && containsBase64(a.description)) {
    errors.push({ field: 'description', message: 'Embedded base64 images are not allowed; use a Media Library URL.' })
  }
  if (hasHostileScheme(a.url)) {
    errors.push({ field: 'url', message: 'That link type is not allowed; use an http(s) URL.' })
  }
  return errors
}
