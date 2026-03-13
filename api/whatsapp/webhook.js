export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
      
      console.log('[Webhook] Verification attempt:', {
        mode,
        tokenReceived: token,
        tokenExpected: verifyToken,
        challenge
      });

      if (
        mode === 'subscribe' &&
        token === verifyToken
      ) {
        console.log('[Webhook] Verification SUCCESS');
        return res.status(200).send(challenge);
      }

      console.log('[Webhook] Verification FAILED');
      return res.status(403).send('Forbidden');
    }

    if (req.method === 'POST') {
      return res.status(200).json({ received: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('WhatsApp webhook fatal error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error?.message || 'Unknown error',
    });
  }
}
