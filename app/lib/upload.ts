// Strapi Upload API, pure DI (mirrors lib/repository.ts: $Fetch is injected as `api`).
// Validated against the live sandbox 2026-06-20:
//   - POST /upload (multipart FormData; field `files` + optional `fileInfo` JSON) → 201,
//     returns the file object(s) DIRECTLY as an ARRAY (take [0] for a single upload).
//     `fileInfo` = JSON.stringify({ alternativeText, caption, name? }) sets alt + caption at upload time.
//   - GET /upload/files → a PLAIN ARRAY of file objects (pagination[*], filters[name][$containsi], sort).
//   - DELETE /upload/files/:id → 200.
// Endpoints are /upload + /upload/files (NOT /api/upload). The returned file maps through
// mediaFromStrapi → MediaRef, whose `url` is a Media Library URL (NEVER a data: URI).
import type { $Fetch } from 'ofetch'
import type { MediaRef } from '~/types/content'
import { mediaFromStrapi, type StrapiMedia } from '~/lib/strapi-rest'

export interface UploadInfo {
  alternativeText?: string
  caption?: string
  name?: string
}

export interface BrowseOptions {
  page?: number
  pageSize?: number
  search?: string
}

/**
 * Upload one file/blob to the Media Library. Appends `files` and (when `info` is given)
 * a `fileInfo` JSON field that sets alt + caption at upload time. `filename` overrides the
 * multipart filename — needed when uploading a Blob (e.g. the sanitized-SVG re-wrap) that
 * carries no name. Returns a MediaRef (numeric id for writes + url for display).
 */
export async function uploadFile(
  api: $Fetch,
  file: File | Blob,
  info?: UploadInfo,
  filename?: string,
): Promise<MediaRef> {
  const form = new FormData()
  if (filename) form.append('files', file, filename)
  else form.append('files', file)
  if (info) form.append('fileInfo', JSON.stringify(info))

  const res = await api<StrapiMedia[]>('/upload', { method: 'POST', body: form })
  const ref = mediaFromStrapi(res[0])
  if (!ref) throw new Error('Upload succeeded but returned no file.')
  return ref
}

/** Browse the Media Library (paginated, optional name search, newest first). */
export async function listMediaFiles(api: $Fetch, opts: BrowseOptions = {}): Promise<MediaRef[]> {
  const res = await api<StrapiMedia[]>('/upload/files', {
    query: {
      'pagination[page]': opts.page,
      'pagination[pageSize]': opts.pageSize,
      'filters[name][$containsi]': opts.search,
      sort: 'createdAt:DESC',
    },
  })
  return res.map((m) => mediaFromStrapi(m)).filter((r): r is MediaRef => r !== null)
}

/**
 * Update alt/caption (fileInfo) on an EXISTING Media Library file. Strapi 5 upload plugin:
 * POST /upload?id=<id> with a multipart `fileInfo` part and no `files` part updates metadata
 * in place. Response is the updated file object (handled defensively as object-or-array).
 * NOTE: request shape follows the Strapi 5 upload REST contract; verify against the live
 * sandbox at first staging use (runbook §Strapi checklist carries the permission + check).
 */
export async function updateFileInfo(api: $Fetch, id: number, info: UploadInfo): Promise<MediaRef> {
  const form = new FormData()
  form.append('fileInfo', JSON.stringify(info))
  const res = await api<StrapiMedia | StrapiMedia[]>(`/upload?id=${id}`, { method: 'POST', body: form })
  const ref = mediaFromStrapi(Array.isArray(res) ? res[0] : res)
  if (!ref) throw new Error('Update succeeded but returned no file.')
  return ref
}

/** Remove a file from the Media Library by its numeric id. */
export async function deleteMediaFile(api: $Fetch, id: number): Promise<void> {
  await api(`/upload/files/${id}`, { method: 'DELETE' })
}
