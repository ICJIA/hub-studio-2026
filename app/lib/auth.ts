import type { $Fetch } from 'ofetch'
import type { AdminUser, AdminLoginResponse, AdminMeResponse } from '~/types/admin'

/** Admin-panel login. NOTE: the returned user has an EMPTY roles array — call fetchMe for roles. */
export async function loginRequest(api: $Fetch, email: string, password: string): Promise<{ jwt: string; user: AdminUser }> {
  const res = await api<AdminLoginResponse>('/admin/login', { method: 'POST', body: { email, password } })
  return { jwt: res.data.token, user: res.data.user }
}

/** Current admin user WITH roles populated (used at login completion and on boot re-verify). */
export async function fetchMe(api: $Fetch): Promise<AdminUser> {
  const res = await api<AdminMeResponse>('/admin/users/me')
  return res.data
}
