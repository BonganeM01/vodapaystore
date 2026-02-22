<script setup>
// ============================================================
// App.vue — Root component
//
// This is where the VodaPay bridge is INITIALISED.
// It must happen at the root level so all child components
// can use the bridge via useVodaPayBridge().
// ============================================================

import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVodaPayBridge } from '@/composables/useVodaPayBridge'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/AppHeader.vue'
import AppTabBar from '@/components/AppTabBar.vue'

const router = useRouter()
const authStore = useAuthStore()
const { initBridge, onMessage } = useVodaPayBridge()

// ── Clean-up functions for message subscriptions ───────────
const cleanups = []

onMounted(() => {
  // ✅ STEP 1: Initialise the bridge.
  // This sets my.onMessage and sends BRIDGE_READY to the Mini Program.
  // The Mini Program will respond with MINI_PROGRAM_CONTEXT.
  initBridge()

  // ── Listen for initial Mini Program context ─────────────
  // This fires once after BRIDGE_READY, giving us the user state
  // the Mini Program already knows about (userId, cartCount, deep links).
  cleanups.push(
    onMessage('MINI_PROGRAM_CONTEXT', (data) => {
      console.log('[App] Received mini program context:', data)
      authStore.setFromMiniProgramContext(data)

      // If launched via deep link with a product SKU, navigate there
      if (data.deepLink?.sku) {
        router.push(`/product/${data.deepLink.sku}`)
      }

      // If deep link asks for orders view
      if (data.deepLink?.view === 'orders') {
        router.push('/orders')
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

    <!-- RouterView is the page content area -->
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

/* Page transition */
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
