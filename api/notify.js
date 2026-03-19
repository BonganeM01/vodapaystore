// api/notify.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('[Notify] Invalid method:', req.method);
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 1. Forward original VodaPay headers + body to validation
    const validationResponse = await fetch(`https://vodapaystore.vercel.app/api/vodapay/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'signature': req.headers['signature'] || '',
        'client-id': req.headers['client-id'] || '',
        'response-time': req.headers['response-time'] || req.headers['request-time'] || ''
      },
      body: JSON.stringify(req.body)
    });

    const validationResult = await validationResponse.json();

    console.log('[Notify] Validation result:', validationResult);

    if (!validationResult.success) {
      console.warn('[Notify] Invalid signature from VodaPay:', validationResult.error);
      // return 200 — webhook must be acknowledged
      return res.status(200).json({ success: false, message: 'Signature invalid - ignored' });
    }

    // 2. Signature is valid → process the notification
    const payload = req.body;

    console.log('[Notify] Valid webhook received:', payload);

    // Example: extract useful fields (adjust according to your actual payload)
    const paymentUrl = payload.paymentUrl || payload.redirectUrl;

    if (!paymentUrl) {
      console.warn('[Notify] Incomplete payload - missing key fields');
      return res.status(200).json({ success: true, message: 'Incomplete payload - ignored' });
    }

    //should have business logic here in production

    console.log(`[Notify] Processing payment:  ${paymentUrl}`);

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (err) {
    console.error('[Notify] Webhook processing error:', err);
    // Always return 200 to VodaPay, even on error
    return res.status(200).json({
      success: false,
      message: 'Processing error - will retry later'
    });
  }
}