// Reactive orchestration for reviewer annotations on the preview page (spec §4, §7).
// Adapter seam: Phase 1 is localStorage for every session. Phase 2 swaps in the Strapi
// repository adapter for real (non-demo) sessions right here — `isDemoData()` keeps
// demo builds on localStorage forever:
//   const store = isDemoData() ? createLocalAnnotationStore(...) : createStrapiAnnotationStore(...)
import { ref } from '#imports'
import type { AnnotationAnchor, AnnotationColor, AnnotationContentType, ReviewAnnotation } from '~/types/annotations'
import { createLocalAnnotationStore } from '~/lib/annotations/store-local'
import { annotationAuthor, type AnnotationAuthor } from '~/lib/annotations/attribution'
import { isDemoSession } from '~/lib/demo'
import { useAuthStore } from '~/stores/auth'

export function useAnnotations(contentType: AnnotationContentType, documentId: string) {
  const auth = useAuthStore()
  const toast = useToast()

  const store = createLocalAnnotationStore({
    onPersistFailure: () => toast.add({
      title: 'Comments are session-only in this browser',
      description: 'Storage is unavailable, so review comments will not survive a reload.',
      color: 'warning',
    }),
  })

  const annotations = ref<ReviewAnnotation[]>([])
  const loading = ref(true)

  function author(): AnnotationAuthor {
    return annotationAuthor({
      displayName: auth.displayName,
      email: auth.user?.email,
      canPublish: auth.canPublish,
      demo: isDemoSession(),
    })
  }

  async function load() {
    annotations.value = await store.list(contentType, documentId)
    loading.value = false
  }

  function replaceOne(updated: ReviewAnnotation) {
    annotations.value = annotations.value.map((a) => (a.id === updated.id ? updated : a))
  }

  async function createAnnotation(anchor: AnnotationAnchor, color: AnnotationColor, body: string): Promise<ReviewAnnotation> {
    const by = author()
    const now = new Date().toISOString()
    const a: ReviewAnnotation = {
      id: crypto.randomUUID(),
      contentType, documentId, anchor, color,
      resolved: false, createdAt: now,
      createdBy: by,
      comments: [{ id: crypto.randomUUID(), body, authorName: by.name, authorEmail: by.email, createdAt: now }],
    }
    await store.create(a)
    annotations.value = [...annotations.value, a]
    return a
  }

  async function reply(id: string, body: string) {
    const by = author()
    replaceOne(await store.addComment(id, {
      id: crypto.randomUUID(), body, authorName: by.name, authorEmail: by.email, createdAt: new Date().toISOString(),
    }))
  }

  async function setResolved(id: string, resolved: boolean) {
    replaceOne(await store.setResolved(id, resolved))
  }

  async function removeAnnotation(id: string) {
    await store.remove(id)
    annotations.value = annotations.value.filter((a) => a.id !== id)
  }

  return { annotations, loading, load, createAnnotation, reply, setResolved, removeAnnotation, author }
}
