export interface GuardContext {
  path: string
  isPublic: boolean
  isAdminOnly: boolean
  isLoggedIn: boolean
  canPublish: boolean
  /** A logged-in user who cannot publish (the only role gated by first-login onboarding). */
  isAuthor: boolean
  /** First-login onboarding gate: true=has profile, false=needs onboarding, null=unknown/skip-gate. */
  hasProfile: boolean | null
}

/** Returns a redirect path, or null to allow. Default-deny: only `isPublic` routes are open. */
export function resolveAuthRedirect(ctx: GuardContext): string | null {
  if (ctx.isPublic) {
    return ctx.isLoggedIn && ctx.path === '/login' ? '/' : null
  }
  if (!ctx.isLoggedIn) return '/login'
  if (ctx.isAdminOnly && !ctx.canPublish) return '/'
  // First-login onboarding: gate AUTHORS (only) whose profile RESOLVED as missing (hasProfile===false).
  // null (unknown / lookup failed / type missing) ⇒ fail-open (no gate); /onboarding stays reachable.
  if (ctx.isAuthor && ctx.hasProfile === false && ctx.path !== '/onboarding') return '/onboarding'
  return null
}
