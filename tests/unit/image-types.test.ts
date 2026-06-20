import { describe, it, expect } from 'vitest'
import { ALLOWED_IMAGE_EXTENSIONS, hasAllowedImageExtension } from '~/lib/image-types'

describe('ALLOWED_IMAGE_EXTENSIONS', () => {
  it('is exactly jpg, jpeg, png, svg', () => {
    expect(ALLOWED_IMAGE_EXTENSIONS).toEqual(['jpg', 'jpeg', 'png', 'svg'])
  })
})

describe('hasAllowedImageExtension', () => {
  it('accepts jpg/jpeg/png/svg, case-insensitively', () => {
    for (const u of ['/uploads/a.jpg', '/uploads/a.JPEG', 'b.png', 'c.SVG', 'https://x/y.jpeg'])
      expect(hasAllowedImageExtension(u)).toBe(true)
  })
  it('ignores query strings and hash fragments', () => {
    expect(hasAllowedImageExtension('/uploads/a.png?width=100')).toBe(true)
    expect(hasAllowedImageExtension('/uploads/a.svg#frag')).toBe(true)
  })
  it('rejects other or missing extensions', () => {
    for (const u of ['/uploads/a.gif', 'a.webp', 'a.bmp', 'noext', '/uploads/'])
      expect(hasAllowedImageExtension(u)).toBe(false)
  })
})
