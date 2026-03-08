<!--src/components/AppTabBar.vue-->
<script setup>
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const cartStore = useCartStore()

const tabs = [
  { path: '/', label: 'Home', icon: '🏠', activeIcon: '🏠' },
  { path: '/cart', label: 'Cart', icon: '🛒', activeIcon: '🛒' },
  { path: '/profile', label: 'Profile', icon: '👤', activeIcon: '👤' },
]

const isActive = (path) =>
  path === '/' ? route.path === '/' : route.path.startsWith(path)
</script>

<template>
  <nav class="tab-bar">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.path"
      :to="tab.path"
      class="tab-item"
      :class="{ 'tab-item--active': isActive(tab.path) }"
    >
      <figure class="tab-icon-wrap">
        <span class="tab-icon">{{ tab.icon }}</span>
        <span v-if="tab.path === '/cart' && cartStore.totalItems > 0" class="tab-badge">
          {{ cartStore.totalItems }}
        </span>
      </figure>
      <span class="tab-label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tab-bar {
  display: flex;
  background: #fff;
  border-top: 1px solid #E8E8E8;
  padding-bottom: env(safe-area-inset-bottom);
  position: sticky;
  bottom: 0;
  z-index: 100;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 0 6px;
  text-decoration: none;
  color: #999;
  transition: color 0.15s;
}

.tab-item--active { color: #E60000; }

.tab-icon-wrap {
  position: relative;
  margin-bottom: 2px;
}

.tab-icon { font-size: 22px; display: block; }

.tab-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  background: #E60000;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
  min-width: 16px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  padding: 0 3px;
}

.tab-label {
  font-size: 11px;
  font-weight: 500;
}
</style>