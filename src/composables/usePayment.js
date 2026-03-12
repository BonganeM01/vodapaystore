// src/composables/usePayment.js
import { ref } from 'vue'
import { useVodaPayBridge } from './useVodaPayBridge'
import { useCartStore } from '@/stores/cart'
import { useAuthStore } from '@/stores/auth'
 
export function usePayment() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge()
  const cartStore = useCartStore()
  const authStore = useAuthStore()
 
  const loading   = ref(false)
  const error     = ref(null)
  const lastResult = ref(null)

 
  async function pay(orderDetails) {
    loading.value = true
    error.value   = null
 
    try {
      window.alert(
        '🟡 Creating order on backend...\n\n' +
        `Total: R ${Number(orderDetails.totalAmount).toFixed(2)}\n` +
        `Items: ${orderDetails.items?.length || 0}`
      )
      
      const CLIENT_ID = '2020122653946739963336';
      const requestTime = new Date().toISOString().replace('Z', '+02:00');
      const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur'; 

      const body = {
        productcode: "CASHIER_PAYMENT",
        salesCode: "51051000101000000011",
        paymentNotifyUrl: "http://mock.vision.vodacom.aws.corp/mock/api/v1/payments/notifyPayment.htm", // Change to real notify URL later
        paymentRequestId: "c0a83b17161398737179310015310",
        paymentRedirectUrl: "https://vodapaystore.vercel.app/checkout",
        paymentExpiryTime: "3022-02-22T17:49:31+08:00",
        paymentAmount: {
          currency:  "ZAR",
          value: orderDetails.totalAmount.toString()
        },
        order: {
          goods: {
            referenceGoodsId: "goods123",
            goodsUnitAmount: {
              currency:  "ZAR",
              value: orderDetails.totalAmount.toString()
            },
            goodsName: "VodaPay Store Purchase"
          },
          env: {
            terminalType: "MINI_APP"
          },
          orderDescription: "VodaPay Store Purchase",
          buyer: {
            referenceBuyerId: authStore.user?.id || "216610000000446291765" 
          }
        },
      extendInfo: "{}"
      };

      const orderResponse = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/payments/pay', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Client-Id': CLIENT_ID,
          'Request-Time': requestTime,
          'Signature': signatureHeader
        },
        body: JSON.stringify(body)
      })

      window.alert("[Backend] Order creation response status: " + JSON.stringify(orderResponse.result))
 
      if (!orderResponse.ok) {
        const errText = orderResponse.text()
        throw new Error(`Order creation failed: ${errText}`)
      }

      const paymentUrl = orderResponse.redirectActionForm.redirectUrl;

      if(!paymentUrl) {
        throw new Error('No payment URL received from backend', JSON.stringify(orderResponse))
      }
 
      window.alert(
        '✅ Order created\n\n' +
        `Payment ID: ${paymentId}\n` +
        'Opening VodaPay cashier page...'
      )
 
      // Send paymentUrl to Mini Program for my.tradePay
      const result = await triggerPayment(paymentUrl)
 
      lastResult.value = result
 
      if (result.resultCode === '9000') {
        cartStore.clearCart()
        window.alert('📩 Payment SUCCESS – Order confirmed!')
      } else if (result.resultCode === '6001') {
        window.alert('📩 Payment CANCELLED')
      } else {
        window.alert(`❌ Payment FAILED: ${result.errMsg || result.resultCode}`)
      }
 
      return result;
 
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
        unsubSuccess()
        unsubFail()
        resolve(data)
      })
 
      const unsubFail = onMessage('PAYMENT_FAIL', (data) => {
        unsubSuccess()
        unsubFail()
        resolve({ ...data, cancelled: data.resultCode === '6001' })
      })
 
      sendToMiniProgram('INITIATE_PAYMENT', { paymentUrl })
    })
  }
 
  return { pay, loading, error, lastResult }
}


// // src/composables/usePayment.js
// import { ref } from "vue";
// import { useVodaPayBridge } from "./useVodaPayBridge";
// import { useCartStore } from "@/stores/cart";

// export function usePayment() {
//   const { sendToMiniProgram, onMessage } = useVodaPayBridge();
//   const cartStore = useCartStore();
//   const loading = ref(false);
//   const error = ref(null);
//   const lastResult = ref(null);

//   // Real payment flow
//   async function pay(orderDetails) {
//     loading.value = true;
//     error.value = null;

//     try {
//       // Step 1: Simulate backend order creation (with mock tradeNO)
//       window.alert(
//         "🟡 Creating order...\n\n" +
//           `Total: R ${Number(orderDetails.totalAmount).toFixed(2)}\n` +
//           `Items: ${orderDetails.items?.length || 0}\n\n` +
//           "Sending to backend...",
//       );

//       // Mock backend call
//       // generate mock tradeNO and orderId
//       const mockTradeNO = `TEST_TRADE_${Date.now()}_${Math.random().toString(36).slice(2)}`;
//       const mockOrderId = `ORDER_${Date.now()}`;

//       window.alert(
//         "✅ Order created successfully\n\n" +
//           `Order ID:  ${mockOrderId}\n` +
//           `Trade No:  ${mockTradeNO}\n\n` +
//           'Opening "Simulated" VodaPay cashier...',
//       );

//       // Step 2: Trigger real my.tradePay in mini app
//       // const result = await triggerPayment(mockTradeNO, orderDetails.totalAmount)
//       const result = await triggerPayment();

//       lastResult.value = result;

//       if (result.resultCode === "9000") {
//         // Payment successful
//         cartStore.clearCart();

//         window.alert(
//           "📩 Payment SUCCESS\n\n" +
//             `resultCode: ${result.resultCode} (Success)\n` +
//             `tradeNO: ${result.tradeNO}\n\n` +
//             "Cart cleared. Order confirmed!",
//         );
//       } else if (result.resultCode === "6001") {
//         // Payment failed

//         window.alert(
//           "📩 Payment CANCELLED\n\n" +
//             `resultCode: ${result.resultCode || "6001"}\n\n` +
//             "Cart preserved. You can try again.",
//         );
//       } else {
//         window.alert(
//           "❌ Payment FAILED\n\n" +
//             `resultCode: ${result.resultCode}\n` +
//             `Message: ${result.errMsg || "Unknown error"}\n\n` +
//             "Please try again or contact support.",
//         );
//       }

//       return result;
//     } catch (err) {
//       error.value = err.message || "Payment failed";
//       window.alert(`❌ Payment Error\n\n${error.value}`);
//       console.error("Payment flow error:", err);
//       throw err;
//     } finally {
//       loading.value = false;
//     }
//   }

//   // Send tradeNO to Mini Program → triggers real my.tradePay in my "INITIATE_PAYMENT" handler
//   function triggerPayment(tradeNO, amount = 0) {
//     return new Promise((resolve, reject) => {

//       const unsubSuccess = onMessage('PAYMENT_SUCCESS', (data) => {
//         unsubSuccess()
//         unsubFail()
//         resolve(data)
//       })

//       const unsubFail = onMessage('PAYMENT_FAIL', (data) => {
//         unsubSuccess()
//         unsubFail()
//         if (data.resultCode === '6001') {
//           resolve({ ...data, cancelled: true })
//         } else {
//           reject(new Error(`Payment failed: ${data.resultCode || 'unknown'}`))
//         }
//       })

//       sendToMiniProgram('INITIATE_PAYMENT', { tradeNO, amount })
//     })
//   }

//   return { pay, loading, error, lastResult };
// }
