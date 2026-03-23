// api/notify.js
import crypto from 'crypto';

// api/notify.js
export const config = {
  api: { bodyParser: false }
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('[Notify] Invalid method:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get raw body — must be used exactly as received for signature
    const rawBodyBuffer = await getRawBody(req);
    const rawBody = rawBodyBuffer.toString('utf8');

    // Extract relevant headers (case-insensitive lookup)
    const signatureHeader = req.headers['signature'] || req.headers['Signature'];
    const clientId = req.headers['client-id'] || req.headers['Client-Id'];
    //const responseTime = req.headers['response-time'] || req.headers['Response-Time'];
    const requestTime = req.headers['request-time'] || req.headers['Request-Time'];

    // Log everything for debugging
    console.log('[Notify] FULL INCOMING HEADERS:', JSON.stringify(req.headers, null, 2));
    console.log('[Notify] Raw body (first 500 chars):', rawBody.slice(0, 500));
    console.log('[Notify] Extracted client-id:', clientId || '(missing)');
    //console.log('[Notify] Extracted response-time:', responseTime || '(missing)');
    console.log('[Notify] Extracted request-time:', requestTime || '(missing)');
    console.log('[Notify] Signature header:', signatureHeader || '(missing)');

    if (!signatureHeader) {
      console.warn('[Notify] No signature header received — cannot validate');
      return res.status(200).json({ success: false, message: 'No signature received from A+' });
    }

    // build string to sign
    let stringToSign = `POST ${req.url}\n`;

    // client-id.response-time.raw-body
    const secondLineParts = [];
    if (clientId) secondLineParts.push(clientId);
    //if (responseTime) secondLineParts.push(responseTime);
    if (requestTime) secondLineParts.push(requestTime);
    secondLineParts.push(rawBody);

    stringToSign += secondLineParts.join('.');

    console.log('[Notify] String to sign (official format):\n' + stringToSign);

    // Parse signature header
    const sigParts = signatureHeader.split(',');
    const sigMap = sigParts.reduce((accummulator, part) => {
      const [name, value] = part.split('=');
      accummulator[name.trim()] = value.trim();
      return accummulator;
    }, {});

    const algorithm = sigMap.algorithm;
    const signature = sigMap.signature;

    if (algorithm !== 'RSA256' || !signature) {
      console.warn('[Notify] Invalid signature format:', signatureHeader);
      return res.status(200).json({ success: false, message: 'Invalid signature format — ignored' });
    }

    const PUBLIC_KEY = process.env.VODAPAY_PUBLIC_KEY;
    if (!PUBLIC_KEY) {
      console.error('[Notify] Public key not configured');
      return res.status(200).json({ success: false, message: 'Server misconfigured — ignored' });
    }

    // Verify
    const publicKeyObj = crypto.createPublicKey(PUBLIC_KEY, 'utf8');
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.write(stringToSign);
    verifier.end();
    const isValid = verifier.verify(publicKeyObj, signature, 'base64');

    if (!isValid) {
      console.warn('[Notify] Signature verification FAILED');
      return res.status(200).json({ success: false, message: 'Invalid signature — ignored' });
    }

    console.log('[Notify] Signature VALID ✓');

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('[Notify] Invalid JSON payload:', e);
      return res.status(200).json({ success: false, message: 'Invalid JSON — ignored' });
    }

    console.log('[Notify] Valid webhook payload received');

    // Extract useful fields (adjust based on real payload)
    const paymentId = payload.paymentId;
    const paymentRequestId = payload.paymentRequestId;

    if (!paymentId || !paymentRequestId) {
      console.warn('[Notify] Incomplete payload');
      return res.status(200).json({ success: true, message: 'Incomplete payload — ignored' });
    }

    console.log(`[Notify] Processing payment ${paymentId} → Payment Request ID: ${paymentRequestId}`);

    // business logic here (update DB, send email, etc.)

    return res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (err) {
    console.error('[Notify] Webhook error:', err);
    return res.status(200).json({ success: false, message: 'Processing error' });
  }
}
 