// app/repositories/annotations.ts
// Content-Manager repository for api::review-annotation.review-annotation (spec §4b) — the
// same generic repository the content types use; no relations to hydrate. Consumed by the
// Strapi AnnotationStore adapter (lib/annotations/store-strapi.ts), not by pages directly.
import type { $Fetch } from 'ofetch'
import { createRepository, type Repository } from '~/lib/repository'
import { annotationFromStrapi, annotationToWrite, type StrapiReviewAnnotation, type StrapiReviewAnnotationWrite } from '~/lib/mappers/annotation'
import type { ReviewAnnotation } from '~/types/annotations'

export const REVIEW_ANNOTATION_UID = 'api::review-annotation.review-annotation'

export function createAnnotationsRepository(api: $Fetch): Repository<ReviewAnnotation> {
  return createRepository<StrapiReviewAnnotation, ReviewAnnotation, StrapiReviewAnnotationWrite>({
    api, uid: REVIEW_ANNOTATION_UID, relationFields: [],
    fromStrapi: annotationFromStrapi, toWrite: annotationToWrite,
  })
}
