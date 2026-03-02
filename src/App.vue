<!--src/App.vue-->
<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import AppHeader from '@/components/AppHeader.vue'
import AppTabBar from '@/components/AppTabBar.vue'
 
const router    = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()
 
onMounted(() => {
  // Pre-load mock user for standalone web mode
  const mockContext = {
    isLoggedIn: true,
    userId: 'mock-user-001',
    userInfo: { nickName: 'Thabo Nkosi' },
    cartCount: 0
  }
  authStore.setFromMiniProgramContext(mockContext)
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