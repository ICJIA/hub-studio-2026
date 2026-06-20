export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const redirect = resolveAuthRedirect({
    path: to.path,
    isPublic: to.meta.public === true,
    isAdminOnly: to.meta.adminOnly === true,
    isLoggedIn: auth.isLoggedIn,
    canPublish: auth.canPublish,
  })
  if (redirect && redirect !== to.path) return navigateTo(redirect)
})
