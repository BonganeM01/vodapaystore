<!-- src/views/CheckoutView.vue -->

<script setup>
// ============================================================
// CheckoutView.vue — Checkout page
//
// This is where the VodaPay payment is triggered.
// Flow:
//   1. User taps "Pay with VodaPay"
//   2. usePayment().pay() → calls your backend to create order
//   3. Backend returns tradeNO → sent to Mini Program bridge
//   4. Mini Program calls my.tradePay(tradeNO)
//   5. VodaPay payment sheet appears (native)
//   6. Result comes back to H5 via bridge
// ============================================================
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
import { usePayment } from '@/composables/usePayment'

const router = useRouter()
const cartStore = useCartStore()
const authStore = useAuthStore()
const { pay, loading, error } = usePayment()

const paymentStatus = ref(null) // null | 'success' | 'cancelled' | 'error'

async function handlePayment() {
  try {
    const result = await pay({
      items: cartStore.items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        price: i.product.price,
      })),
      totalAmount: cartStore.totalPrice,
      currency: 'ZAR',
      userId: authStore.user?.id,
    })

    if (result.cancelled) {
      paymentStatus.value = 'cancelled'
    } else {
      paymentStatus.value = 'success'
    }
  } catch (e) {
    paymentStatus.value = 'error'
  }
}
</script>

<template>
  <article class="checkout-view">

    <!-- Payment result states -->
    <section v-if="paymentStatus === 'success'" class="result-state success-state">
      <span class="result-icon">✅</span>
      <h2>Payment Successful!</h2>
      <p>Your order has been placed and will be delivered soon.</p>
      <button class="btn-primary" @click="router.push('/')">Continue Shopping</button>
      <button class="btn-outline" @click="router.push('/orders')">View Orders</button>
    </section>

    <section v-else-if="paymentStatus === 'cancelled'" class="result-state cancel-state">
      <span class="result-icon">↩️</span>
      <h2>Payment Cancelled</h2>
      <p>Your cart has been saved. You can try again anytime.</p>
      <button class="btn-primary" @click="paymentStatus = null">Try Again</button>
      <button class="btn-outline" @click="router.push('/cart')">Back to Cart</button>
    </section>

    <section v-else-if="paymentStatus === 'error'" class="result-state error-state">
      <span class="result-icon">❌</span>
      <h2>Payment Failed</h2>
      <p>{{ error || 'Something went wrong. Please try again.' }}</p>
      <button class="btn-primary" @click="paymentStatus = null">Try Again</button>
    </section>

    <!-- Normal checkout UI -->
    <template v-else>
      <header class="view-header">
        <button class="back-btn" @click="router.back()">← Back</button>
        <h2>Checkout</h2>
      </header>

      <!-- Delivery info -->
      <section class="checkout-section card">
        <h3 class="section-label">Delivery Address</h3>
        <p class="address-line">123 Vodacom Boulevard</p>
        <p class="address-line">Midrand, Johannesburg 1685</p>
        <button class="change-link">Change address</button>
      </section>

      <!-- Order items summary -->
      <section class="checkout-section card">
        <h3 class="section-label">Order Items ({{ cartStore.totalItems }})</h3>
        <ul class="order-items" role="list">
          <li v-for="item in cartStore.items" :key="item.product.id" class="order-item">
            <span class="order-item-icon">{{ item.product.image }}</span>
            <span class="order-item-name">{{ item.product.name }} × {{ item.quantity }}</span>
            <span class="order-item-price">R {{ (item.product.price * item.quantity).toFixed(2) }}</span>
          </li>
        </ul>
        <div class="order-total">
          <span>Total</span>
          <span class="total-amount">R {{ cartStore.totalPrice.toFixed(2) }}</span>
        </div>
      </section>

      <!-- Payment method -->
      <section class="checkout-section card">
        <h3 class="section-label">Payment Method</h3>
        <figure class="payment-method">
          <span class="payment-logo">💳</span>
          <span class="payment-label">VodaPay Wallet</span>
          <span class="payment-check">✓</span>
        </figure>
      </section>

      <!-- Error display -->
      <aside v-if="error && paymentStatus === null" class="error-banner">
        ⚠️ {{ error }}
      </aside>

      <!-- ✅ The Pay button — triggers the full VodaPay payment flow -->
      <footer class="checkout-footer">
        <button
          class="pay-btn"
          :disabled="loading"
          @click="handlePayment"
        >
          <span v-if="loading" class="loading-spinner">⏳</span>
          <span v-else>Pay R {{ cartStore.totalPrice.toFixed(2) }} with VodaPay</span>
        </button>
        <p class="security-note">🔒 Secured by VodaPay</p>
      </footer>
    </template>

  </article>
</template>

<style scoped>
.checkout-view { padding: 16px; padding-bottom: 40px; display: flex; flex-direction: column; gap: 14px; }

.view-header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.view-header h2 { font-size: 22px; font-weight: 800; }
.back-btn { background: none; border: none; font-size: 15px; color: #E60000; cursor: pointer; padding: 0; }

.checkout-section {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.section-label { font-size: 12px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px; }
.address-line { font-size: 14px; color: #333; line-height: 1.6; }
.change-link { color: #E60000; font-size: 13px; font-weight: 600; background: none; border: none; cursor: pointer; padding: 6px 0 0; }

.order-items { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.order-item { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.order-item-icon { font-size: 20px; }
.order-item-name { flex: 1; color: #333; }
.order-item-price { font-weight: 600; color: #1A1A1A; }
.order-total { display: flex; justify-content: space-between; border-top: 1px solid #E8E8E8; margin-top: 12px; padding-top: 12px; font-weight: 700; font-size: 16px; }
.total-amount { color: #E60000; }

.payment-method { display: flex; align-items: center; gap: 12px; }
.payment-logo { font-size: 28px; }
.payment-label { flex: 1; font-size: 15px; font-weight: 600; }
.payment-check { color: #2E7D32; font-size: 18px; font-weight: 700; }

.error-banner { background: #FFEBEE; color: #C62828; border-radius: 8px; padding: 12px 16px; font-size: 14px; }

.checkout-footer { padding-top: 8px; }
.pay-btn {
  width: 100%;
  background: linear-gradient(135deg, #E60000, #CC0000);
  color: #fff;
  border: none;
  border-radius: 26px;
  height: 54px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(230,0,0,0.35);
  transition: opacity 0.15s;
}
.pay-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.security-note { text-align: center; font-size: 12px; color: #999; margin-top: 10px; }

/* Result states */
.result-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  text-align: center;
}
.result-icon { font-size: 64px; }
.result-state h2 { font-size: 24px; font-weight: 800; }
.result-state p { font-size: 15px; color: #666; max-width: 280px; }

.btn-primary {
  background: #E60000; color: #fff; border: none;
  border-radius: 24px; height: 48px; padding: 0 32px;
  font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; max-width: 280px;
}
.btn-outline {
  background: transparent; border: 2px solid #E60000; color: #E60000;
  border-radius: 24px; height: 48px; padding: 0 32px;
  font-size: 15px; font-weight: 600; cursor: pointer; width: 100%; max-width: 280px;
}
</style>