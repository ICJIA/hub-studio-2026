// @vitest-environment nuxt
import { describe, it, expect } from 'vitest'
import { prepareUpload } from '~/composables/useUpload'

describe('prepareUpload (extension gate + SVG sanitize, pre-upload)', () => {
  it('rejects a disallowed extension with a clear message', async () => {
    await expect(prepareUpload(new File(['x'], 'photo.gif', { type: 'image/gif' })))
      .rejects.toThrow(/jpg|jpeg|png|svg/i)
  })

  it('passes an allowed raster file through unchanged', async () => {
    const png = new File(['x'], 'figure.png', { type: 'image/png' })
    expect(await prepareUpload(png)).toBe(png)
  })

  it('sanitizes an SVG before upload, returning a cleaned image/svg+xml Blob', async () => {
    const dirty = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>'
    const out = await prepareUpload(new File([dirty], 'drawing.svg', { type: 'image/svg+xml' }))
    expect(out).not.toBe(undefined)
    expect(out.type).toBe('image/svg+xml')
    const text = await (out as Blob).text()
    expect(text).not.toMatch(/<script/i)
    expect(text).toMatch(/<rect/i)
  })
})
