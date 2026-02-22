<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const route = useRoute()
const cartStore = useCartStore()
const title = computed(() => route.meta.title || 'VodaPay Store')
</script>

<template>
  <header class="app-header">
    <figure class="logo-wrap">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="14" cy="14" r="14" fill="#E60000"/>
        <text x="14" y="19" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="sans-serif">V</text>
      </svg>
    </figure>
    <h1 class="header-title">{{ title }}</h1>
    <nav class="header-actions">
      <RouterLink to="/cart" class="cart-btn" aria-label="View Cart">
        <span class="cart-icon">🛒</span>
        <span v-if="cartStore.totalItems > 0" class="cart-badge">
          {{ cartStore.totalItems }}
        </span>
      </RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #E60000;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(230,0,0,0.25);
}

.logo-wrap { flex-shrink: 0; display: flex; align-items: center; }

.header-title {
  flex: 1;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.2px;
}

.header-actions { display: flex; align-items: center; gap: 8px; }

.cart-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  text-decoration: none;
}

.cart-icon { font-size: 20px; }

.cart-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #FFD700;
  color: #1A1A1A;
  font-size: 10px;
  font-weight: 700;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  text-align: center;
  padding: 0 4px;
}
</style>