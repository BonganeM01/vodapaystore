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

// get header case-insensitively
function getHeader(req, name) {
  const lower = name.toLowerCase();
  return req.headers[lower] || req.headers[lower.replace(/-/g, '')];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('[Notify] Invalid method:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get raw body — required for correct signature verification
    const rawBodyBuffer = await getRawBody(req);
    const rawBody = rawBodyBuffer.toString('utf8');

    // Extract only the headers A+ actually sends
    const signatureHeader = getHeader(req, 'signature');
    const responseTime = getHeader(req, 'response-time');

    // Log everything to see what A+ sends
    console.log('[Notify] FULL INCOMING HEADERS:', JSON.stringify(req.headers, null, 2));
    console.log('[Notify] Raw body (first 500 chars):', rawBody.slice(0, 500));
    console.log('[Notify] Extracted signature:', signatureHeader || '(missing)');
    console.log('[Notify] Extracted response-time:', responseTime || '(missing)');

    if (!signatureHeader) {
      console.warn('[Notify] No signature header from A+ — cannot validate');
      return res.status(200).json({ success: false, message: 'No signature found' });
    }

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
      return res.status(200).json({ success: false, message: 'Invalid signature format' });
    }

    const PUBLIC_KEY = process.env.VODAPAY_PUBLIC_KEY;
    if (!PUBLIC_KEY) {
      console.error('[Notify] Public key not configured');
      return res.status(200).json({ success: false, message: 'Server misconfigured — no public key' });
    }

    // Build string-to-sign (exact format per docs for responses/webhooks)
    const lines = [
      `POST ${req.url}`
    ];

    if (responseTime) {
      lines.push(`response-time:${responseTime}`);
    }

    lines.push(rawBody);

    const stringToSign = lines.join('\n');

    console.log('[Notify] String to sign:\n' + stringToSign);

    // Verify
    const publicKeyObj = crypto.createPublicKey(PUBLIC_KEY, 'utf8');
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.write(stringToSign);
    verifier.end();
    const isValid = verifier.verify(publicKeyObj, signature, 'base64');

    if (!isValid) {
      console.warn('[Notify] Invalid signature:\n', signature);
      return res.status(200).json({ success: false, message: 'Invalid signature returned' });
    }

    console.log('[Notify] Signature is VALID');

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('[Notify] Invalid JSON payload:', e);
      return res.status(200).json({ success: false, message: 'Invalid JSON' });
    }

    console.log('[Notify] Valid webhook payload:', JSON.stringify(payload, null, 2));

    // Extract useful fields
    const paymentId = payload.paymentId;
    const paymentRequestId = payload.paymentRequestId;

    if (!paymentId || !paymentRequestId) {
      console.warn('[Notify] Incomplete payload');
      return res.status(200).json({ success: true, message: 'Incomplete payload' });
    }

    console.log(`[Notify] Processing payment ${paymentId} → Payment Request ID: ${paymentRequestId}`);

    //real business logic here

    return res.status(200).json({ success: true, message: 'Webhook processed' });

  } catch (err) {
    console.error('[Notify] Webhook error:', err);
    // ALWAYS return 200 so VodaPay stops retrying
    return res.status(200).json({ success: false, message: 'Processing error' });
  }
}