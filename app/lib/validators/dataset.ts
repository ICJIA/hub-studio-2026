import type { Dataset } from '~/types/content'
import { UNIT_OPTIONS, TIMEPERIOD_TYPE_OPTIONS } from '~/lib/field-options'
import { containsBase64 } from '~/lib/base64-guard'
import type { FieldError } from '~/lib/validators/article'

export function validateDataset(d: Dataset): FieldError[] {
  const errors: FieldError[] = []
  if (!d.title?.trim()) errors.push({ field: 'title', message: 'Title is required.' })
  if (!d.slug?.trim()) errors.push({ field: 'slug', message: 'Slug is required.' })
  if (!d.date) errors.push({ field: 'date', message: 'Date is required.' })
  if (d.unit && !(UNIT_OPTIONS as readonly string[]).includes(d.unit)) {
    errors.push({ field: 'unit', message: `Unit must be one of: ${UNIT_OPTIONS.join(', ')}.` })
  }
  if (d.timeperiod && !(TIMEPERIOD_TYPE_OPTIONS as readonly string[]).includes(d.timeperiod.yeartype)) {
    errors.push({ field: 'timeperiod', message: `Time-period type must be one of: ${TIMEPERIOD_TYPE_OPTIONS.join(', ')}.` })
  }
  if (d.description && containsBase64(d.description)) {
    errors.push({ field: 'description', message: 'Embedded base64 images are not allowed; use a Media Library URL.' })
  }
  return errors
}
