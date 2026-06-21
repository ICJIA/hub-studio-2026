import { describe, it, expect } from 'vitest'
import { resolveAuthRedirect } from '~/lib/guard'

// Default ctx: a logged-in AUTHOR (cannot publish) with a resolved-missing profile on a normal page.
const ctx = (over = {}) => ({
  path: '/', isPublic: false, isAdminOnly: false, isLoggedIn: true,
  canPublish: false, isAuthor: true, hasProfile: false as boolean | null, ...over,
})

describe('resolveAuthRedirect — onboarding gate', () => {
  it('redirects a logged-in author with NO profile to /onboarding', () => {
    expect(resolveAuthRedirect(ctx())).toBe('/onboarding')
  })

  it('does NOT redirect when already on /onboarding (the page stays reachable)', () => {
    expect(resolveAuthRedirect(ctx({ path: '/onboarding' }))).toBeNull()
  })

  it('does NOT gate when hasProfile is null (unknown / lookup failed / type missing — fail-open)', () => {
    expect(resolveAuthRedirect(ctx({ hasProfile: null }))).toBeNull()
  })

  it('does NOT gate when the author already has a profile', () => {
    expect(resolveAuthRedirect(ctx({ hasProfile: true }))).toBeNull()
  })

  it('NEVER gates a publisher (editor/super-admin), even with hasProfile false', () => {
    expect(resolveAuthRedirect(ctx({ isAuthor: false, canPublish: true, hasProfile: false }))).toBeNull()
  })

  it('still sends a logged-out visitor to /login before any onboarding logic', () => {
    expect(resolveAuthRedirect(ctx({ isLoggedIn: false }))).toBe('/login')
  })
})
