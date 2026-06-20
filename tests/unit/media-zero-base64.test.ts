import { describe, it, expect, vi } from 'vitest'
import { uploadFile, listMediaFiles } from '~/lib/upload'
import { toMarkdown } from '~/components/image-markdown'
import { containsBase64 } from '~/lib/base64-guard'
import type { $Fetch } from 'ofetch'

const rawFile = {
  id: 1, documentId: 'd', name: 'a.png', url: '/uploads/a_123.png', mime: 'image/png',
  alternativeText: 'Alt', caption: 'Cap',
}

describe('media layer never yields base64 into state/markdown', () => {
  it('uploadFile produces a MediaRef the base64 guard accepts (url, not data:)', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const ref = await uploadFile(api, new File(['x'], 'a.png', { type: 'image/png' }))
    expect(containsBase64(ref)).toBe(false)
    expect(ref.url.startsWith('data:')).toBe(false)
  })

  it('listMediaFiles produces only url-based refs', async () => {
    const api = vi.fn().mockResolvedValue([rawFile, { ...rawFile, id: 2, url: '/uploads/b_456.png' }]) as unknown as $Fetch
    const refs = await listMediaFiles(api)
    expect(containsBase64(refs)).toBe(false)
  })

  it('the inserted markdown snippet carries a url, never base64', async () => {
    const api = vi.fn().mockResolvedValue([rawFile]) as unknown as $Fetch
    const ref = await uploadFile(api, new File(['x'], 'a.png', { type: 'image/png' }))
    const snippet = toMarkdown(ref)
    expect(snippet).toMatch(/\/uploads\//)
    expect(containsBase64(snippet)).toBe(false)
  })
})
