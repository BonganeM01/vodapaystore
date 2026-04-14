<!-- src/App.vue -->
<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVodaPayBridge } from '@/composables/useVodaPayBridge'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import AppHeader from '@/components/AppHeader.vue'
import AppTabBar from '@/components/AppTabBar.vue'
 
const router    = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()
const { initBridge, onMessage } = useVodaPayBridge()
 
const cleanups = []
 
onMounted(() => {
  initBridge()
 
  //Listen for MINI_PROGRAM_CONTEXT
  cleanups.push(
    onMessage('MINI_PROGRAM_CONTEXT', (data) => {
      console.log('[App.vue] Received MINI_PROGRAM_CONTEXT from Mini Program:', data)
 
      // Always update auth store with latest context
      authStore.setFromMiniProgramContext(data)
 
      // show feedback when authentication just completed
      if (data.justAuthenticated) {
        console.log('[App.vue] Authentication just succeeded — user is now logged in')
        alert(`Login successful!\nWelcome, ${data.userInfo?.nickName || 'User'}`)
      }
 
      // Handle deep link / view routing
      if (data.deepLink?.view) {
        const view = data.deepLink.view
        if (view === 'cart')        router.push('/cart')
        else if (view === 'profile') router.push('/profile')
        else if (view === 'checkout') router.push('/checkout')
        else if (view === 'orders')  router.push('/orders')
      }
 
      // If deep link contains SKU → go to product
      if (data.deepLink?.sku) {
        router.push(`/product/${data.deepLink.sku}`)
      }
 
      // if login was required but now we have user → redirect to intended page
      if (data.isLoggedIn && router.currentRoute.value.query?.loginRequired) {
        const redirect = router.currentRoute.value.query.redirect || '/'
        router.push(redirect)
      }
    })
  )
 
  // listen for direct USER_INFO_SUCCESS
  cleanups.push(
    onMessage('USER_INFO_SUCCESS', (data) => {
      console.log('[App.vue] Received USER_INFO_SUCCESS:', data.userInfo)
      authStore.setUserInfo(data.userInfo)
    })
  )
 
  // handle auth code success (for debugging)
  cleanups.push(
    onMessage('AUTH_CODE_SUCCESS', (data) => {
      console.log('[App.vue] Auth code received:', data.authCode)
    })
  )

  cleanups.push(
    onMessage('OPEN_CART', () => {
      console.log('[App.vue] Received OPEN_CART from Mini App — navigating to /cart')
      router.push('/cart')
    })
  )

})
 
onUnmounted(() => {
  cleanups.forEach(fn => fn())
})
</script>
 
<template>
  <main class="app-shell">
    <AppHeader />
    <section class="page-content">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </section>
    <AppTabBar />
  </main>
</template>
 
<style>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background);
}
 
.page-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
 
.page-enter-active,
.page-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.page-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.page-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
 