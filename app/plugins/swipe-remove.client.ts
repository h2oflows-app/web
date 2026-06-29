import { vSwipeRemove } from '~/directives/swipeRemove'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('swipe-remove', vSwipeRemove)
})
