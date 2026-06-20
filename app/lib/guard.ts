export interface RouteInfo {
  path: string
  public?: boolean
  adminOnly?: boolean
}

export interface AuthSnapshot {
  isLoggedIn: boolean
  isAdmin: boolean
}

/** Returns a path to redirect to, or null to allow navigation. */
export function resolveAuthRedirect(route: RouteInfo, auth: AuthSnapshot): string | null {
  if (route.public) {
    if (route.path === '/login' && auth.isLoggedIn) return '/'
    return null
  }
  if (!auth.isLoggedIn) return '/login'
  if (route.adminOnly && !auth.isAdmin) return '/'
  return null
}
