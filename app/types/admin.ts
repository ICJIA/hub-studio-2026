// Strapi 5 ADMIN-panel user/role shapes (verified against the live instance 2026-06-20).
// These are the admin API's types — distinct from the Users & Permissions plugin.
export interface AdminRole {
  id: number
  name: string
  /** Stable identifier — gate capability on this, not `name`. e.g. 'strapi-super-admin'. */
  code: string
}

export interface AdminUser {
  id: number
  documentId?: string
  firstname?: string
  lastname?: string
  username?: string
  email: string
  isActive?: boolean
  blocked?: boolean
  roles: AdminRole[]
}

/** `POST /admin/login` → user.roles is EMPTY here; fetch /admin/users/me for roles. */
export interface AdminLoginResponse { data: { token: string; user: AdminUser } }
/** `GET /admin/users/me` → user WITH roles populated. */
export interface AdminMeResponse { data: AdminUser }
