// src/composables/usePayment.js  (MOCK MODE)
//
// Replaces the real backend /orders API call with mockCreateOrder().
// Shows window.alert() at every step so you can trace the payment
// communication flow between the H5 and Mini Program.
//
// Full flow:
//   1. H5 calls mockCreateOrder()  →  gets a fake tradeNO
//   2. H5 shows alert confirming the tradeNO
//   3. H5 sends INITIATE_PAYMENT to Mini Program via bridge
//   4. Mini Program shows mock payment sheet (my.alert)
//   5. User confirms → Mini Program sends PAYMENT_SUCCESS to H5
//   6. H5 shows alert confirming receipt of result
//   7. Cart cleared, result returned to CheckoutView

import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useCartStore } from '@/stores/cart'
import { mockCreateOrder } from '@/mock/mockAPI'

export function usePayment() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const cartStore = useCartStore()
  const loading   = ref(false)
  const error     = ref(null)
  const lastResult = ref(null)

  // ── Full payment flow ─────────────────────────────────────────
  async function pay(orderDetails) {
    loading.value = true
    error.value   = null

    try {
      // ── Step 1: Create order via mock API ─────────────────────
      window.alert(
        '🟡 [MOCK] Step 1: Create Order\n\n' +
        `Total: R ${Number(orderDetails.totalAmount).toFixed(2)}\n` +
        `Items: ${orderDetails.items?.length || 0}\n\n` +
        'In production, this POSTs to your backend which calls\n' +
        'VodaPay /v2/payments/pay to get a tradeNO.\n\n' +
        'Calling mock API…'
      )

      const { tradeNO, orderId } = await mockCreateOrder(orderDetails)

      // ── Step 2: Show the generated tradeNO ────────────────────
      window.alert(
        '✅ Order Created (Mock)\n\n' +
        `Order ID:  ${orderId}\n` +
        `Trade No:  ${tradeNO}\n\n` +
        '📨 Now sending INITIATE_PAYMENT to Mini Program.\n' +
        'Watch for the 🟡 [MOCK] payment sheet alert on the native layer.'
      )

      // ── Step 3: Trigger Mini Program payment sheet ─────────────
      const result = await triggerPayment(tradeNO, orderDetails.totalAmount)

      // ── Step 4: Handle result ──────────────────────────────────
      lastResult.value = result

      if (result.resultCode === '9000') {
        cartStore.clearCart()

        window.alert(
          '📩 Mini Program → H5\n\n' +
          'Received: PAYMENT_SUCCESS\n\n' +
          `resultCode: ${result.resultCode} (Success)\n` +
          `tradeNO: ${result.tradeNO}\n\n` +
          'Cart has been cleared. Order is confirmed!'
        )
      } else if (result.cancelled) {
        window.alert(
          '📩 Mini Program → H5\n\n' +
          'Received: PAYMENT_FAIL\n\n' +
          `resultCode: ${result.resultCode} (Cancelled by user)\n\n` +
          'Cart has been preserved. User can try again.'
        )
      }

      return result

    } catch (err) {
      error.value = err.message || 'Payment failed'
      window.alert(`❌ Payment Error\n\n${error.value}`)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ── Send tradeNO to Mini Program, wait for result ─────────────
  function triggerPayment(tradeNO, amount = 0) {
    return new Promise((resolve, reject) => {
      const unsubSuccess = onMessage('PAYMENT_SUCCESS', (data) => {
        unsubSuccess()
        unsubFail()
        resolve(data)
      })

      const unsubFail = onMessage('PAYMENT_FAIL', (data) => {
        unsubSuccess()
        unsubFail()
        if (data.resultCode === '6001') {
          // Cancelled is not a hard error — resolve with cancelled flag
          resolve({ ...data, cancelled: true })
        } else {
          reject(new Error('Payment failed'))
        }
      })

      // ✅ H5 → Mini Program: triggers _handleInitiatePayment() in index.js
      // The Mini Program will show a mock payment sheet (my.alert with
      // "Confirm Payment" / "Cancel" buttons) and then send back the result.
      sendToMiniProgram('INITIATE_PAYMENT', { tradeNO, amount })
    })
  }

  return { pay, loading, error, lastResult }
}
