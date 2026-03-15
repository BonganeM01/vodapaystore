// src/composables/usePayment.js
import { ref } from 'vue';
import { useVodaPayBridge } from './useVodaPayBridge';
import { useCartStore } from '@/stores/cart';
import { useAuthStore } from '@/stores/auth';

export function usePayment() {
  const { sendToMiniProgram, onMessage } = useVodaPayBridge();
  const cartStore = useCartStore();
  const authStore = useAuthStore();

  const loading = ref(false);
  const error = ref(null);
  const lastResult = ref(null);

  async function pay() {
    loading.value = true;
    error.value = null;

    try {
      const totalAmount = cartStore.totalPrice;
      const items = cartStore.items || [];

      if (!totalAmount || items.length === 0) {
        throw new Error('Cart is empty. Please add items before checking out.');
      }

      window.alert(
        '🟡 Creating order on backend...\n\n' +
        'Total: R ' + Number(totalAmount).toFixed(2) + '\n' +
        'Items: ' + items.length
      );

      // Prepare the minimal payload your backend needs
      const cents = String(Math.round(Number(totalAmount) * 100));
      const buyerId = authStore && authStore.user && authStore.user.id
        ? String(authStore.user.id)
        : null;

      const resp = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: { currency: 'ZAR', value: "2000" },
          // items: items.map(function(i) {
          //   return { id: i.id, name: i.name, cents: String(i.cents || 0) };
          // }),
          buyerId: buyerId,
          orderDescription: 'VodaPay Store Purchase',
          goodsName: 'VodaPay Store Purchase'
        })
      });

      const status = resp.status;
      window.alert('[Backend] Order creation response status: ' + status);

      const apiResponse = await resp.json();

      if (!resp.ok) {
        throw new Error('Order creation failed: ' + JSON.stringify(apiResponse));
      }

      window.alert('[Backend] Order creation Full response: \n\n' + JSON.stringify(apiResponse, null, 2));

      // Extract fields without optional chaining
      var paymentUrl = null;
      var paymentId = null;
      if (apiResponse) {
        paymentId = apiResponse.paymentId || null;
        if (apiResponse.redirectActionForm && apiResponse.redirectActionForm.redirectUrl) {
          paymentUrl = apiResponse.redirectActionForm.redirectUrl;
        }
      }

      if (!paymentUrl) {
        throw new Error('No redirect URL received from backend.');
      }

      // Send paymentUrl to Mini Program for my.tradePay
      const result = await triggerPayment(paymentUrl);
      lastResult.value = result;

      if (result && result.resultCode === '9000') {
        cartStore.clearCart();
        window.alert('📨 Payment SUCCESS – Order confirmed!');
      } else if (result && result.resultCode === '6001') {
        window.alert('📨 Payment CANCELLED');
      } else {
        var msg = (result && (result.errMsg || result.resultCode)) ? (result.errMsg || result.resultCode) : 'Unknown error';
        window.alert('❌ Payment FAILED: ' + msg);
      }

      window.alert(
        '✅ Order created\n\n' +
        'Payment ID: ' + (paymentId || '') + '\n' +
        'Opening VodaPay cashier page...'
      );

      return result;

    } catch (err) {
      error.value = err && err.message ? err.message : String(err);
      window.alert('❌ Payment Error\n\n' + error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function triggerPayment(paymentUrl) {
    return new Promise(function(resolve) {
      const unsubSuccess = onMessage('PAYMENT_SUCCESS', function(data) {
        unsubSuccess();
        unsubFail();
        resolve(data);
      });
      const unsubFail = onMessage('PAYMENT_FAIL', function(data) {
        unsubSuccess();
        unsubFail();
        resolve({ ...data, cancelled: data && data.resultCode === '6001' });
      });
      sendToMiniProgram('INITIATE_PAYMENT', { paymentUrl: paymentUrl });
    });
  }

  return { pay, loading, error, lastResult };
}








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

//       if(!totalAmount || items.length === 0){
//         throw new Error('Cart is empty. Please add items before checking out.')
//       }

//       window.alert(
//         '🟡 Creating order on backend...\n\n' +
//         `Total: R ${Number(totalAmount).toFixed(2)}\n` +
//         `Items: ${items.length}`
//       )
      
//       const CLIENT_ID = '2020122653946739963336';
//       const requestTime = new Date().toISOString().replace('Z', '+02:00');
//       const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur'; 

//       const body = {
//         "productCode": "CASHIER_PAYMENT",
//         "salesCode": "51051000101000000011",
//         "paymentNotifyUrl": "http://mock.vision.vodacom.aws.corp/mock/api/v1/payments/notifyPayment.htm",
//         "paymentRequestId": "c0a83b17161398737179310015875",
//         "paymentRedirectUrl": "https://vodapaystore.vercel.app/checkout",
//         "paymentExpiryTime": "3022-02-28T14:49:31+02:00",
//         "paymentAmount": {
//           "currency":  "ZAR",
//            "value": "2000"
//         },
//         "order": {
//           "goods": {
//             "referenceGoodsId": "goods123",
//             "goodsUnitAmount": {
//               "currency":  "ZAR",
//               "value": "2000"
//             },
//             "goodsName": "VodaPay Store Purchase"
//           },
//           "env": {
//             "terminalType" : "MINI_APP"
//           },
//           "orderDescription": "VodaPay Store Purchase",
//           "buyer": {
//             "referenceBuyerId": authStore.user?.id || "216610000000446291765"
//           }
//         },
//         "extendInfo": "{}"
//       };

//       const orderResponse = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/payments/pay', {
//         method: 'POST',
//         headers: { 
//           'Content-Type': 'application/json',
//           'Client-Id': CLIENT_ID,
//           'Request-Time': requestTime,
//           'Signature': signatureHeader
//         },
//         body: JSON.stringify(body)
//       })

//       window.alert("[Backend] Order creation response status: " + JSON.stringify(orderResponse.status))
 
//       if (!orderResponse.ok) {
//         const errText = await orderResponse.text()
//         throw new Error(`Order creation failed: ${errText}`)
//       }

//       const apiResponse = await orderResponse.json()

//       window.alert("[Backend] Order creation Full response: \n\n" + JSON.stringify(apiResponse, null, 2))

//       const paymentUrl = apiResponse?.redirectActionForm?.redirectUrl;
//       const paymentId = apiResponse?.paymentId;
 
//       // Send paymentUrl to Mini Program for my.tradePay
//       const result = await triggerPayment(paymentUrl)
 
//       lastResult.value = result
 
//       if (result.resultCode === '9000') {
//         cartStore.clearCart()
//         window.alert('📩 Payment SUCCESS – Order confirmed!')
//       } else if (result.resultCode === '6001') {
//         window.alert('📩 Payment CANCELLED')
//       } else {
//         window.alert(`❌ Payment FAILED: ${result.errMsg || result.resultCode}`)
//       }

//       window.alert(
//         '✅ Order created\n\n' +
//         `Payment ID: ${paymentId}\n` +
//         'Opening VodaPay cashier page...'
//       )

//       return result;
 
//     } catch (err) {
//       error.value = err.message
//       window.alert(`❌ Payment Error\n\n${error.value}`)
//       throw err
//     } finally {
//       loading.value = false
//     }
//   }
 
//   function triggerPayment(paymentUrl) {
//     return new Promise((resolve, reject) => {
//       const unsubSuccess = onMessage('PAYMENT_SUCCESS', (data) => {
//         unsubSuccess()
//         unsubFail()
//         resolve(data)
//       })
 
//       const unsubFail = onMessage('PAYMENT_FAIL', (data) => {
//         unsubSuccess()
//         unsubFail()
//         resolve({ ...data, cancelled: data.resultCode === '6001' })
//       })
 
//       sendToMiniProgram('INITIATE_PAYMENT', { paymentUrl })
//     })
//   }
 
//   return { pay, loading, error, lastResult }
// }




