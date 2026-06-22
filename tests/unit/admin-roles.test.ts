import { describe, it, expect } from 'vitest'
import { PUBLISHER_ROLE_CODES, AUTHOR_ROLE_CODE, roleCodesOf, canPublish, roleLabel, rolePermissions } from '~/lib/admin-roles'
import type { AdminUser } from '~/types/admin'

const user = (codes: string[]): AdminUser => ({
  id: 1, email: 'x@e.gov', roles: codes.map((code, i) => ({ id: i, name: code, code })),
})

describe('admin-roles', () => {
  it('lists the publisher role codes', () => {
    expect(PUBLISHER_ROLE_CODES).toEqual(['strapi-super-admin', 'strapi-editor'])
  })
  it('the author role code is NOT a publisher (canPublish false)', () => {
    expect(canPublish([AUTHOR_ROLE_CODE])).toBe(false)
    expect((PUBLISHER_ROLE_CODES as readonly string[])).not.toContain(AUTHOR_ROLE_CODE)
  })
  it('extracts role codes from a user (empty when none/null)', () => {
    expect(roleCodesOf(user(['strapi-author']))).toEqual(['strapi-author'])
    expect(roleCodesOf(null)).toEqual([])
  })
  it('canPublish: true for super-admin or editor, false for author', () => {
    expect(canPublish(['strapi-super-admin'])).toBe(true)
    expect(canPublish(['strapi-editor'])).toBe(true)
    expect(canPublish(['strapi-author'])).toBe(false)
    expect(canPublish([])).toBe(false)
  })
})

describe('role chip helpers (roleLabel / rolePermissions)', () => {
  it('roleLabel: a publisher is "Editor", a non-publisher is "Author"', () => {
    expect(roleLabel(true)).toBe('Editor')
    expect(roleLabel(false)).toBe('Author')
  })

  it('roleLabel never surfaces a "Superadmin" label — a publishing superadmin is still "Editor"', () => {
    // Superadmin canPublish === true (admin-roles), and we deliberately collapse it to "Editor".
    expect(roleLabel(canPublish(['strapi-super-admin']))).toBe('Editor')
  })

  it('rolePermissions: the author and editor summaries differ', () => {
    const author = rolePermissions(false)
    const editor = rolePermissions(true)
    expect(author).not.toBe(editor)
  })

  it('rolePermissions (author): mentions drafts/preview and that they cannot publish', () => {
    const author = rolePermissions(false)
    expect(author).toMatch(/draft/i)
    expect(author).toMatch(/can't publish|cannot publish/i)
  })

  it('rolePermissions (editor): mentions publish & unpublish and notes superadmin parity', () => {
    const editor = rolePermissions(true)
    expect(editor).toMatch(/publish & unpublish|publish and unpublish/i)
    expect(editor).toMatch(/superadmin/i)
  })
})
