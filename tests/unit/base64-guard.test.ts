import { describe, it, expect } from 'vitest'
import { containsBase64, assertNoBase64 } from '~/lib/base64-guard'

describe('containsBase64', () => {
  it('detects a data: image URI in a string', () => {
    expect(containsBase64('![x](data:image/png;base64,iVBORw0KGgo=)')).toBe(true)
  })
  it('allows ordinary Media Library URLs', () => {
    expect(containsBase64('/uploads/figure_abc123.png')).toBe(false)
    expect(containsBase64('https://v2.hub.icjia-api.cloud/uploads/x.png')).toBe(false)
  })
  it('scans nested arrays and objects', () => {
    expect(containsBase64({ images: [{ title: 'f', src: 'data:image/jpeg;base64,/9j/4AAQ' }] })).toBe(true)
    expect(containsBase64({ images: [{ title: 'f', src: '/uploads/f.jpg' }] })).toBe(false)
  })
})

describe('assertNoBase64', () => {
  it('throws with a helpful message on base64', () => {
    expect(() => assertNoBase64('data:image/png;base64,AAAA', 'markdown'))
      .toThrow(/markdown/)
  })
  it('does not throw on clean content', () => {
    expect(() => assertNoBase64({ src: '/uploads/ok.png' })).not.toThrow()
  })
})
