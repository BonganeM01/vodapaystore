// // src/composables/usePayment.js
// import { ref } from 'vue'
// import { useVodaPayBridge } from './useVodaPayBridge'
// import { useCartStore } from '@/stores/cart'
// import { useAuthStore } from '@/stores/auth'
 
// export function usePayment() {
//   const { sendToMiniProgram, onMessage } = useVodaPayBridge()
//   const cartStore = useCartStore()
//   const authStore = useAuthStore()
 
//   const loading   = ref(false)
//   const error     = ref(null)
//   const lastResult = ref(null)
 
//   async function pay() {
//     loading.value = true
//     error.value   = null
 
//     try {
//       const totalAmount = cartStore.totalPrice
//       const items = cartStore.items
 
//       if (totalAmount <= 0 || items.length === 0) {
//         throw new Error('Cart is empty. Please add items before checking out.')
//       }
 
//       window.alert(
//         '🟡 Creating order on backend...\n\n' +
//         `Total: R ${totalAmount.toFixed(2)}\n` +
//         `Items: ${items.length}`
//       )
 
//       const orderResponse = await fetch('/api/orders/create', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           items,
//           totalAmount: totalAmount.toString() || '2000',
//           currency: 'ZAR',
//           userId: authStore.user?.id,
//           description: 'VodaPay Store Purchase'
//         })
//       })
 
//       if (!orderResponse.ok) {
//         const err = await orderResponse.json().catch(() => ({}));
//         throw new Error(err.error || `Order creation failed (${orderResponse.status})`);
//       }
 
//       const response = await orderResponse.json();

//       const paymentId = response.paymentId;
//       const paymentUrl = (response && response.paymentUrl) || (response && response.redirectActionForm && response.redirectActionForm.redirectUrl) || null

//       if (!paymentUrl) {
//         throw new Error('No redirect URL provided in order response');
//       }
 
//       window.alert(
//         '✅ Order created\n\n' +
//         `Payment ID: ${paymentId}\n` +
//         `Payment URL: ${paymentUrl}\n` +
//         'Opening VodaPay cashier page...'
//       )
 
//       sendToMiniProgram('INITIATE_PAYMENT', { paymentUrl })


 
      
//       // const normalizedResultCode = result && result.resultCode? result.resultCode : 'UNKNOWN'

      
//       // if (normalizedResultCode === '9000') {
//       //   cartStore.clearCart()
//       //   window.alert('📩 Payment SUCCESS – Order confirmed!')
//       // } else if (normalizedResultCode === '6001') {
//       //   window.alert('📩 Payment CANCELLED')
//       // } else {
//       //   const readableErrorMessage =
//       //     (paymentResult && (paymentResult.errMsg || paymentResult.message || paymentResult.error)) ||
//       //     'Unknown error'
//       //   window.alert('❌ Payment FAILED: ' + readableErrorMessage + ' (' + normalizedResultCode + ')')
//       // }
//       //return paymentResult
//     } catch (err) {
//       error.value = err && err.message ? err.message : String(err)
//       window.alert('❌ Payment Error\n\n' + error.value)
//       console.error('[pay] Error:', err)
//       throw err
//     } finally {
//       loading.value = false
//     }

//   }

 
//   return { pay, loading, error, lastResult }
// }


// src/composables/usePayment.js
import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'

//Helpers
function toLocalISO(date = new Date()) {
  // Formats to ISO-8601 with timezone offset
  const off = date.getTimezoneOffset();
  const absoff = Math.abs(off);
  const d = new Date(date.getTime() - off * 60 * 1000);
  const base = d.toISOString().substring(0, 23);
  const sign = off > 0 ? '-' : '+';
  const hh = String(Math.floor(absoff / 60)).padStart(2, '0');
  const mm = String(absoff % 60).padStart(2, '0');
  return `${base}${sign}${hh}:${mm}`;
}

