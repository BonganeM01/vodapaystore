// api/vodapay/sign.js
import crypto from 'crypto';

function buildStringToSign(method, path, headers, body) {
  // 1. First line: METHOD & PATH
  let lines = [`${String(method || '').toUpperCase()} ${String(path || '')}`];

  // 2. Header lines: client-id and request-time only
  const clientId = headers['Client-Id'] || headers['client-id'];
  const requestTime = headers['Request-Time'] || headers['request-time'];

  if (clientId) {
    lines.push(`client-id:${clientId}`);
  }
  if (requestTime) {
    lines.push(`request-time:${requestTime}`);
  }

  // 3. Body line: no extra spaces)
  let bodyStr = '';
  if (typeof body === 'string') {
    bodyStr = body;
  } else if (body && typeof body === 'object') {
    bodyStr = JSON.stringify(body); // no extra spaces
  }

  if (bodyStr) {
    lines.push(bodyStr);
  }

  // Join with newlines
  return lines.join('\n');
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

    const clientId = headers['Client-Id'] || headers['client-id'];
    const requestTime = headers['Request-Time'] || headers['request-time'];

    if (!clientId || !requestTime) {
      return res.status(400).json({ error: 'Missing Client-Id or Request-Time' });
    }

    const PRIVATE_KEY = process.env.VODAPAY_PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      return res.status(500).json({ error: 'Private key not configured' });
    }

    const stringToSign = buildStringToSign(method, path, headers, body);
    console.log('[Sign] String to sign:\n' + stringToSign);

    const privateKeyObj = crypto.createPrivateKey(PRIVATE_KEY, 'otf8');
    const signer = crypto.createSign('RSA-SHA256');
    signer.write(stringToSign);
    signer.end();
    const signature = signer.sign(privateKeyObj, 'base64');

    const signatureHeader = `algorithm=RSA256,keyVersion=1,signature=${signature}`;

    return res.status(200).json({
      signature: signatureHeader,
      debug: { stringToSign }
    });
  } catch (err) {
    console.error('[Sign] Error:', err);
    return res.status(500).json({
      error: 'Failed to generate signature',
      message: err.message || String(err)
    });
  }
}

 