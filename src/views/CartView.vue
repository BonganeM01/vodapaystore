<!-- CartView.vue — Shopping cart and checkout trigger -->
<script setup>
// ============================================================
// CartView.vue — Shopping cart and checkout trigger
// ============================================================
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const cartStore = useCartStore()
const authStore = useAuthStore()

const isEmpty = computed(() => cartStore.items.length === 0)

function proceedToCheckout() {
  if (!authStore.isLoggedIn) {
    // Redirect to home which will show the login prompt
    router.push({ path: '/', query: { loginRequired: '1', redirect: '/checkout' } })
    return
  }
  router.push('/checkout')
}
</script>

<template>
  <article class="cart-view">
    <header class="view-header">
      <h2>My Cart</h2>
      <span v-if="!isEmpty" class="item-count">{{ cartStore.totalItems }} items</span>
    </header>

    <!-- Empty cart -->
    <aside v-if="isEmpty" class="empty-state">
      <span class="empty-icon">🛒</span>
      <p class="empty-title">Your cart is empty</p>
      <p class="empty-sub">Add some products to get started</p>
      <button class="btn-primary" style="margin-top:20px; width:180px" @click="router.push('/')">
        Browse Products
      </button>
    </aside>

    <!-- Cart items -->
    <template v-else>
      <ul class="cart-items" role="list">
        <li v-for="item in cartStore.items" :key="item.product.id" class="cart-item card">
          <figure class="item-image">
            <span>{{ item.product.image }}</span>
          </figure>
          <section class="item-details">
            <h4 class="item-name">{{ item.product.name }}</h4>
            <p class="item-price">R {{ item.product.price.toFixed(2) }}</p>
          </section>
          <aside class="item-controls">
            <button class="qty-btn" @click="cartStore.updateQuantity(item.product.id, item.quantity - 1)">−</button>
            <span class="qty">{{ item.quantity }}</span>
            <button class="qty-btn" @click="cartStore.updateQuantity(item.product.id, item.quantity + 1)">+</button>
          </aside>
        </li>
      </ul>

      <!-- Order summary -->
      <section class="order-summary card">
        <h3 class="summary-title">Order Summary</h3>
        <dl class="summary-rows">
          <div class="summary-row">
            <dt>Subtotal</dt>
            <dd>R {{ cartStore.totalPrice.toFixed(2) }}</dd>
          </div>
          <div class="summary-row">
            <dt>Delivery</dt>
            <dd class="free">Free</dd>
          </div>
          <div class="summary-row total-row">
            <dt>Total</dt>
            <dd class="total-price">R {{ cartStore.totalPrice.toFixed(2) }}</dd>
          </div>
        </dl>

        <!-- Checkout triggers auth check, then payment flow -->
        <button class="btn-primary checkout-btn" @click="proceedToCheckout">
          Checkout with VodaPay
        </button>
      </section>
    </template>
  </article>
</template>

<style scoped>
.cart-view { padding: 16px; padding-bottom: 100px; }

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.view-header h2 { font-size: 22px; font-weight: 800; }
.item-count { font-size: 13px; color: #999; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
}
.empty-icon { font-size: 64px; margin-bottom: 16px; }
.empty-title { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
.empty-sub { font-size: 14px; color: #999; }

.cart-items { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }

.cart-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.06);
}

.item-image {
  width: 52px;
  height: 52px;
  background: #F5F5F5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.item-details { flex: 1; min-width: 0; }
.item-name { font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-price { font-size: 14px; color: #E60000; font-weight: 700; margin-top: 2px; }

.item-controls { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.qty-btn {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1.5px solid #E8E8E8;
  background: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qty { font-size: 15px; font-weight: 600; min-width: 24px; text-align: center; }

.order-summary {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}
.summary-title { font-size: 17px; font-weight: 700; margin-bottom: 16px; }
.summary-rows { display: flex; flex-direction: column; gap: 10px; }
.summary-row { display: flex; justify-content: space-between; font-size: 14px; }
.total-row { border-top: 1px solid #E8E8E8; padding-top: 10px; margin-top: 4px; }
.free { color: #2E7D32; font-weight: 600; }
.total-price { font-size: 18px; font-weight: 800; color: #E60000; }

.checkout-btn {
  width: 100%;
  margin-top: 20px;
  background: #E60000;
  color: #fff;
  border: none;
  border-radius: 24px;
  height: 50px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(230,0,0,0.3);
}

.btn-primary {
  background: #E60000; color: #fff; border: none;
  border-radius: 24px; height: 44px; padding: 0 24px;
  font-size: 15px; font-weight: 600; cursor: pointer;
}
</style>