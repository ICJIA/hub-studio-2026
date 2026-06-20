// The save-gate. submitForm runs the matching validator FIRST and only calls `persist` (the
// repo create/update) when validation returns no errors — this is where "validators run on
// every save / no base64 may reach a write" is enforced (the deferred hand-off from the data
// layer). prepareForCreate derives the slug from the title (create-only, spec §10).
import { slugify } from '~/lib/slug'
import type { FieldError } from '~/lib/validators/article'

export interface SubmitResult<T> { ok: boolean; errors: FieldError[]; saved?: T }

export async function submitForm<T>(
  model: T,
  validate: (m: T) => FieldError[],
  persist: (m: T) => Promise<T>,
): Promise<SubmitResult<T>> {
  const errors = validate(model)
  if (errors.length > 0) return { ok: false, errors }
  const saved = await persist(model)
  return { ok: true, errors: [], saved }
}

/** Create-only: derive the slug from the title. */
export function prepareForCreate<T extends { title: string; slug: string }>(model: T): T {
  return { ...model, slug: slugify(model.title) }
}
