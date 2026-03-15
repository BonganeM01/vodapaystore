// api/orders/create.js

// Vercel Serverless Function: /api/pay
// Node.js runtime v18+ (uses global fetch)
// Reads env: VODAPAY_CLIENT_ID, VODAPAY_KEY_VERSION, VODAPAY_PRIVATE_KEY, VODAPAY_SALES_CODE,
//            VODAPAY_BASE_URL (default sandbox), VODAPAY_NOTIFY_URL, VODAPAY_REDIRECT_URL,
//            VODAPAY_DEFAULT_BUYER_ID
//
// IMPORTANT:
// - The signing logic uses RSA-SHA256 over the RAW JSON body string.
//   If your merchant onboarding specifies a different canonical string, adjust `buildSigningString`.
// - Request-Time formatting follows community guidance used in VodaPay integrations.  

import crypto from 'crypto';

function json(res, code, data) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function methodNotAllowed(res) {
  json(res, 405, { error: 'Method Not Allowed' });
}

function badRequest(res, message) {
  json(res, 400, { error: message || 'Bad Request' });
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

function uniquePaymentRequestId() {
  // 32–64 chars unique ID: timestamp + random. Avoid reuse across attempts.  
  const ts = Date.now().toString(36);
  const rnd = crypto.randomBytes(12).toString('hex'); // 24 chars
  return `${ts}${rnd}`; // ~30+ chars
}

function buildSigningString(bodyString) {
  // Adjust this if your merchant spec requires path/method/headers in the canonical string.
  // Many integrations sign the raw body. Keeping it simple and explicit here.
  return bodyString;
}

function computeSignature(privateKeyPem, signingString) {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingString);
  signer.end();
  return signer.sign(privateKeyPem, 'base64');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  try {
    const {
      amount,            // { currency: 'ZAR', value: '2000' }  (minor units)
      items,             // optional; for your own records
      buyerId,           // optional; fallback to env
      orderDescription,  // optional; fallback to a sensible default
      referenceGoodsId,  // optional
      goodsName          // optional
    } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    // Basic validation
    if (!amount || !amount.currency || !amount.value) {
      return badRequest(res, 'Missing required "amount" (currency, value).');
    }

    // Env
    const CLIENT_ID     = process.env.VODAPAY_CLIENT_ID || '2020122653946739963336';
    const KEY_VERSION   = process.env.VODAPAY_KEY_VERSION || '1';
    //const PRIVATE_KEY   = process.env.VODAPAY_PRIVATE_KEY; // PKCS#8 PEM
    const SALES_CODE    = process.env.VODAPAY_SALES_CODE || '51051000101000000011';
    const BASE_URL      = process.env.VODAPAY_BASE_URL || 'https://vodapay-gateway.sandbox.vfs.africa';
    const NOTIFY_URL    = process.env.VODAPAY_NOTIFY_URL || 'https://example.com/api/vodapay/notify';
    const REDIRECT_URL  = process.env.VODAPAY_REDIRECT_URL || 'https://vodapaystore.vercel.app/checkout';
    const DEFAULT_BUYER = process.env.VODAPAY_DEFAULT_BUYER_ID || '216610000000446291765';

    if (!CLIENT_ID /*|| !PRIVATE_KEY*/) {
      return badRequest(res, 'Server misconfigured: missing VODAPAY_CLIENT_ID.');
    }

    // the official pay body 
    const payBody = {
      productCode: 'CASHIER_PAYMENT',
      salesCode: SALES_CODE,
      paymentNotifyUrl: NOTIFY_URL,
      paymentRequestId: uniquePaymentRequestId(),
      paymentRedirectUrl: REDIRECT_URL,
      paymentExpiryTime: toLocalISO(new Date(Date.now() + 30 * 60 * 1000)),
      paymentAmount: {
        currency:"ZAR",
        value:"2000",
      },
      order: {
        goods: {
          referenceGoodsId: 'goods123',
          goodsUnitAmount: {
            currency:  "ZAR",
            value: "2000"
          },
          goodsName: goodsName || 'VodaPay Store Purchase'
        },
        env: {
          terminalType: 'MINI_APP'
        },
        orderDescription: orderDescription || 'VodaPay Store Purchase',
        buyer: {
          referenceBuyerId: buyerId ? String(buyerId) : String(DEFAULT_BUYER)
        }
      },
      extendInfo: '{}'
    };

    const bodyString  = JSON.stringify(payBody);
    const requestTime = toLocalISO();

    // Build Signature header: algorithm=RSA256,keyVersion={KEY_VERSION},signature={base64}
    const signingString = buildSigningString(bodyString /*, requestTime, '/v2/payments/pay' */);
    const signatureB64  = computeSignature(PRIVATE_KEY, signingString);
    const signatureHdr  = `algorithm=RSA256,keyVersion=${KEY_VERSION},signature=${signatureB64}`;

    // Forward to VodaPay Sandbox
    const gatewayUrl = `${BASE_URL}/v2/payments/pay`;
    const gwResp = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': CLIENT_ID,
        'Request-Time': requestTime,
        'Signature': signatureHdr
      },
      body: bodyString
    });

    const text = await gwResp.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    if (!gwResp.ok) {
      return json(res, gwResp.status, {
        error: 'VodaPay gateway error',
        status: gwResp.status,
        response: data
      });
    }

    // Success: return gateway response (includes paymentId & redirectActionForm.redirectUrl)
    return json(res, 200, data);

  } catch (err) {
    return json(res, 500, { error: 'Server error', message: err && err.message ? err.message : String(err) });
  }
}

