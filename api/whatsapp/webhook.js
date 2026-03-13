/**
 * Vercel serverless function for WhatsApp webhook
 * Proxies to Render backend where Aura logic lives
 */

const RENDER_BACKEND = 'https://aura-ai-assistant.onrender.com';

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Webhook verification - handle locally for speed
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'aura_webhook_verify_2024';
      
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('[WhatsApp] Webhook verified');
        return res.status(200).send(challenge);
      }
      
      console.warn('[WhatsApp] Verification failed');
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.method === 'POST') {
      // Proxy POST to Render backend using https module
      console.log('[WhatsApp] Proxying to Render backend');
      
      const https = require('https');
      const url = require('url');
      
      const parsedUrl = url.parse(`${RENDER_BACKEND}/api/whatsapp/webhook`);
      const postData = JSON.stringify(req.body);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const proxyReq = https.request(options, (proxyRes) => {
        console.log('[WhatsApp] Render responded:', proxyRes.statusCode);
      });
      
      proxyReq.on('error', (error) => {
        console.error('[WhatsApp] Proxy error:', error);
      });
      
      proxyReq.write(postData);
      proxyReq.end();
      
      // Respond immediately to Meta
      return res.status(200).json({ received: true });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[WhatsApp] Error:', error);
    return res.status(200).json({ received: true });
  }
};
