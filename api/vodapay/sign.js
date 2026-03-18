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

    //const PRIVATE_KEY = process.env.VODAPAY_PRIVATE_KEY;
    const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDhE5k6mNHEK5RS
dRfkk9B8uZRax9+YFlZ8qF7hVdlHt0AmYbUpcEFFZ8FQ42RzQ23fP4hx6SlPIXkm
nIyruAe5bsNqhXxuTK9csT0u1eXfmQcMvhGhzkwEXNA8G7bRi/9wlILQd8LPO49v
6lrsODkbKowstzsggyrI5lhkI1qzoZnRH0DSFiMElg6ORniGTmZG8LINTKshCCUL
X3B7/9lInHLj0TNZlE/X1M5Zk0M7yoyKfZgM/aaI5YEUCmJlGtMWWZQ505OdD1mV
HY2ME1YcJc/HRdgsovQn8mJ7JCW5/VmCsGW4YN+V2JGaQL5igbLhhZiNR3/AmaDY
tBSnWNv1AgMBAAECggEAOfjCTsVtwgk3esWOEeHAoV9rRraUcKfQPutfBMsH2+Dn
NPuVnca8CRRgRmVLSiTj98x1aGGVsjv86GUKFnCgDLLqwlT/Z6l4wXclOxr8ykqv
9ig+gl6QVc9SEylQPUjB0k1uJCO0mYvNthW2tYEFtGmRETNgl08xhe1OdvxkMD/D
mQ3Pd1R1qe2XE8f78+mxYduPnSaDvpNdLMEz8Mo/SDRSPe6h+yaGC3FcLV4Pmsin
fnwsGj1Ax7/qn97/vojiSR9bt011raG6kLCeUUVL4ntm9VZBW0x+QXN7fgY6CUfE
bwUBGYRFtwlyVHWtX1XW+R5Ocho5mxW+Cofn54nGAQKBgQD3UA0wRJqs9vjvyU0v
W144VjoLrZ2NH+oMdxb/b+MUcT4QppQBCXbBoMG6Ff277LLwQCQYqNHzI6xHRntP
KiDqtqHIPD6emF6qxKyTkQJxd+JaR5P0Rd+fgF6AhHBwBLm786JokgF9hRxlYBdJ
GYcliQg93dw3ERs7dMIfALykmQKBgQDo+5bo7A7MOEWBwGCpFAsIo5iJ2eOEU8E5
VfIL1JJ0fFGbeK0PtSxW3DWpwhgfUaLcAAq3lvx1cVh9/fGZNnpCXjyyp0zvROGT
HW+JHjIuDEBnaeX1l3Kf6JUkbZOOpfMWyGumyZjnWoO8Jx0OFMJnQ8i0dgVvL94b
Ilafwn1vvQKBgHNfD9f9mR6pVDYgdXZrLEghyZBbHM2SHtBT2hGts4R805RW8WKO
dK0dfmJ+EdFSOaOkeHJchxzi/mJ9udaTc6mrK0vK9vdrY3ZMq6lnk3k1kQ3GqHnj
AtBYxT01C3LmcXMB1DjuK+3PZBDSw+ohE4/qHkMmNa4mt8qDzG9EG7y5AoGAQ/8B
eTND0lht+MNjspT172yHnVvpKfqjvw8VWFyO7c5GpwBeSeJPcX5NbyEFl0ZlKJ4e
gpxfTAtrj0HpHBUpM2t7fYyUSJSq3RvPLI6SiJvsxAHFKpsryf3AYWRVl2FZhAG0
YXYe2Q6yudwUf8KRRkAjOH/lcCDhSrwH2hKSN2UCgYEAtbxHLL9dErlrz94mqpPg
DcWZgq5bztCo8rxIDlxb7db0nT4ADdB2sk3wlDveZrgPNKF/dwBG8qITVW4K8N/w
AvKQxSBhLJA7JxvWb2qj1IVk3XK9ifeUeXulC8OWQ9yssVY3ZW3He1AeUdsvA2Kp
X23JaNa6mFdruSeMatKMhvA=
-----END PRIVATE KEY-----`;

    if (!PRIVATE_KEY) {
      return res.status(500).json({ error: 'Private key not configured' });
    }

    const { stringToSign, bodyStr } = buildStringToSign(method, path, clientId, requestTime, body);

    console.log('String to sign:\n', stringToSign);
    console.log('Request time: ', requestTime);

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

 