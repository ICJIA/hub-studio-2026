export interface StrapiRole {
  id: number
  name: string
  type: string
}

export interface StrapiUser {
  id: number
  documentId?: string
  username: string
  email: string
  confirmed?: boolean
  blocked?: boolean
  role?: StrapiRole
}

export interface LoginResponse {
  jwt: string
  user: StrapiUser
}
