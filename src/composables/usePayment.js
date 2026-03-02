
import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useCartStore } from '@/stores/cart'
 
export function usePayment() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const cartStore = useCartStore()
  const loading   = ref(false)
  const error     = ref(null)
  const lastResult = ref(null)
 
  // Full real payment flow
  async function pay(orderDetails) {
    loading.value = true
    error.value   = null
 
    try {
      // Step 1: Create real order via your backend
      // In production this calls VodaPay /v2/payments/pay to get tradeNO
      window.alert(
        '🟡 Creating real order...\n\n' +
        `Total: R ${Number(orderDetails.totalAmount).toFixed(2)}\n` +
        `Items: ${orderDetails.items?.length || 0}\n\n` +
        'Sending to backend...'
      )
 
      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add Authorization header if your backend requires JWT
          // 'Authorization': `Bearer ${authStore.token}`
        },
        body: JSON.stringify({
          items: orderDetails.items,
          totalAmount: orderDetails.totalAmount,
          currency: orderDetails.currency || 'ZAR',
          userId: orderDetails.userId,
        })
      })
 
      if (!orderResponse.ok) {
        const errText = await orderResponse.text()
        throw new Error(`Order creation failed: ${errText}`)
      }
 
      const { tradeNO, orderId } = await orderResponse.json()
 
      window.alert(
        '✅ Real order created!\n\n' +
        `Order ID: ${orderId}\n` +
        `Trade No: ${tradeNO}\n\n` +
        'Opening VodaPay payment sheet...'
      )
 
      // Step 2: Trigger real payment in mini app
      const result = await triggerPayment(tradeNO, orderDetails.totalAmount)
 
      lastResult.value = result
 
      if (result.resultCode === '9000') {
        // Payment success
        cartStore.clearCart()
 
        window.alert(
          '📩 Payment SUCCESS\n\n' +
          `resultCode: ${result.resultCode} (Success)\n` +
          `tradeNO: ${result.tradeNO}\n\n` +
          'Cart cleared. Order confirmed!'
        )
 
        // Optional: notify backend of success (for order status update)
        await fetch('/api/orders/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tradeNO, orderId, status: 'paid' })
        }).catch(err => console.warn('Confirm failed:', err))
 
      } else if (result.cancelled || result.resultCode === '6001') {
        // User cancelled
        window.alert(
          '📩 Payment CANCELLED\n\n' +
          `resultCode: ${result.resultCode || '6001'}\n\n` +
          'Cart preserved. You can try again.'
        )
      } else {
        // Other failure
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
      throw err
    } finally {
      loading.value = false
    }
  }
 
  // ── Trigger real my.tradePay via bridge ───────────────────────
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
 
      // Send to mini app → triggers real my.tradePay
      sendToMiniProgram('INITIATE_PAYMENT', { tradeNO, amount })
    })
  }
 
  return { pay, loading, error, lastResult }
}


