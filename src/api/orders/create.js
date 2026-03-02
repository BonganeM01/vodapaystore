// api/orders/create.js  (Vercel or any Node.js server)
 
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
 
  try {
    const { totalAmount, currency = 'ZAR', items } = req.body;

    const vodapayResponse = await fetch('https://api.vodapay.co.za/v2/payments/pay', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VODAPAY_ACCESS_TOKEN}`, // from VodaPay portal
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        amount: { value: totalAmount.toString(), currency },
        merchantTradeNo: `TEST-ORDER-${Date.now()}`,
        description: 'VodaPay Store Test Order',

        notifyUrl: 'https://vodapaystore.vercel.app/api/webhook/vodapay', // must be public HTTPS
        returnUrl: 'https://vodapaystore.vercel.app/checkout?success=1',
      })

    });
 
    const data = await vodapayResponse.json();
    if (!vodapayResponse.ok) {
      return res.status(400).json({ error: data.message || 'VodaPay error' });
    }
 
    res.status(200).json({
      tradeNO: data.tradeNo,
      orderId: `ORD-${Date.now()}`
    });
 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

}
 