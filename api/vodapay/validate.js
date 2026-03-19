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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const signatureHeader = req.headers['signature'];
    const clientId = req.headers['client-id'];
    const requestTime = req.headers['request-time'];

    if (!signatureHeader || !clientId || !requestTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required headers: Signature, Client-Id or Request-Time'
      });
    }

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

    const PUBLIC_KEY = process.env.VODAPAY_PUBLIC_KEY;
    if (!PUBLIC_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Public key not configured on server'
      });
    }

    const sortedHeaders = [
      `client-id:${clientId}`,
      `request-time:${requestTime}`
    ].sort().join('\n');

    const rawBody = (await getRawBody(req)).toString();

    const stringToSign = `POST ${req.url}\n${sortedHeaders}\n${rawBody}`;

    const publicKeyObj = crypto.createPublicKey(PUBLIC_KEY, 'utf8');
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.write(stringToSign);
    verifier.end();
    const isValid = verifier.verify(publicKeyObj, signature, 'base64');

    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid signature' });
    }

    return res.status(200).json({
      success: true,
      message: 'Signature is valid'
    });

  } catch (err) {
    console.error('[Validate Signature] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: err.message
    });
  }
}