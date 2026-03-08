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
 
  // ── Listen for the initial context from the Mini Program ──
  cleanups.push(
    onMessage('MINI_PROGRAM_CONTEXT', (data) => {
      console.log('[App] Received MINI_PROGRAM_CONTEXT:', data)
 
      // ✅ ALERT: Show what the Mini Program sent us
      window.alert(
        '📩 Mini Program → H5\n\n' +
        'Received: MINI_PROGRAM_CONTEXT\n\n' +
        `User: ${data.userInfo?.nickName || 'Guest'}\n` +
        `Logged in: ${data.isLoggedIn}\n` +
        `User ID: ${data.userId || 'none'}\n` +
        `Cart items: ${data.cartCount || 0}\n\n` +
        'Populating Pinia auth store with this user…'
      )
 
      authStore.setFromMiniProgramContext(data)
 
      // Restore cart count from Mini Program
      if (data.cartCount > 0) {
        console.log('[App] Restoring cart count:', data.cartCount)
      }
 
      // Handle deep link / query param routing
      if (data.deepLink?.sku) {
        router.push(`/product/${data.deepLink.sku}`)
      } else if (data.deepLink?.view === 'checkout') {
        router.push('/checkout')
      } else if (data.deepLink?.view === 'orders') {
        router.push('/orders')
      }
 
      // If mini program requires login but user is not in store
      if (data.deepLink?.requireLogin && !authStore.isLoggedIn) {
        router.push({ path: '/', query: { loginRequired: '1' } })
      }
    })
  )
})
 
onUnmounted(() => {
  cleanups.forEach((fn) => fn())
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
 