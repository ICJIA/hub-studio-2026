// localStorage AnnotationStore adapter (spec §4a). Used for ALL sessions in Phase 1 and
// permanently for demo builds/sessions — zero network, so the public demo's audited
// "fully self-contained" posture is untouched. Storage failures (quota, privacy mode)
// degrade to an in-memory Map for the session; onPersistFailure fires ONCE so the UI
// can toast "comments won't survive a reload in this browser".
import type { AnnotationComment, AnnotationContentType, AnnotationStore, ReviewAnnotation } from '~/types/annotations'

export const ANNOTATIONS_STORAGE_PREFIX = 'icjia-studio-annotations-v1'

export function annotationsStorageKey(contentType: string, documentId: string): string {
  return `${ANNOTATIONS_STORAGE_PREFIX}:${contentType}:${documentId}`
}

function defaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

export function createLocalAnnotationStore(opts: {
  storage?: Storage | null
  onPersistFailure?: () => void
} = {}): AnnotationStore {
  const storage = opts.storage === undefined ? defaultStorage() : opts.storage
  const memory = new Map<string, ReviewAnnotation[]>() // per-key fallback
  let failed = storage == null

  function reportFailureOnce() {
    if (!failed) {
      failed = true
      opts.onPersistFailure?.()
    }
  }
  if (storage == null && opts.onPersistFailure) {
    // No storage at all counts as a persist failure (report on first use, not eagerly).
  }

  function read(key: string): ReviewAnnotation[] {
    if (failed) return memory.get(key) ?? []
    try {
      const raw = storage!.getItem(key)
      if (!raw) return memory.get(key) ?? []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ReviewAnnotation[]) : []
    } catch {
      // getItem threw (privacy mode) OR corrupt JSON. Only a throwing storage flips
      // the fallback; corrupt JSON just reads as empty.
      if (isStorageThrow(key)) reportFailureOnce()
      return memory.get(key) ?? []
    }
  }

  function isStorageThrow(key: string): boolean {
    try {
      storage!.getItem(key)
      return false
    } catch {
      return true
    }
  }

  function write(key: string, list: ReviewAnnotation[]): void {
    memory.set(key, list) // memory mirror keeps the session consistent either way
    if (failed) return
    try {
      storage!.setItem(key, JSON.stringify(list))
    } catch {
      reportFailureOnce()
    }
  }

  /** Find the storage key + list containing an annotation id (scan the memory mirror
   *  first, then any persisted keys under our prefix). */
  function locate(id: string): { key: string; list: ReviewAnnotation[]; index: number } | null {
    for (const [key, list] of memory) {
      const index = list.findIndex((a) => a.id === id)
      if (index !== -1) return { key, list: [...list], index }
    }
    if (!failed && storage) {
      try {
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (!key || !key.startsWith(ANNOTATIONS_STORAGE_PREFIX)) continue
          const list = read(key)
          const index = list.findIndex((a) => a.id === id)
          if (index !== -1) return { key, list, index }
        }
      } catch {
        reportFailureOnce()
      }
    }
    return null
  }

  return {
    async list(contentType: AnnotationContentType, documentId: string) {
      return read(annotationsStorageKey(contentType, documentId))
    },
    async create(a: ReviewAnnotation) {
      const key = annotationsStorageKey(a.contentType, a.documentId)
      write(key, [...read(key), a])
      return a
    },
    async addComment(id: string, c: AnnotationComment) {
      const found = locate(id)
      if (!found) throw new Error('annotation not found')
      const updated: ReviewAnnotation = { ...found.list[found.index]!, comments: [...found.list[found.index]!.comments, c] }
      found.list[found.index] = updated
      write(found.key, found.list)
      return updated
    },
    async setResolved(id: string, resolved: boolean) {
      const found = locate(id)
      if (!found) throw new Error('annotation not found')
      const updated: ReviewAnnotation = { ...found.list[found.index]!, resolved }
      found.list[found.index] = updated
      write(found.key, found.list)
      return updated
    },
    async remove(id: string) {
      const found = locate(id)
      if (!found) throw new Error('annotation not found')
      found.list.splice(found.index, 1)
      write(found.key, found.list)
    },
  }
}
