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
  const noStorage = storage == null // fixed at construction — never re-evaluated
  let reported = false // one-time onPersistFailure guard

  function reportOnce() {
    if (!reported) {
      reported = true
      opts.onPersistFailure?.()
    }
  }

  function read(key: string): ReviewAnnotation[] {
    if (noStorage) {
      reportOnce() // report on first use, not eagerly at construction
      return memory.get(key) ?? []
    }
    let raw: string | null
    try {
      raw = storage!.getItem(key)
    } catch {
      reportOnce()
      return memory.get(key) ?? []
    }
    // Once a persist failure has been reported, a memory entry for this key is session
    // truth that may be newer than (or diverged from) whatever storage still holds —
    // prefer it. Keys never touched this session fall through to storage as usual.
    if (reported && memory.has(key)) return memory.get(key)!
    if (!raw) return memory.get(key) ?? []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ReviewAnnotation[]) : []
    } catch {
      // Corrupt JSON is a data problem, not a persistence failure — no reportOnce().
      return []
    }
  }

  function write(key: string, list: ReviewAnnotation[]): void {
    memory.set(key, list) // memory mirror keeps the session consistent either way
    if (noStorage) {
      reportOnce()
      return
    }
    try {
      storage!.setItem(key, JSON.stringify(list))
    } catch {
      reportOnce() // keep attempting on future writes — persistence may recover
    }
  }

  /** Find the storage key + list containing an annotation id. Scans the memory mirror
   *  first (authoritative for anything touched this session), then any persisted keys
   *  under our prefix — the storage scan runs even after a reported persist failure,
   *  since storage may still hold pre-existing data that was never warmed into memory. */
  function locate(id: string): { key: string; list: ReviewAnnotation[]; index: number } | null {
    for (const [key, list] of memory) {
      const index = list.findIndex((a) => a.id === id)
      if (index !== -1) return { key, list: [...list], index }
    }
    if (!noStorage) {
      try {
        for (let i = 0; i < storage!.length; i++) {
          const key = storage!.key(i)
          if (!key || !key.startsWith(ANNOTATIONS_STORAGE_PREFIX)) continue
          const list = read(key)
          const index = list.findIndex((a) => a.id === id)
          if (index !== -1) return { key, list, index }
        }
      } catch {
        reportOnce()
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
