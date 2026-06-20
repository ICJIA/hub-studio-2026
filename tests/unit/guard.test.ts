import { describe, it, expect } from 'vitest'
import { resolveAuthRedirect } from '~/lib/guard'

const loggedOut = { isLoggedIn: false, isAdmin: false }
const author = { isLoggedIn: true, isAdmin: false }
const admin = { isLoggedIn: true, isAdmin: true }

describe('resolveAuthRedirect', () => {
  it('sends logged-out users from a protected route to /login', () => {
    expect(resolveAuthRedirect({ path: '/', }, loggedOut)).toBe('/login')
  })

  it('allows logged-out users on a public route', () => {
    expect(resolveAuthRedirect({ path: '/login', public: true }, loggedOut)).toBeNull()
  })

  it('sends logged-in users away from /login to home', () => {
    expect(resolveAuthRedirect({ path: '/login', public: true }, author)).toBe('/')
  })

  it('allows an author on a normal protected route', () => {
    expect(resolveAuthRedirect({ path: '/' }, author)).toBeNull()
  })

  it('blocks a non-admin from an admin-only route', () => {
    expect(resolveAuthRedirect({ path: '/manage', adminOnly: true }, author)).toBe('/')
  })

  it('allows an admin on an admin-only route', () => {
    expect(resolveAuthRedirect({ path: '/manage', adminOnly: true }, admin)).toBeNull()
  })
})
