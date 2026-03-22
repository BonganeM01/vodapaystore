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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('[Notify] Invalid method:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get raw body first
    const rawBodyBuffer = await getRawBody(req);
    const rawBody = rawBodyBuffer.toString('utf8');

    // Extract headers (VodaPay uses lowercase or mixed case)
    const signatureHeader = req.headers['signature'];
    const clientId = req.headers['client-id'];
    const responseTime = req.headers['response-time'];

    if (!signatureHeader || !clientId || !responseTime) {
      console.warn('[Notify] Missing required headers');
      return res.status(200).json({ success: false, message: 'Missing headers - ignored' });
    }

    // Forward to your validate endpoint
    const validationResponse = await fetch(
      `https://${req.headers.host}/api/vodapay/validate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'signature': signatureHeader,
          'client-id': clientId,
          'response-time': responseTime
        },
        body: JSON.stringify(rawBody)
      }
    );

    const validationResult = await validationResponse.json();

    console.log('[Notify] Validation result:', validationResult);

    if (!validationResult.success) {
      console.warn('[Notify] Invalid signature from A+/VodaPay:', validationResult.error);
      return res.status(200).json({ success: false, message: 'Invalid signature - ignored' });
    }

    // Signature is valid → parse and process payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (e) {
      console.error('[Notify] Invalid JSON in payload:', e);
      return res.status(200).json({ success: false, message: 'Invalid JSON - ignored' });
    }

    console.log('[Notify] Valid webhook received:', payload);

    // Extract useful fields
    const paymentUrl = payload.redirectActionForm?.redirectUrl || payload.redirectUrl;

    if (!paymentUrl) {
      console.warn('[Notify] Incomplete payload');
      return res.status(200).json({ success: true, message: 'Incomplete payload - ignored' });
    }

    console.log(`[Notify] Processing payment : ${paymentUrl}`);

    // TReal business logic here

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (err) {
    console.error('[Notify] Webhook processing error:', err);
    // ALWAYS return 200 to VodaPay
    return res.status(200).json({
      success: false,
      message: 'Processing error - will retry later'
    });
  }
}