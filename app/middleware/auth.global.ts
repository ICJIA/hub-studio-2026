import { resolveAuthRedirect } from '~/lib/guard'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const redirect = resolveAuthRedirect({
    path: to.path,
    isPublic: to.meta.public === true,
    isAdminOnly: to.meta.adminOnly === true,
    isLoggedIn: auth.isLoggedIn,
    canPublish: auth.canPublish,
    // An author is a logged-in user who cannot publish — the only role first-login onboarding gates.
    isAuthor: auth.isLoggedIn && !auth.canPublish,
    hasProfile: auth.hasProfile,
  })
  if (redirect && redirect !== to.path) return navigateTo(redirect)
})
