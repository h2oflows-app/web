// #246 W7 — retire the old /reports/* pages in favor of the calendar/plan
// pages. Old links (shared reports, bookmarks) still resolve: GET
// /plan-runs/{param} on the api resolves both plan_runs.id AND the legacy
// reports.id via plan_runs.source_report_id, so a bare UUID keeps working.
export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/reports/new') {
    return navigateTo('/calendar', { redirectCode: 301 })
  }
  if (to.path.startsWith('/reports/')) {
    return navigateTo(to.path.replace('/reports/', '/plan-runs/'), { redirectCode: 301 })
  }
  if (to.path === '/my/reports') {
    return navigateTo('/calendar', { redirectCode: 301 })
  }
  if (to.path.startsWith('/my/reports/')) {
    return navigateTo(to.path.replace('/my/reports/', '/plan-runs/'), { redirectCode: 301 })
  }
})
