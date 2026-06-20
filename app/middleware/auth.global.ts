import { resolveAuthRedirect } from '~/lib/guard'

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const redirect = resolveAuthRedirect(
    {
      path: to.path,
      public: to.meta.public === true,
      adminOnly: to.meta.adminOnly === true,
    },
    { isLoggedIn: auth.isLoggedIn, isAdmin: auth.isAdmin },
  )
  if (redirect && redirect !== to.path) return navigateTo(redirect)
})
