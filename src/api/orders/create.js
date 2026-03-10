// POST /api/orders/create
app.post('/api/orders/create', async (req, res) => {
  const { items, totalAmount, currency = 'ZAR', userId, description } = req.body;

  const CLIENT_ID = '2020122653946739963336'
  const requestTime = new Date().toISOString().replace('Z', '+02:00')
  const signatureHeader = 'algorithm=RSA256,keyVersion=1,signature=testing_signatur'

  // 1. Validate input, check stock, calculate total, etc.
  // 2. Create order in your DB → get internal orderId
  // 3. Call VodaPay Create Trade API (server-to-server)
  
  const vodapayRes = await fetch('https://vodapay-gateway.sandbox.vfs.africa/v2/trade/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': CLIENT_ID,
      'Request-Time': requestTime,
      'Signature': signatureHeader
    },
    body: JSON.stringify({
      outTradeNo: `ORDER_${Date.now()}`,
      totalAmount: { currency, amount: totalAmount.toFixed(2) },
      subject: description || 'VodaPay Store Purchase',
      body: 'Payment for items in cart',
      // timeoutExpress: '30m',
      // notifyUrl: 'https://your-server.com/api/vodapay/notify'
    })
  });
 
  const vodapayData = await vodapayRes.json();
 
  if (vodapayData.tradeNO) {
    // Save tradeNO + orderId mapping in your DB
    res.json({ tradeNO: vodapayData.tradeNO, orderId: 'your_internal_order_id' });
  } else {
    res.status(500).json({ error: vodapayData.message || 'Failed to create trade' });
  }
});
 
// POST /api/orders/confirm (optional – for success confirmation)
app.post('/api/orders/confirm', async (req, res) => {
  const { tradeNO, orderId, status, resultCode, paymentResult } = req.body;
  // Update order status in DB
  // Optionally query VodaPay for final status
  res.json({ success: true });
});
 
 