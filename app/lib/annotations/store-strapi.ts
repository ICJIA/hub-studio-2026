// app/lib/annotations/store-strapi.ts
// Phase-2 AnnotationStore adapter (spec §4b): the same AnnotationStore contract the
// localStorage adapter implements, backed by the review-annotation content type through the
// Content-Manager admin API (signed-in admin JWT — the type is invisible to the public API).
// Selected by useAnnotations for real (non-demo) sessions; demo builds/sessions never load it.
//
// Concurrency posture (launch): addComment/setResolved re-fetch the fresh row and PUT the
// whole payload — two reviewers replying to the SAME thread in the same instant is
// last-write-wins. Cross-machine freshness = refetch on preview open + after every write.
import type { $Fetch } from 'ofetch'
import type { AnnotationComment, AnnotationContentType, AnnotationStore, ReviewAnnotation } from '~/types/annotations'
import { createAnnotationsRepository } from '~/repositories/annotations'
import { validateAnnotation } from '~/lib/validators/annotation'

/** Content-Manager page cap; list() sweeps every page so 100 is a batch size, not a limit. */
const PAGE_SIZE = 100

export function createStrapiAnnotationStore(api: $Fetch): AnnotationStore {
  const repo = createAnnotationsRepository(api)

  return {
    async list(contentType: AnnotationContentType, documentId: string) {
      const filters = { contentType: { $eq: contentType }, targetDocumentId: { $eq: documentId } }
      const all: ReviewAnnotation[] = []
      let page = 1
      // Sweep every page — an unusually thread-heavy draft must not silently truncate.
      for (;;) {
        const res = await repo.listPage({ page, pageSize: PAGE_SIZE, sort: 'createdAt:asc', filters })
        all.push(...res.items)
        if (page >= res.pageCount) break
        page += 1
      }
      return all
    },

    async create(a: ReviewAnnotation) {
      const errors = validateAnnotation(a)
      if (errors.length > 0) {
        throw new Error(`Invalid annotation: ${errors.map((e) => `${e.field} — ${e.message}`).join(' ')}`)
      }
      // The server row wins: Strapi assigns the documentId that becomes the annotation id.
      return repo.create(a)
    },

    async addComment(id: string, c: AnnotationComment) {
      const current = await repo.findOne(id)
      return repo.update(id, { ...current, comments: [...current.comments, c] })
    },

    async setResolved(id: string, resolved: boolean) {
      const current = await repo.findOne(id)
      return repo.update(id, { ...current, resolved })
    },

    async remove(id: string) {
      await repo.remove(id)
    },
  }
}