function generateRequestTime() {
  const d = new Date(Date.now() + 2 * 3600000); // shift UTC to +02:00
  const pad = n => (n < 10 ? '0' + n : n);

  return (
    d.getUTCFullYear() + '-' +
    pad(d.getUTCMonth() + 1) + '-' +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) + ':' +
    pad(d.getUTCMinutes()) + ':' +
    pad(d.getUTCSeconds()) +
    '+02:00');
}
 
export function usePayment() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const cartStore = useCartStore()
  const authStore = useAuthStore()
 
  const loading   = ref(false)
  const error     = ref(null)
  const lastResult = ref(null)

  
  async function pay() {
    loading.value = true
    error.value   = null
 
    try {
      const totalAmount = cartStore.totalPrice
      const items = cartStore.items
 
      if (totalAmount <= 0 || items.length === 0) {
        throw new Error('Cart is empty')
      }
 
      const CLIENT_ID = '2020122653946739963336'
      const requestTime = generateRequestTime()
      const paymentExpiryTime = toLocalISO(new Date(Date.now() + 30 * 60 * 1000)).toString();
 
      const body = {
        productCode: "CASHIER_PAYMENT",
        salesCode: "51051000101000000011",
        paymentNotifyUrl: "https://vodapaynotify-production.up.railway.app/api/notify",
        paymentRequestId: "c0a83b1716139873717931001530554",
        paymentRedirectUrl: "https://vodapaystore.vercel.app/checkout",
        paymentExpiryTime: paymentExpiryTime,
        paymentAmount: { currency: "ZAR", value: '2000' },
        order: {
          goods: {
            referenceGoodsId: items[0]?.product?.id?.toString() || "goods123",
            goodsUnitAmount: { currency: "ZAR", value: '2000' },
            goodsName: items[0]?.product?.name || "VodaPay Store Purchase"
          },
          env: { terminalType: "MINI_APP" },
          orderDescription: "VodaPay Store Purchase",
          buyer: { referenceBuyerId: authStore.user?.id }
        },
        extendInfo: "{}"
      }
 
      // Step 1: Get signature from backend
      const signRes = await fetch('/api/vodapay/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'POST',
          path: '/v2/payments/pay',
          headers: {
            'Client-Id': CLIENT_ID,
            'Request-Time': requestTime
          },
          body: body
        })
      })
 
      const { signature } = await signRes.json()
 
      // Step 2: Call real VodaPay API with signature
      const vodapayRes = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/payments/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Id': CLIENT_ID,
          'Request-Time': requestTime,
          'Signature': signature
        },
        body: JSON.stringify(body)
      })
 
      const vodapayData = await vodapayRes.json()
 
      window.alert('[Payment] FULL RESPONSE:\n\n' + JSON.stringify(vodapayData, null, 2))
 
      const paymentUrl = vodapayData.redirectActionForm?.redirectUrl
 
      if (!paymentUrl) {
        throw new Error('No paymentUrl received')
      }
 
      //continue with payment if response signature is valid
      const result = await triggerPayment(paymentUrl)
 
      lastResult.value = result
 
      if (result.resultCode === '9000') {
        cartStore.clearCart()
        window.alert('Payment SUCCESS!')
      } else if (result.resultCode === '6001') {
        window.alert('Payment CANCELLED')
      } else {
        window.alert(`Payment FAILED: ${result.errMsg || result.resultCode}`)
      }
 
      return result
 
    } catch (err) {
      error.value = err.message
      window.alert(`❌ Payment Error\n\n${error.value}`)
      throw err
    } finally {
      loading.value = false
    }
  }
 
  function triggerPayment(paymentUrl) {
    return new Promise((resolve, reject) => {
      const unsubSuccess = onMessage('PAYMENT_SUCCESS', (data) => {
        unsubSuccess(); unsubFail(); resolve(data)
      })
 
      const unsubFail = onMessage('PAYMENT_FAIL', (data) => {
        unsubSuccess(); unsubFail()
        resolve({ ...data, cancelled: data.resultCode === '6001' })
      })
 
      sendToMiniProgram('INITIATE_PAYMENT', { paymentUrl })
    })
  }
 
  return { pay, loading, error, lastResult }
}



