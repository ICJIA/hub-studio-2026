import { describe, it, expect, vi } from 'vitest'
import { uploadFile, listMediaFiles, deleteMediaFile } from '~/lib/upload'
import type { $Fetch } from 'ofetch'

// A raw uploaded-file object as returned directly by POST /upload (array) and GET /upload/files.
const rawFile = {
  id: 42,
  documentId: 'updoc42',
  name: 'figure.png',
  url: '/uploads/figure_abc123.png',
  mime: 'image/png',
  ext: '.png',
  size: 12.3,
  width: 800,
  height: 600,
  formats: { thumbnail: { url: '/uploads/thumbnail_figure_abc123.png' } },
  alternativeText: 'Bar chart of outcomes',
  caption: 'Figure 1.',
}

describe('uploadFile', () => {
  it('POSTs /upload with FormData carrying files + a fileInfo with alt/caption, and returns a url-based MediaRef', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const file = new File(['x'], 'figure.png', { type: 'image/png' })

    const ref = await uploadFile(api, file, { alternativeText: 'Bar chart of outcomes', caption: 'Figure 1.' })

    // Endpoint + method.
    const [url, opts] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload')
    expect(opts.method).toBe('POST')

    // Body is a FormData with `files` and a `fileInfo` JSON string holding alt + caption.
    const body = opts.body as FormData
    expect(body).toBeInstanceOf(FormData)
    expect(body.get('files')).toBeInstanceOf(File)
    const fileInfo = JSON.parse(body.get('fileInfo') as string)
    expect(fileInfo).toEqual({ alternativeText: 'Bar chart of outcomes', caption: 'Figure 1.' })

    // Returns a MediaRef whose src is a Media Library URL — never a data: URI.
    expect(ref.id).toBe(42)
    expect(ref.url).toBe('/uploads/figure_abc123.png')
    expect(ref.url.startsWith('data:')).toBe(false)
    expect(ref.alternativeText).toBe('Bar chart of outcomes')
    expect(ref.caption).toBe('Figure 1.')
  })

  it('omits fileInfo entirely when no info is supplied', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    await uploadFile(api, new File(['x'], 'figure.png', { type: 'image/png' }))
    const body = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as FormData
    expect(body.has('fileInfo')).toBe(false)
  })

  it('uses an explicit filename for a Blob (the SVG re-wrap path)', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    await uploadFile(api, new Blob(['<svg/>'], { type: 'image/svg+xml' }), undefined, 'drawing.svg')
    const body = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as FormData
    const sent = body.get('files') as File
    expect(sent.name).toBe('drawing.svg')
  })
})

describe('listMediaFiles', () => {
  it('GETs /upload/files with pagination, search filter, and DESC sort, mapping the plain array', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const refs = await listMediaFiles(api, { page: 2, pageSize: 24, search: 'figure' })

    const [url, opts] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload/files')
    expect(opts.query).toEqual({
      'pagination[page]': 2,
      'pagination[pageSize]': 24,
      'filters[name][$containsi]': 'figure',
      sort: 'createdAt:DESC',
    })
    expect(refs).toHaveLength(1)
    expect(refs[0].url).toBe('/uploads/figure_abc123.png')
    expect(refs[0].url.startsWith('data:')).toBe(false)
  })

  it('omits the name filter when no search term is given', async () => {
    const api = vi.fn().mockResolvedValue([]) as unknown as $Fetch
    await listMediaFiles(api)
    const opts = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(opts.query['filters[name][$containsi]']).toBeUndefined()
    expect(opts.query.sort).toBe('createdAt:DESC')
  })
})

describe('deleteMediaFile', () => {
  it('DELETEs /upload/files/:id', async () => {
    const api = vi.fn().mockResolvedValue({}) as unknown as $Fetch
    await deleteMediaFile(api, 42)
    expect(api).toHaveBeenCalledWith('/upload/files/42', { method: 'DELETE' })
  })
})
