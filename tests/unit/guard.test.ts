import { describe, it, expect } from 'vitest'
import { resolveAuthRedirect } from '~/lib/guard'

const ctx = (over = {}) => ({ path: '/x', isPublic: false, isAdminOnly: false, isLoggedIn: true, canPublish: false, ...over })

describe('resolveAuthRedirect', () => {
  it('sends an unauthenticated user on a private route to /login', () => {
    expect(resolveAuthRedirect(ctx({ isLoggedIn: false }))).toBe('/login')
  })
  it('lets a logged-in user reach a normal private route', () => {
    expect(resolveAuthRedirect(ctx())).toBeNull()
  })
  it('bounces a logged-in non-publisher off an admin-only route', () => {
    expect(resolveAuthRedirect(ctx({ isAdminOnly: true, canPublish: false }))).toBe('/')
  })
  it('lets a publisher reach an admin-only route', () => {
    expect(resolveAuthRedirect(ctx({ isAdminOnly: true, canPublish: true }))).toBeNull()
  })
  it('redirects a logged-in user away from /login (public)', () => {
    expect(resolveAuthRedirect(ctx({ path: '/login', isPublic: true }))).toBe('/')
  })
  it('lets an anonymous visitor see a public route', () => {
    expect(resolveAuthRedirect(ctx({ path: '/login', isPublic: true, isLoggedIn: false }))).toBeNull()
  })
})
