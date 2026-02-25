/ src/composables/usePayment.js
 
import { ref } from 'vue'
import { useCartStore } from '@/stores/cart'
import { mockCreateOrder } from '@/mock/mockAPI'
 
export function usePayment() {
  const cartStore = useCartStore()
  const loading   = ref(false)
  const error     = ref(null)
  const lastResult = ref(null)
 
  async function pay(orderDetails) {
    loading.value = true
    error.value   = null

    try {
      window.alert(
        '\ud83d\udfe1 [MOCK] Step 1: Create Order\n\n' +
        `Total: R ${Number(orderDetails.totalAmount).toFixed(2)}\n` +
        `Items: ${orderDetails.items?.length || 0}\n\n` +
        'In production, this POSTs to your backend which calls\n' +
        'VodaPay /v2/payments/pay to get a tradeNO.\n\n' +
        'Calling mock API\u2026'
      )
      const { tradeNO, orderId } = await mockCreateOrder(orderDetails)
      window.alert(
        '\u2705 Order Created (Mock)\n\n' +
        `Order ID:  ${orderId}\n` +
        `Trade No:  ${tradeNO}\n\n` +
        '\ud83d\udce8 Now sending INITIATE_PAYMENT to Mini Program.\n' +
        'Watch for the \ud83d\udfe1 [MOCK] payment sheet alert on the native layer.'
      )
      const result = await triggerPayment(tradeNO, orderDetails.totalAmount)
      lastResult.value = result
      if (result.resultCode === '9000') {
        cartStore.clearCart()
        window.alert(
          '\ud83d\udce9 Mini Program \u2192 H5\n\n' +
          'Received: PAYMENT_SUCCESS\n\n' +
          `resultCode: ${result.resultCode} (Success)\n` +
          `tradeNO: ${result.tradeNO}\n\n` +
          'Cart has been cleared. Order is confirmed!'
        )
      } else if (result.cancelled) {
        window.alert(
          '\ud83d\udce9 Mini Program \u2192 H5\n\n' +
          'Received: PAYMENT_FAIL\n\n' +
          `resultCode: ${result.resultCode} (Cancelled by user)\n\n` +
          'Cart has been preserved. User can try again.'
        )
      }
      return result
    } catch (err) {
      error.value = err.message || 'Payment failed'
      window.alert(`\u274c Payment Error\n\n${error.value}`)
      throw err
    } finally {
      loading.value = false
    }
  }
 
  return { pay, loading, error, lastResult }
}


