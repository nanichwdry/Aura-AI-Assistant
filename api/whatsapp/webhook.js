import { verifyWebhook, handleWebhook } from '../../server/controllers/whatsappController.js';

/**
 * Vercel serverless function for WhatsApp webhook
 * Delegates to existing Express controller logic
 */

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return verifyWebhook(req, res);
    }

    if (req.method === 'POST') {
      return handleWebhook(req, res);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[WhatsApp Webhook] Route error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
