import { describe, it, expect } from 'vitest'
import { blankStudioProfile, validateStudioProfile } from '~/lib/studio-profile-form'

describe('blankStudioProfile', () => {
  it('returns an empty profile, prefilling the author email', () => {
    const p = blankStudioProfile('author@icjia.illinois.gov')
    expect(p.documentId).toBe('')
    expect(p.authorEmail).toBe('author@icjia.illinois.gov')
    expect(p.reviewers).toEqual([])
    expect(p.center).toBe('')
    expect(p.publishedAt).toBeNull()
  })
})

describe('validateStudioProfile', () => {
  const ok = { documentId: '', authorEmail: 'author@icjia.illinois.gov', reviewers: ['mgr@icjia.illinois.gov'], center: 'Research & Analysis', publishedAt: null }

  it('passes a complete, valid profile', () => {
    expect(validateStudioProfile(ok)).toEqual([])
  })

  it('requires at least one reviewer', () => {
    const errs = validateStudioProfile({ ...ok, reviewers: [] })
    expect(errs.some((e) => e.field === 'reviewers')).toBe(true)
  })

  it('rejects an invalid reviewer email', () => {
    const errs = validateStudioProfile({ ...ok, reviewers: ['mgr@icjia.illinois.gov', 'not-an-email'] })
    expect(errs.some((e) => e.field === 'reviewers')).toBe(true)
  })

  it('requires a center', () => {
    const errs = validateStudioProfile({ ...ok, center: '' })
    expect(errs.some((e) => e.field === 'center')).toBe(true)
  })

  it('requires the author email', () => {
    const errs = validateStudioProfile({ ...ok, authorEmail: '' })
    expect(errs.some((e) => e.field === 'authorEmail')).toBe(true)
  })
})
