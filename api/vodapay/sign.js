// api/vodapay/sign.js
import crypto from 'crypto';

function normalizeHeader(headers, name) {
  // Accept both canonical case and lowercase to avoid breaking callers
  return headers[name] || headers[name.toLowerCase()] || headers[name.replace(/-/g, '').toLowerCase()];
}

function buildStringToSign(method, path, clientId, requestTime, body) {
  // Normalize body to a compact string with no spaces
  let bodyStr = '';
  if (typeof body === 'string') {
    bodyStr = body;
  } else if (body && typeof body === 'object') {
    bodyStr = JSON.stringify(body); // no spacing
  } else if (body != null) {
    bodyStr = String(body);
  }

  // Trim all parts to eliminate accidental leading/trailing spaces
  const methodStr = String(method || '').trim().toUpperCase();
  const pathStr = String(path || '').trim();
  const clientIdStr = String(clientId || '').trim();
  const requestTimeStr = String(requestTime || '').trim();
  const bodyStrTrimmed = String(bodyStr || '').trim();

  // First line: "<HTTP_METHOD> <HTTP_URI>"
  const firstLine = [methodStr, pathStr].filter(Boolean).join(' ');

  // Second line: "<Client-Id>.<Request-Time>.<HTTP_BODY>" with no extra spaces
  const secondLine = [clientIdStr, requestTimeStr, bodyStrTrimmed]
    .filter(function (part) { return part !== ''; })
    .join('.');

  return { stringToSign: firstLine + '\n' + secondLine, bodyStr: bodyStrTrimmed };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { method, path, headers, body } = req.body || {};
    if (!method || !path || !headers) {
      console.log('Method :', method, '\nPath: ' ,path, '\nHeaders: ', headers)
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Pull required header values
    const clientId = normalizeHeader(headers, 'client-id');
    const requestTime = normalizeHeader(headers, 'request-Time') || normalizeHeader(headers, 'response-Time');

    if (!clientId || !requestTime) {
      return res.status(400).json({ error: 'Missing Client-Id or Request-Time header values' });
    }

    const PRIVATE_KEY = process.env.VODAPAY_PRIVATE_KEY;

    if (!PRIVATE_KEY) {
      return res.status(500).json({ error: 'Private key not configured' });
    }

    const { stringToSign, bodyStr } = buildStringToSign(method, path, clientId, requestTime, body);

    console.log('String to sign:\n', stringToSign);
    console.log('Time Stamp: ', requestTime);

    const privateKeyObj = crypto.createPrivateKey(PRIVATE_KEY, 'utf8');
    const signer = crypto.createSign('RSA-SHA256');
    signer.write(stringToSign);
    signer.end();
    const encodedSignature = signer.sign(privateKeyObj, 'base64');

    console.log('Private Key:\n', PRIVATE_KEY);
    
    console.log('Generated Signature:\n', encodedSignature);

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

 