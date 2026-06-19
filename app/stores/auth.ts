import { defineStore } from 'pinia'
import type { StrapiUser } from '~/types/strapi'

interface AuthState {
  jwt: string | null
  user: StrapiUser | null
}

/** Role names (lowercased) that may publish. Confirm against the live instance. */
const ADMIN_ROLE_NAMES = ['admin']

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({ jwt: null, user: null }),
  getters: {
    isLoggedIn: (state): boolean => Boolean(state.jwt && state.user),
    role: (state): string | null => state.user?.role?.name ?? null,
    isAdmin(): boolean {
      return this.role ? ADMIN_ROLE_NAMES.includes(this.role.toLowerCase()) : false
    },
  },
  actions: {
    setSession(payload: { jwt: string; user: StrapiUser }) {
      this.jwt = payload.jwt
      this.user = payload.user
    },
    setUser(user: StrapiUser) {
      this.user = user
    },
    clearSession() {
      this.jwt = null
      this.user = null
    },
  },
  persist: true,
})
