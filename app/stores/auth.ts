import { defineStore } from 'pinia'
import type { AdminUser } from '~/types/admin'
import { roleCodesOf, canPublish as canPublishFromCodes } from '~/lib/admin-roles'

interface AuthState {
  jwt: string | null
  user: AdminUser | null
  /** First-login onboarding gate: true=has profile, false=needs onboarding, null=unknown/skip-gate. */
  hasProfile: boolean | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({ jwt: null, user: null, hasProfile: null }),
  getters: {
    isLoggedIn: (state): boolean => Boolean(state.jwt && state.user),
    roleCodes: (state): string[] => roleCodesOf(state.user),
    canPublish(): boolean { return canPublishFromCodes(this.roleCodes) },
    displayName: (state): string | null => {
      const u = state.user
      if (!u) return null
      const full = `${u.firstname ?? ''} ${u.lastname ?? ''}`.trim()
      return full || u.username || u.email
    },
  },
  actions: {
    setSession(payload: { jwt: string; user: AdminUser }) {
      this.jwt = payload.jwt
      this.user = payload.user
    },
    setUser(user: AdminUser) {
      this.user = user
    },
    setHasProfile(value: boolean | null) {
      this.hasProfile = value
    },
    clearSession() {
      this.jwt = null
      this.user = null
      this.hasProfile = null
    },
  },
  persist: {
    storage: piniaPluginPersistedstate.cookies({
      sameSite: 'strict',
      secure: !import.meta.dev,
      maxAge: 60 * 60 * 24 * 30,
    }),
  },
})
