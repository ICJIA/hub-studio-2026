// app/lib/draft-backup.ts
// Local draft backup (analysis-roadmap §5.3-4): the pure storage half of the unsaved-work
// guard. One snapshot per draft, keyed by content type + documentId ('new' for create mode),
// in localStorage. FAIL-OPEN everywhere: a full, blocked, or absent store must never break
// editing — writes skip with one console.warn; corrupt payloads read as null. The store is
// injectable so unit tests run without a browser. Clock-free: callers pass savedAt.
// Demo policy (spec §2): the CALLER (useDraftGuard) skips snapshots entirely in demo mode —
// this lib is mode-agnostic.
export interface DraftSnapshot<T> {
  model: T
  savedAt: string
  type: string
  documentId: string
}

export interface BackupStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const KEY_PREFIX = 'icjia-studio-draft-backup'

/** ~1 MB per draft — far above any real article, far below the localStorage budget. */
export const DRAFT_BACKUP_MAX_BYTES = 1_000_000

export function backupKey(type: string, documentId: string | null): string {
  return `${KEY_PREFIX}:${type}:${documentId ?? 'new'}`
}

function defaultStore(): BackupStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null // privacy modes can throw on ACCESS — treat as absent
  }
}

/** Write one snapshot. Returns false (and warns) instead of ever throwing. */
export function saveSnapshot<T>(
  type: string,
  documentId: string | null,
  model: T,
  savedAt: string,
  store: BackupStore | null = defaultStore(),
): boolean {
  if (!store) return false
  let payload: string
  try {
    payload = JSON.stringify({ model, savedAt, type, documentId: documentId ?? 'new' })
  } catch {
    console.warn('[draft-backup] snapshot not serializable — skipped')
    return false
  }
  if (payload.length > DRAFT_BACKUP_MAX_BYTES) {
    console.warn('[draft-backup] snapshot too large — skipped')
    return false
  }
  try {
    store.setItem(backupKey(type, documentId), payload)
    return true
  } catch (err) {
    console.warn('[draft-backup] write failed — skipped', err)
    return false
  }
}

/** Read one snapshot; corrupt or wrong-shaped payloads read as null. */
export function loadSnapshot<T>(
  type: string,
  documentId: string | null,
  store: BackupStore | null = defaultStore(),
): DraftSnapshot<T> | null {
  if (!store) return null
  let raw: string | null
  try {
    raw = store.getItem(backupKey(type, documentId))
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<DraftSnapshot<T>>
    if (!parsed || typeof parsed !== 'object' || parsed.model === undefined || typeof parsed.savedAt !== 'string') {
      return null
    }
    return parsed as DraftSnapshot<T>
  } catch {
    return null
  }
}

/** Remove one snapshot (no-op on any failure). */
export function clearSnapshot(
  type: string,
  documentId: string | null,
  store: BackupStore | null = defaultStore(),
): void {
  try {
    store?.removeItem(backupKey(type, documentId))
  } catch {
    // fail-open
  }
}
