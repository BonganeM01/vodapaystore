// src/composables/usePayment.js
//
// Handles the complete VodaPay payment flow:
//
//   1. H5 calls your backend to CREATE an order → gets tradeNO
//   2. H5 sends INITIATE_PAYMENT + tradeNO to Mini Program
//   3. Mini Program calls my.tradePay(tradeNO) → VodaPay payment sheet
//   4. User pays (or cancels)
//   5. Mini Program sends PAYMENT_SUCCESS or PAYMENT_FAIL to H5
//   6. H5 updates UI, shows confirmation

import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useCartStore } from '@/stores/cart'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.your-backend.com'

export function usePayment() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const cartStore = useCartStore()
  const loading = ref(false)
  const error = ref(null)
  const lastResult = ref(null)

  // ── Full payment flow ──────────────────────────────────────
  async function pay(orderDetails) {
    loading.value = true
    error.value = null

    try {
      // ✅ Step 1: Create order on your backend.
      // Your backend must:
      //   1. Build the order object
      //   2. Call VodaPay /v2/payments/pay with paymentNotifyUrl
      //   3. Receive paymentId/tradeNO from VodaPay
      //   4. Return tradeNO to H5
      const { tradeNO } = await createOrder(orderDetails)

      // ✅ Step 2: Trigger the VodaPay payment sheet via Mini Program
      const result = await triggerPayment(tradeNO)

      lastResult.value = result

      // Clear cart on success
      if (result.resultCode === '9000') {
        cartStore.clearCart()
      }

      return result

    } catch (err) {
      error.value = err.message || 'Payment failed'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ── Create order on backend ─────────────────────────────────
  async function createOrder(orderDetails) {
    const response = await axios.post(`${API_BASE}/orders`, orderDetails, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('vodapay_token')}`,
      },
    })
    return response.data // { tradeNO, orderId }
  }

  // ── Send tradeNO to Mini Program to initiate payment ───────
  function triggerPayment(tradeNO) {
    return new Promise((resolve, reject) => {
      // Listen for payment result from Mini Program
      const unsubSuccess = onMessage('PAYMENT_SUCCESS', (data) => {
        unsubSuccess()
        unsubFail()
        resolve(data)
      })
      const unsubFail = onMessage('PAYMENT_FAIL', (data) => {
        unsubSuccess()
        unsubFail()
        // resultCode '6001' = user cancelled (not really an error)
        if (data.resultCode === '6001') {
          resolve({ ...data, cancelled: true })
        } else {
          reject(new Error('Payment failed'))
        }
      })

      // ✅ Send tradeNO to Mini Program.
      // Mini Program will call my.tradePay({ tradeNO }) which opens
      // the VodaPay cashier/payment sheet natively.
      sendToMiniProgram('INITIATE_PAYMENT', { tradeNO })
    })
  }

  return { pay, loading, error, lastResult }
}