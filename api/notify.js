// api/notify.js
import crypto from 'crypto';

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
    const rawBodyBuffer = await getRawBody(req);
    const rawBody = rawBodyBuffer.toString('utf8');

    // Extract headers
    const signatureHeader = req.headers['signature'] || req.headers['Signature'];
    const clientId = req.headers['client-id'] || req.headers['Client-Id'];
    const responseTime = req.headers['response-time'] || req.headers['Response-Time'] || '';

    console.log('[Notify] FULL INCOMING HEADERS:', JSON.stringify(req.headers, null, 2));
    console.log('[Notify] Extracted client-id:', clientId);
    console.log('[Notify] Extracted response-time:', responseTime || '(MISSING)');
    console.log('[Notify] Raw body length:', rawBody.length);

    if (!signatureHeader) {
      console.warn('[Notify] No signature header received');
      return res.status(200).json({ success: false, message: 'No signature received from A+' });
    }

    // string-to-sign 
    const stringToSign = [
      `POST ${req.url}`,
      `${clientId || ''}.${responseTime}.${rawBody}`
    ].join('\n');

    console.log('[Notify] String to sign:\n' + stringToSign);

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
      console.warn('[Notify] Invalid signature format');
      return res.status(200).json({ success: false, message: 'Invalid signature format' });
    }

    const PUBLIC_KEY = process.env.VODAPAY_PUBLIC_KEY;
    if (!PUBLIC_KEY) {
      console.error('[Notify] Public key not configured');
      return res.status(200).json({ success: false, message: 'Server misconfigured - no public key provided' });
    }

    // Verify signature
    const publicKeyObj = crypto.createPublicKey(PUBLIC_KEY, 'utf8');
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.write(stringToSign);
    verifier.end();
    const isValid = verifier.verify(publicKeyObj, signature, 'base64');

    if (!isValid) {
      console.warn('[Notify] Signature validation FAILED');
      return res.status(200).json({ success: false, message: 'Invalid signature' });
    }

    console.log('[Notify] Signature is VALID ✓');

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('[Notify] Invalid JSON payload');
      return res.status(200).json({ success: false, message: 'Invalid JSON' });
    }

    console.log('[Notify] Valid webhook payload received');

    // Extract useful fields
    const paymentId = payload.paymentId;
    const paymentRequestId = payload.paymentRequestId;

    console.log(`[Notify] Processing payment ${paymentId || 'unknown'} → Payment Request ID: ${paymentRequestId || 'unknown'}`);

    // real business logic here

    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });

  } catch (err) {
    console.error('[Notify] Webhook processing error:', err);
    return res.status(200).json({ success: false, message: 'Processing error - will retry later' });
  }
}
 