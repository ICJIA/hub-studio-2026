import { describe, it, expect, vi } from 'vitest'
import { buildImageMarkdown, handleImageFiles, provisionalAltFromName, type InsertedImage } from '~/lib/editor/image-insert'
import { containsBase64 } from '~/lib/base64-guard'
import type { MediaRef } from '~/types/content'

const withAlt: MediaRef = {
  id: 7, url: '/uploads/chart_xyz.png', name: 'chart.png',
  alternativeText: 'Outcome chart', caption: 'Figure 2.', width: 640, height: 480, mime: 'image/png',
}
const noAlt: MediaRef = {
  id: 8, url: '/uploads/screenshot_abc.png', name: 'screenshot.png',
  alternativeText: null, caption: null, width: 100, height: 100, mime: 'image/png',
}

describe('provisionalAltFromName', () => {
  it('strips path + extension and turns separators into spaces', () => {
    expect(provisionalAltFromName('chart_q3-final.png')).toBe('chart q3 final')
    expect(provisionalAltFromName('/tmp/My.Photo.JPG')).toBe('My Photo')
  })
})

describe('buildImageMarkdown', () => {
  it('uses the ref alt + caption, and the alt offsets bound the alt text', () => {
    const { markdown, altStart, altEnd } = buildImageMarkdown(withAlt)
    expect(markdown).toBe('![Outcome chart](/uploads/chart_xyz.png "Figure 2.")')
    expect(markdown.slice(altStart, altEnd)).toBe('Outcome chart')
    expect(containsBase64(markdown)).toBe(false)
  })

  it('falls back to a filename-derived alt when the ref has none (never empty ![])', () => {
    const { markdown, altStart, altEnd } = buildImageMarkdown(noAlt, 'crime_q3.png')
    expect(markdown).toBe('![crime q3](/uploads/screenshot_abc.png)')
    expect(markdown.slice(altStart, altEnd)).toBe('crime q3')
    expect(markdown).not.toMatch(/!\[\]/)
  })
})

describe('handleImageFiles (DI core)', () => {
  it('uploads each file and inserts a url-based snippet — NEVER data:', async () => {
    const upload = vi.fn().mockResolvedValue(withAlt)
    const inserted: InsertedImage[] = []
    const insert = (img: InsertedImage) => inserted.push(img)

    const files = [new File(['x'], 'a.png', { type: 'image/png' }), new File(['y'], 'b.png', { type: 'image/png' })]
    await handleImageFiles(files, upload, insert)

    expect(upload).toHaveBeenCalledTimes(2)
    expect(upload).toHaveBeenNthCalledWith(1, files[0])
    expect(inserted).toHaveLength(2)
    for (const img of inserted) {
      expect(img.markdown).toMatch(/\/uploads\//)
      expect(img.markdown.startsWith('![')).toBe(true)
      expect(containsBase64(img.markdown)).toBe(false)
      expect(img.markdown).not.toMatch(/data:/)
    }
  })

  it('uses the file name as the provisional-alt source when the upload returns no alt', async () => {
    const upload = vi.fn().mockResolvedValue(noAlt)
    const inserted: InsertedImage[] = []
    await handleImageFiles([new File(['x'], 'quarterly_report.png', { type: 'image/png' })], upload, (img) => inserted.push(img))
    expect(inserted[0]!.markdown).toBe('![quarterly report](/uploads/screenshot_abc.png)')
    expect(inserted[0]!.markdown.slice(inserted[0]!.altStart, inserted[0]!.altEnd)).toBe('quarterly report')
  })
})
