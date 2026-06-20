import type { Article } from '~/types/content'
import { ARTICLE_TYPE_OPTIONS } from '~/lib/field-options'
import { containsBase64 } from '~/lib/base64-guard'

export interface FieldError { field: string; message: string }

export function validateArticle(a: Article): FieldError[] {
  const errors: FieldError[] = []
  if (!a.title?.trim()) errors.push({ field: 'title', message: 'Title is required.' })
  if (!a.slug?.trim()) errors.push({ field: 'slug', message: 'Slug is required.' })
  if (!a.date) errors.push({ field: 'date', message: 'Date is required.' })
  if (a.type && !(ARTICLE_TYPE_OPTIONS as readonly string[]).includes(a.type)) {
    errors.push({ field: 'type', message: `Type must be one of: ${ARTICLE_TYPE_OPTIONS.join(', ')}.` })
  }
  if (a.images.some((img) => containsBase64(img.src))) {
    errors.push({ field: 'images', message: 'Images must reference a Media Library URL, never base64.' })
  }
  if (containsBase64(a.markdown)) {
    errors.push({ field: 'markdown', message: 'Embedded base64 images are not allowed; upload to the Media Library and use its URL.' })
  }
  return errors
}