// export default async function handler(req, res) {

//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }
 
//   const { items, totalAmount, currency = 'ZAR', userId, description } = req.body;
 
//   const CLIENT_ID = '2020122653946739963336';
//   const requestTime = new Date().toISOString().replace('Z', '+02:00');
//   const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur';
 
//   const body = {
//         productCode: "CASHIER_PAYMENT",
//         salesCode: "51051000101000000011",
//         paymentNotifyUrl: "http://mock.vision.vodacom.aws.corp/mock/api/v1/payments/notifyPayment.htm",
//         paymentRequestId: "c0a83b17161398737179310015875",
//         paymentRedirectUrl: "https://vodapaystore.vercel.app/checkout",
//         paymentExpiryTime: "3022-02-re:49:31+02:00",
//         paymentAmount: {
//           currency:  "ZAR",
//            value: "2000"
//         },
//         order: {
//           goods: {
//             referenceGoodsId: "goods123",
//             goodsUnitAmount: {
//               currency:  "ZAR",
//               value: "2000"
//             },
//             goodsName: "VodaPay Store Purchase"
//           },
//           env: {
//             terminalType: "MINI_APP"
//           },
//           orderDescription: "VodaPay Store Purchase",
//           buyer: {
//             referenceBuyerId: "216610000000446291765" 
//           }
//         },
//       extendInfo: "{}"
//     };
 
//   try {
//     const vodapayRes = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/payments/pay', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Client-Id': CLIENT_ID,
//         'Request-Time': requestTime,
//         'Signature': signatureHeader
//       },
//       body: JSON.stringify(body)
//     });
 
//     const vodapayData = await vodapayRes.json();
 
//     window.alert('[Backend] VodaPay /payments/pay response:\n\n', JSON.stringify(vodapayData));
 
//     if (vodapayData.result?.resultStatus === 'A' && vodapayData.redirectActionForm?.redirectUrl) {
//       // Store order in memory (for demo)
//       global.orders = global.orders || [];
//       global.orders.push({
//         orderId: paymentRequestId,
//         tradeNO: vodapayData.paymentId,
//         status: 'pending',
//         amount: totalAmount
//       });
 
//       res.status(200).json({
//         paymentUrl: vodapayData.redirectActionForm.redirectUrl,
//         paymentId: vodapayData.paymentId,
//         orderId: paymentRequestId
//       });
//     } else {
//       res.status(400).json({ 
//         error: vodapayData.result?.resultMessage || 'Failed to create payment' 
//       });
//     }
//   } catch (err) {
//     console.error('[Backend] Error calling VodaPay:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// }