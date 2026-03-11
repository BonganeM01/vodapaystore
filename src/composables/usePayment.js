// src/composables/usePayment.js
import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useCartStore } from '@/stores/cart'

export function usePayment() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const cartStore = useCartStore()
  const loading   = ref(false)
  const error     = ref(null)
  const lastResult = ref(null)

  // Real payment flow 
  async function pay(orderDetails) {
    loading.value = true
    error.value   = null

    try {
      // Step 1: Simulate backend order creation (with mock tradeNO)
      window.alert(
        '🟡 Creating order...\n\n' +
        `Total: R ${Number(orderDetails.totalAmount).toFixed(2)}\n` +
        `Items: ${orderDetails.items?.length || 0}\n\n` +
        'Sending to backend...'
      )

      // Mock backend call
      // generate mock tradeNO and orderId
      const mockTradeNO = `TEST_TRADE_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const mockOrderId = `ORDER_${Date.now()}`

      window.alert(
        '✅ Order created successfully\n\n' +
        `Order ID:  ${mockOrderId}\n` +
        `Trade No:  ${mockTradeNO}\n\n` +
        'Opening "Simulated" VodaPay cashier...'
      )

      // Step 2: Trigger real my.tradePay in mini app
      const result = await triggerPayment(mockTradeNO, orderDetails.totalAmount)

      lastResult.value = result

      if (result.resultCode === '9000') { // Payment successful
        cartStore.clearCart()
 
        window.alert(
          '📩 Payment SUCCESS\n\n' +
          `resultCode: ${result.resultCode} (Success)\n` +
          `tradeNO: ${result.tradeNO}\n\n` +
          'Cart cleared. Order confirmed!'
        )

      } else if (result.resultCode === '6001') { // Payment failed

        window.alert(
          '📩 Payment CANCELLED\n\n' +
          `resultCode: ${result.resultCode || '6001'}\n\n` +
          'Cart preserved. You can try again.'
        )

      } else {
        window.alert(
          '❌ Payment FAILED\n\n' +
          `resultCode: ${result.resultCode}\n` +
          `Message: ${result.errMsg || 'Unknown error'}\n\n` +
          'Please try again or contact support.'
        )
      }

      return result

    } catch (err) {

      error.value = err.message || 'Payment failed'
      window.alert(`❌ Payment Error\n\n${error.value}`)
      console.error('Payment flow error:', err)
      throw err

    } finally {

      loading.value = false

    }

  }

  // Send tradeNO to Mini Program → triggers real my.tradePay in my "INITIATE_PAYMENT" handler
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
          resolve({ ...data, cancelled: true })
        } else {
          reject(new Error(`Payment failed: ${data.resultCode || 'unknown'}`))
        }
      })

      sendToMiniProgram('INITIATE_PAYMENT', { tradeNO, amount })
    })
  }

  return { pay, loading, error, lastResult }
}
 