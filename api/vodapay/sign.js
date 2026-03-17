// api/vodapay/sign.js
import crypto from 'crypto';
 
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
 
  try {
    const { method, path, headers, body } = req.body;
 
    if (!method || !path || !headers) {
      return res.status(400).json({ error: 'Missing method, path or headers' });
    }
 
    const PRIVATE_KEY = process.env.VODAPAY_PRIVATE_KEY;
 
    if (!PRIVATE_KEY) {
      return res.status(500).json({ error: 'Private key not configured on server' });
    }
 
    // 2. Build the string to sign
    const sortedHeaders = Object.keys(headers)
      .sort()
      .map(key => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n');
 
    const stringToSign = `${method.toUpperCase()} ${path}\n${sortedHeaders}\n${JSON.stringify(body || {})}`;
 
    // 3. Generate signature with RSA-SHA256
    const privateKeyObj = crypto.createPrivateKey(PRIVATE_KEY, 'utf8');
    const signer = crypto.createSign('RSA-SHA256');
    //signer.update(stringToSign);
    signer.write(stringToSign);
    signer.end();
    const signature = signer.sign(privateKeyObj, 'base64');
 
    const signatureHeader = `algorithm=RSA256,keyVersion=1,signature=${signature}`;
 
    res.status(200).json({
      signature: signatureHeader,
      stringToSign: stringToSign // for debugging
    });
  } catch (err) {
    console.error('[Sign] Error:', err);
    res.status(500).json({
      error: 'Failed to generate signature',
      message: err.message
    });
  }
}