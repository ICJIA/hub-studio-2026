import { describe, it, expect, vi } from 'vitest'
import { resolveHasProfile } from '~/lib/profile-gate'

describe('resolveHasProfile (FAIL-OPEN author profile check)', () => {
  it('returns null for a publisher (editors/super-admins are never gated; lookup not called)', async () => {
    const findByAuthorEmail = vi.fn()
    const out = await resolveHasProfile({ canPublish: true, email: 'editor@icjia.illinois.gov', findByAuthorEmail })
    expect(out).toBeNull()
    expect(findByAuthorEmail).not.toHaveBeenCalled()
  })

  it('returns null when the author has no email (cannot look up; do not gate)', async () => {
    const out = await resolveHasProfile({ canPublish: false, email: null, findByAuthorEmail: vi.fn() })
    expect(out).toBeNull()
  })

  it('returns false when an author lookup resolves with NO profile (the only state that gates)', async () => {
    const findByAuthorEmail = vi.fn().mockResolvedValue(null)
    const out = await resolveHasProfile({ canPublish: false, email: 'author@icjia.illinois.gov', findByAuthorEmail })
    expect(out).toBe(false)
    expect(findByAuthorEmail).toHaveBeenCalledWith('author@icjia.illinois.gov')
  })

  it('returns true when an author lookup resolves a profile', async () => {
    const findByAuthorEmail = vi.fn().mockResolvedValue({ documentId: 'p1' })
    const out = await resolveHasProfile({ canPublish: false, email: 'author@icjia.illinois.gov', findByAuthorEmail })
    expect(out).toBe(true)
  })

  it('FAIL-OPEN: returns null when the lookup THROWS (type missing / 404 / network) — never gates', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const findByAuthorEmail = vi.fn().mockRejectedValue(new Error('404 Not Found (studio-profile type does not exist)'))
    const out = await resolveHasProfile({ canPublish: false, email: 'author@icjia.illinois.gov', findByAuthorEmail })
    expect(out).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
