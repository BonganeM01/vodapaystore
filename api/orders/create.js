// api/orders/create.js
import crypto from 'crypto';

function uniquePaymentRequestId() {
  // 32–64 chars unique ID: timestamp + random. Avoid reuse across attempts.  
  const ts = Date.now().toString(36);
  const rnd = crypto.randomBytes(12).toString('hex'); // 24 chars
  return `${ts}${rnd}`; 
}


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


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  try {
    const { items, totalAmount, currency = 'ZAR', userId, description } = req.body || {};
 
    if (!totalAmount || totalAmount <= 0 || !items?.length) {
      return res.status(400).json({ error: 'Missing totalAmount or items' });
    }
 
    const CLIENT_ID = '2020122653946739963336';
    const requestTime = new Date().toISOString().replace('Z', '+02:00');
    const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur';
 
    const paymentRequestId = uniquePaymentRequestId().toString();
    const paymentExpiryTime = (toLocalISO(new Date(Date.now() + 30 * 60 * 1000))).toString();
 
    const body = {
      productCode: "CASHIER_PAYMENT",
      salesCode: "51051000101000000011",
      paymentNotifyUrl: "http://mock.vision.vodacom.aws.corp/mock/api/v1/payments/notifyPayment.htm",
      paymentRequestId: paymentRequestId,
      paymentRedirectUrl: "https://vodapaystore.vercel.app/checkout",
      paymentExpiryTime: paymentExpiryTime,
      paymentAmount: {
        currency: currency,
        value: "2000" 
      },
      order: {
        goods: {
          referenceGoodsId: items[0]?.product?.id?.toString() || "goods123",
          goodsUnitAmount: {
            currency: currency,
            value:"2000"
          },
          goodsName: items[0]?.product?.name || "VodaPay Store Purchase"
        },
        env: {
          terminalType: "MINI_APP"
        },
        orderDescription: description || "VodaPay Store Purchase",
        buyer: {
          referenceBuyerId: userId || "216610000000446291765"
        }
      },
      extendInfo: "{}"
    };
 
    console.log('[Backend] Sending to VodaPay:', body);
 
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
 
    console.log('[Backend] VodaPay response:', vodapayData);
 
    if (vodapayData.result?.resultStatus === 'A' && vodapayData.redirectActionForm?.redirectUrl) {
      res.status(200).json({
        paymentUrl: vodapayData.redirectActionForm.redirectUrl,
        paymentId: vodapayData.paymentId,
        orderId: paymentRequestId
      });
    } else {
      res.status(400).json({ 
        error: vodapayData.result?.resultMessage || 
               vodapayData.message || 
               'Failed to create payment',
        fullResponse: vodapayData
      });
    }
  } catch (err) {
    console.error('[Backend] Error:', err);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: err.message 
    });
  }
}