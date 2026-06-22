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

/**
 * User-facing role label, derived purely from the publish capability. We surface only two labels to
 * non-technical R&A staff: an account that can publish is an "Editor" (superadmin also canPublish →
 * "Editor"; we deliberately do NOT expose a "Superadmin" label), everything else is an "Author".
 * Pure + unit-testable so the navbar chip and its tests share one source of truth.
 */
export function roleLabel(canPublishFlag: boolean): 'Editor' | 'Author' {
  return canPublishFlag ? 'Editor' : 'Author'
}

/**
 * Plain-language permissions summary for the role chip's popover — written for non-technical
 * Research & Analysis staff, not developers. Pure so it can be unit-tested independently of the UI.
 */
export function rolePermissions(canPublishFlag: boolean): string {
  return canPublishFlag
    ? 'Everything an author can do, plus publish & unpublish to the live Hub and the publish queue. (Superadmin accounts have the same publishing powers here.)'
    : "Create, edit, and preview drafts, and request review. You can't publish to the live Hub — an editor does that."
}
