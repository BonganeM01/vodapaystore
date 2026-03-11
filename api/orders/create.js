// api/orders/create.js

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  const { items, totalAmount, currency = 'ZAR', userId, description } = req.body;
 
  const CLIENT_ID = '2020122653946739963336';
  const requestTime = new Date().toISOString().replace('Z', '+02:00');
  const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur'; // Replace with real signature in production
 
  const paymentRequestId = `PAY_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const paymentExpiryTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
 
  const body = {
    productcode: "CASHIER_PAYMENT",
    salesCode: "51051000101000000011",
    paymentNotifyUrl: "http://mock.vision.vodacom.aws.corp/mock/api/v1/payments/notifyPayment.htm", // Change to real notify URL later
    paymentRequestId: paymentRequestId,
    paymentRedirectUrl: "http://mock.vision.vodacom.aws.corp/mock/api/v1/payments/notifyPayment.htm", // Change to checkout success page
    paymentExpiryTime: paymentExpiryTime,
    paymentAmount: {
      currency: currency,
      value: totalAmount.toString()
    },
    order: {
      goods: {
        referenceGoodsId: "goods123",
        goodsUnitAmount: {
          currency: currency,
          value: "2000" // Adjust per item if needed
        },
        goodsName: items?.[0]?.product?.name || "VodaPay Store Purchase"
      },
      env: {
        terminalType: "MINI_APP"
      },
      orderDescription: description || "VodaPay Store Purchase",
      buyer: {
        referenceBuyerId: userId || "anonymous"
      }
    },
    extendInfo: "{}"
  };
 
  try {
    const vodapayRes = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/payments/pay', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': CLIENT_ID,
        'Request-Time': requestTime,
        'Signature': signatureHeader
      },
      body: JSON.stringify(body)
    });
 
    const vodapayData = await vodapayRes.json();
 
    console.log('[Backend] VodaPay /payments/pay response:', vodapayData);
 
    if (vodapayData.result?.resultStatus === 'A' && vodapayData.redirectActionForm?.redirectUrl) {
      // Store order in memory (for demo)
      global.orders = global.orders || [];
      global.orders.push({
        orderId: paymentRequestId,
        tradeNO: vodapayData.paymentId,
        status: 'pending',
        amount: totalAmount
      });
 
      res.status(200).json({
        paymentUrl: vodapayData.redirectActionForm.redirectUrl,
        paymentId: vodapayData.paymentId,
        orderId: paymentRequestId
      });
    } else {
      res.status(400).json({ 
        error: vodapayData.result?.resultMessage || 'Failed to create payment' 
      });
    }
  } catch (err) {
    console.error('[Backend] Error calling VodaPay:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
//your-domain.com
 