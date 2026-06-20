export interface GuardContext {
  path: string
  isPublic: boolean
  isAdminOnly: boolean
  isLoggedIn: boolean
  canPublish: boolean
}

/** Returns a redirect path, or null to allow. Default-deny: only `isPublic` routes are open. */
export function resolveAuthRedirect(ctx: GuardContext): string | null {
  if (ctx.isPublic) {
    return ctx.isLoggedIn && ctx.path === '/login' ? '/' : null
  }
  if (!ctx.isLoggedIn) return '/login'
  if (ctx.isAdminOnly && !ctx.canPublish) return '/'
  return null
}
