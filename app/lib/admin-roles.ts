import type { AdminUser } from '~/types/admin'

/** Admin role codes allowed to PUBLISH (make content live). Authors (strapi-author) cannot. */
export const PUBLISHER_ROLE_CODES = ['strapi-super-admin', 'strapi-editor'] as const
export const AUTHOR_ROLE_CODE = 'strapi-author'

export function roleCodesOf(user: AdminUser | null | undefined): string[] {
  return (user?.roles ?? []).map((r) => r.code)
}

export function canPublish(roleCodes: string[]): boolean {
  return roleCodes.some((c) => (PUBLISHER_ROLE_CODES as readonly string[]).includes(c))
}
