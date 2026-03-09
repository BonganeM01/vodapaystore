// src/stores/cart.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useVodaPayBridge } from '@/composables/useVodaPayBridge'

export const useCartStore = defineStore('cart', () => {
  const items = ref([]) // [{ product, quantity }]
  const { sendToMiniProgram } = useVodaPayBridge()

  const totalItems = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantity, 0)
  )

  const totalPrice = computed(() =>
    items.value.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
  )

  function addItem(product, quantity = 1) {
    const existing = items.value.find((i) => i.product.id === product.id)
    if (existing) {
      existing.quantity += quantity
    } else {
      items.value.push({ product, quantity })
    }
    syncCartCountToMiniProgram()
  }

  function removeItem(productId) {
    items.value = items.value.filter((i) => i.product.id !== productId)
    syncCartCountToMiniProgram()
  }

  function updateQuantity(productId, quantity) {
    const item = items.value.find((i) => i.product.id === productId)
    if (item) {
      if (quantity <= 0) {
        removeItem(productId)
      } else {
        item.quantity = quantity
        syncCartCountToMiniProgram()
      }
    }
  }

  function clearCart() {
    items.value = []
    syncCartCountToMiniProgram()
  }

  // Notify the Mini Program of the new cart count so it can
  // update the tab bar badge via my.setTabBarBadge()
  function syncCartCountToMiniProgram() {
    sendToMiniProgram('UPDATE_CART_COUNT', { count: totalItems.value })
  }

  return {
    items, totalItems, totalPrice,
    addItem, removeItem, updateQuantity, clearCart,
  }
})