module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (
        mode === 'subscribe' &&
        token === process.env.WHATSAPP_VERIFY_TOKEN
      ) {
        return res.status(200).send(challenge);
      }

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
};
