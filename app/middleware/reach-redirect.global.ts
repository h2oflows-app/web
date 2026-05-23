export default defineNuxtRouteMiddleware((to) => {
  // Redirect legacy /reaches/* URLs to /runs/* for backwards compatibility
  if (to.path.startsWith('/reaches/')) {
    return navigateTo(to.path.replace('/reaches/', '/runs/'), { redirectCode: 301 })
  }
})
