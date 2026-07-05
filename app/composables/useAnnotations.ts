// Reactive orchestration for reviewer annotations on the preview page (spec §4, §7).
// Adapter seam (spec §4b): demo builds and dev/demo sessions stay on localStorage forever
// (isDemoData — the public demo's zero-network audit posture is untouched); a real signed-in
// session gets the Strapi adapter, so threads are shared across every reviewer and device.
import { ref } from '#imports'
import type { $Fetch } from 'ofetch'
import type { AnnotationAnchor, AnnotationColor, AnnotationContentType, AnnotationStore, ReviewAnnotation } from '~/types/annotations'
import { createLocalAnnotationStore } from '~/lib/annotations/store-local'
import { createStrapiAnnotationStore } from '~/lib/annotations/store-strapi'
import { annotationAuthor, type AnnotationAuthor } from '~/lib/annotations/attribution'
import { isDemoData, isDemoSession } from '~/lib/demo'
import { useAuthStore } from '~/stores/auth'

export function useAnnotations(contentType: AnnotationContentType, documentId: string) {
  const auth = useAuthStore()
  const toast = useToast()

  const store: AnnotationStore = isDemoData()
    ? createLocalAnnotationStore({
        onPersistFailure: () => toast.add({
          title: 'Comments are session-only in this browser',
          description: 'Storage is unavailable, so review comments will not survive a reload.',
          color: 'warning',
        }),
      })
    : createStrapiAnnotationStore(useNuxtApp().$api as $Fetch)

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
    // Keep the STORE's returned row, not the local draft: the Strapi adapter comes back with
    // the server-assigned id (the localStorage adapter returns the same object — identity).
    const created = await store.create(a)
    annotations.value = [...annotations.value, created]
    return created
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
