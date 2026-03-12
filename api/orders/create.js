// api/orders/create.js

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  const { items, totalAmount, currency = 'ZAR', userId, description } = req.body;
 
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
      currency: currency,
      value: totalAmount.toString()
    },
    order: {
      goods: {
        referenceGoodsId: "goods123",
        goodsUnitAmount: {
          currency: currency,
          value: "2000" 
        },
        goodsName: items?.[0]?.product?.name || "VodaPay Store Purchase"
      },
      env: {
        terminalType: "MINI_APP"
      },
      orderDescription: description || "VodaPay Store Purchase",
      buyer: {
        referenceBuyerId: userId
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
 
    window.alert('[Backend] VodaPay /payments/pay response:\n\n', JSON.stringify(vodapayData));
 
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