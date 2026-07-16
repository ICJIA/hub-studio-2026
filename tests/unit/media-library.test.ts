import { describe, it, expect, vi } from 'vitest'
import { createStrapiMediaLibrary, DEFAULT_MEDIA_PAGE_SIZE } from '~/lib/media-library'
import type { $Fetch } from 'ofetch'

const rawFile = {
  id: 7, name: 'photo.jpg', url: '/uploads/photo_1a2b3c.jpg', mime: 'image/jpeg',
  alternativeText: 'A photo', caption: null, width: 640, height: 480,
}

describe('createStrapiMediaLibrary', () => {
  it('list delegates to /upload/files with the default page size of 20', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const lib = createStrapiMediaLibrary(api)
    const refs = await lib.list({ search: 'photo' })
    const [url, opts] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload/files')
    expect(opts.query['pagination[pageSize]']).toBe(DEFAULT_MEDIA_PAGE_SIZE)
    expect(opts.query['filters[name][$containsi]']).toBe('photo')
    expect(refs[0]!.id).toBe(7)
  })

  it('an explicit pageSize wins over the default', async () => {
    const api = vi.fn().mockResolvedValue([]) as unknown as $Fetch
    await createStrapiMediaLibrary(api).list({ pageSize: 5 })
    const opts = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1]
    expect(opts.query['pagination[pageSize]']).toBe(5)
  })

  it('upload delegates to POST /upload', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const ref = await createStrapiMediaLibrary(api).upload(file, { alternativeText: 'A photo' })
    const [url, opts] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload')
    expect(opts.method).toBe('POST')
    expect(ref.id).toBe(7)
  })

  it('updateInfo delegates to POST /upload?id=<id>', async () => {
    const api = vi.fn().mockResolvedValue(rawFile) as unknown as $Fetch
    const ref = await createStrapiMediaLibrary(api).updateInfo(7, { alternativeText: 'Better alt' })
    const [url] = (api as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/upload?id=7')
    expect(ref.id).toBe(7)
  })

  it('the injectable write guard blocks upload and updateInfo BEFORE any network call', async () => {
    const api = vi.fn() as unknown as $Fetch
    const guard = () => { throw new Error('Demo mode: writes are disabled') }
    const lib = createStrapiMediaLibrary(api, guard)
    await expect(lib.upload(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).rejects.toThrow(/writes are disabled/)
    await expect(lib.updateInfo(7, { alternativeText: 'X' })).rejects.toThrow(/writes are disabled/)
    expect(api).not.toHaveBeenCalled()
  })

  it('the guard does NOT gate reads', async () => {
    const api = vi.fn().mockResolvedValue([]) as unknown as $Fetch
    const guard = () => { throw new Error('Demo mode: writes are disabled') }
    await expect(createStrapiMediaLibrary(api, guard).list()).resolves.toEqual([])
  })
})
