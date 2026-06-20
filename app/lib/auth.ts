import type { $Fetch } from 'ofetch'
import type { LoginResponse, StrapiUser } from '~/types/strapi'

export function loginRequest(api: $Fetch, identifier: string, password: string): Promise<LoginResponse> {
  return api<LoginResponse>('/api/auth/local', {
    method: 'POST',
    body: { identifier, password },
  })
}

export function fetchMe(api: $Fetch): Promise<StrapiUser> {
  return api<StrapiUser>('/api/users/me', { query: { populate: 'role' } })
}
