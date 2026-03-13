/**
 * Vercel serverless function for WhatsApp webhook
 * Proxies to Render backend where Aura logic lives
 */

export default async function handler(req, res) {
  const RENDER_BACKEND = 'https://aura-ai-assistant.onrender.com';
  
  try {
    if (req.method === 'GET') {
      // Webhook verification - handle locally for speed
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
      
      if (!verifyToken) {
        console.error('[WhatsApp] WHATSAPP_VERIFY_TOKEN not configured');
        return res.status(500).json({ error: 'Configuration error' });
      }
      
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('[WhatsApp] Webhook verified');
        return res.status(200).send(challenge);
      }
      
      console.warn('[WhatsApp] Verification failed');
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'POST') {
      // Proxy POST to Render backend
      console.log('[WhatsApp] Proxying to Render backend');
      
      const response = await fetch(`${RENDER_BACKEND}/api/whatsapp/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body)
      });
      
      if (!response.ok) {
        console.error('[WhatsApp] Render backend error:', response.status);
        return res.status(200).json({ received: true }); // Still return 200 to Meta
      }
      
      console.log('[WhatsApp] Successfully proxied to Render');
      return res.status(200).json({ received: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[WhatsApp] Proxy error:', error);
    // Always return 200 to Meta to avoid retries
    return res.status(200).json({ received: true });
  }
}
