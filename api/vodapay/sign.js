// api/vodapay/sign.js
import crypto from 'crypto';

function buildStringToSign(method, path, headers, body) {
  let str = `${method.toUpperCase()} ${path}\n`;

  // Headers: lowercase keys, original values, sorted
  const headerLines = Object.entries(headers)
    .map(([k, v]) => `${k.toLowerCase()}:${v}`)
    .sort((a, b) => a.localeCompare(b));

  str += headerLines.join('\n');

  // Body: exact JSON string
  let bodyStr = '';
  if (typeof body === 'string') {
    bodyStr = body;
  } else if (body && typeof body === 'object') {
    bodyStr = JSON.stringify(body); // no extra spaces!
  }

  if (bodyStr) {
    str += '\n' + bodyStr;
  }

  return str;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { method, path, headers, body } = req.body;

    if (!method || !path || !headers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const PRIVATE_KEY = process.env.VODAPAY_PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      return res.status(500).json({ error: 'Private key not configured' });
    }

    const stringToSign = buildStringToSign(method, path, headers, body);
    console.log('[Sign] String to sign:\n', stringToSign);

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(stringToSign);
    const signature = signer.sign(PRIVATE_KEY, 'base64');

    const signatureHeader = `algorithm=RSA256,keyVersion=1,signature=${signature}`;

    res.status(200).json({
      signature: signatureHeader,
      debug: { stringToSign } // for troubleshooting
    });
  } catch (err) {
    console.error('[Sign] Error:', err.message);
    res.status(500).json({
      error: 'Failed to generate signature',
      message: err.message
    });
  }
}
 