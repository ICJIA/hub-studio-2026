// app/lib/demo.ts
// isDemoSession — true only in dev when the synthetic admin/admin token is active.
// Gated on import.meta.dev so the entire branch is tree-shaken in production builds.
import { isDevAdminToken } from '~/lib/dev-auth'
import { useAuthStore } from '~/stores/auth'

export function isDemoSession(): boolean {
  if (!import.meta.dev) return false
  return isDevAdminToken(useAuthStore().jwt)
}
