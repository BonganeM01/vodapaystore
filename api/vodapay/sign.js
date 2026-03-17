// api/vodapay/sign.js
import crypto from 'crypto';

function normalizeHeader(headers, name) {
  // Accept both canonical case and lowercase to avoid breaking callers
  return headers[name] || headers[name.toLowerCase()] || headers[name.replace(/-/g, '').toLowerCase()];
}

function buildStringToSign(method, path, clientId, requestTime, body) {

  let bodyStr = '';
  if (typeof body === 'string') {
    bodyStr = body;
  } else if (body && typeof body === 'object') {
    bodyStr = JSON.stringify(body); // no spacing
  }

  // <HTTP_METHOD> <HTTP_URI>\n<Client-Id>.<Request-Time>.<HTTP_BODY>
  const firstLine = `${String(method || '').toUpperCase()} ${path || ''}`;
  const secondLine = `${clientId || ''}.${requestTime || ''}.${bodyStr}`;
  return { stringToSign: `${firstLine}\n${secondLine}`, bodyStr };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { method, path, headers, body } = req.body || {};
    if (!method || !path || !headers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Pull required header values
    const clientId = normalizeHeader(headers, 'Client-Id');
    const requestTime = normalizeHeader(headers, 'Request-Time') || normalizeHeader(headers, 'request-time');

    if (!clientId || !requestTime) {
      return res.status(400).json({ error: 'Missing Client-Id or Request-Time header values' });
    }

    const PRIVATE_KEY = process.env.VODAPAY_PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      return res.status(500).json({ error: 'Private key not configured' });
    }

    const { stringToSign, bodyStr } = buildStringToSign(method, path, clientId, requestTime, body);
    console.log('[Sign] String to sign:\n', stringToSign);

    const privateKeyObj = crypto.createPrivateKey(PRIVATE_KEY, 'utf8');
    const signer = crypto.createSign('RSA-SHA256');
    signer.write(stringToSign);
    signer.end();
    const encodedSignature = signer.sign(privateKeyObj).toString('base64');

    const signatureHeader = `algorithm=RSA256,keyVersion=1,signature=${encodedSignature}`;

    return res.status(200).json({
      signature: signatureHeader,
      debug: { stringToSign, bodyStr }
    });
  } catch (err) {
    console.error('[Sign] Error:', err);
    return res.status(500).json({
      error: 'Failed to generate signature',
      message: err && err.message ? err.message : String(err)
    });
  }
}

 