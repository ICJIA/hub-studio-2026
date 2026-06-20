import { describe, it, expect } from 'vitest'
import { slugify } from '~/lib/slug'

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    expect(slugify('Crime In Illinois')).toBe('crime-in-illinois')
  })
  it('turns slashes into hyphens and strips punctuation', () => {
    expect(slugify('Courts / Crimes & Victims!')).toBe('courts-crimes-victims')
  })
  it('collapses repeats and trims leading/trailing hyphens', () => {
    expect(slugify('  --Hello   World--  ')).toBe('hello-world')
  })
})
