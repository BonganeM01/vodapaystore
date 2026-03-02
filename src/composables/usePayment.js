
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
 
  // Full payment flow (mock order + real payment popup) 
  async function pay(orderDetails) {
    loading.value = true
    error.value   = null
 
    try {
      // Step 1: Mock order creation (temporary)
      window.alert(
        '🟡 [MOCK] Step 1: Create Order\n\n' +
        `Total: R ${Number(orderDetails.totalAmount).toFixed(2)}\n` +
        `Items: ${orderDetails.items?.length || 0}\n\n` +
        'Using mock order creation (no backend required)'
      )
 
      const { tradeNO, orderId } = await mockCreateOrder(orderDetails)
 
      window.alert(
        '✅ Mock order created\n\n' +
        `Order ID:  ${orderId}\n` +
        `Trade No:  ${tradeNO}\n\n` +
        'Now sending to Mini Program → watch for real VodaPay payment sheet'
      )
 
      // Step 2: Trigger REAL payment popup in mini app
      const result = await triggerPayment(tradeNO, orderDetails.totalAmount)
 
      lastResult.value = result
 
      if (result.resultCode === '9000') {
        // Success
        cartStore.clearCart()
 
        window.alert(
          '📩 Mini Program → H5\n\n' +
          'Received: PAYMENT_SUCCESS\n\n' +
          `resultCode: ${result.resultCode} (Success)\n` +
          `tradeNO: ${result.tradeNO}\n\n` +
          'Cart has been cleared. Order is confirmed!'
        )
      } else if (result.cancelled || result.resultCode === '6001') {
        // Cancelled
        window.alert(
          '📩 Mini Program → H5\n\n' +
          'Received: PAYMENT_FAIL\n\n' +
          `resultCode: ${result.resultCode} (Cancelled by user)\n\n` +
          'Cart has been preserved. User can try again.'
        )
      } else {
        // Other failure
        window.alert(
          '❌ Payment failed\n\n' +
          `resultCode: ${result.resultCode}\n` +
          `Message: ${result.errMsg || 'Unknown error'}`
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
 
  // ── Send tradeNO to Mini Program → triggers real my.tradePay ──
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
          // Cancel is not treated as error
          resolve({ ...data, cancelled: true })
        } else {
          reject(new Error('Payment failed'))
        }
      })
 
      // This message triggers _mockPayment (or renamed _handleInitiatePayment)
      // in mini app index.js → calls real my.tradePay(tradeNO)
      sendToMiniProgram('INITIATE_PAYMENT', { tradeNO, amount })
    })
  }
 
  return { pay, loading, error, lastResult }
}