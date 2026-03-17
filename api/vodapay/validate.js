// api/vodapay/validate.js
import crypto from 'crypto';

export default async function handler(req, res) {
  // Only allow POST (VodaPay uses POST for notifications/callbacks)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Get required headers from VodaPay request
    const signatureHeader = req.headers['signature'];
    const clientId = req.headers['client-id'];
    const requestTime = req.headers['request-time'];

    if (!signatureHeader || !clientId || !requestTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required headers: Signature, Client-Id or Request-Time'
      });
    }

    // Parse signature header
    const sigParts = signatureHeader.split(',');
    const sigMap = sigParts.reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k.trim()] = v.trim();
      return acc;
    }, {});

    const algorithm = sigMap.algorithm;
    const signature = sigMap.signature;

    if (algorithm !== 'RSA256' || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or unsupported signature format'
      });
    }

    // 2. Get your PUBLIC key 
    const PUBLIC_KEY = process.env.VODAPAY_PUBLIC_KEY;

    if (!PUBLIC_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Public key not configured on server'
      });
    }

    // 3. Build the exact string that was signed
    const sortedHeaders = [
      `client-id:${clientId}`,
      `request-time:${requestTime}`
    ].sort().join('\n');

    // Body must be the raw JSON string as received (not re-serialized)
    const rawBody = JSON.stringify(req.body);

    const stringToSign = `POST ${req.url}\n${sortedHeaders}\n${rawBody}`;

    // 4. Verify signature
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(stringToSign);
    const isValid = verifier.verify(PUBLIC_KEY, signature, 'base64');

    if (isValid) {
      // do extra checks
      const now = Date.now();
      const requestTs = new Date(requestTime).getTime();
      const timeDiff = Math.abs(now - requestTs) / 1000;

      if (timeDiff > 300) { // 5 minutes tolerance
        return res.status(401).json({
          success: false,
          error: 'Request time is too old or in the future'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Signature is valid'
      });
    } else {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }
  } catch (err) {
    console.error('[Validate Signature] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: err.message
    });
  }
}