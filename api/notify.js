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
    const rawBody = (await getRawBody(req)).toString();

    const validationResponse = await fetch(
      `https://vodapaystore.vercel.app/api/vodapay/validate`,
      {
        method: 'POST',
        headers: {
          'signature': req.headers['signature'] || '',
          'client-id': req.headers['client-id'] || '',
          'request-time': req.headers['request-time'] || ''
        },
        body: rawBody
      }
    );

    const validationResult = await validationResponse.json();
    console.log('[Notify] Validation result:', validationResult);

    if (!validationResult.success) {
      return res.status(200).json({
        success: false,
        message: 'Signature invalid - ignored'
      });
    }

    const payload = JSON.parse(rawBody);
    console.log('[Notify] Valid webhook received:', payload);

    const paymentUrl = payload.paymentUrl || payload.redirectUrl;

    if (!paymentUrl) {
      return res.status(200).json({
        success: true,
        message: 'Incomplete payload - ignored'
      });
    }

    console.log(`[Notify] Processing payment: ${paymentUrl}`);

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (err) {
    console.error('[Notify] Webhook processing error:', err);
    return res.status(200).json({
      success: false,
      message: 'Processing error - will retry later'
    });
  }
}