import { parseWebhookPayload, sendTextMessage, markAsRead } from '../services/whatsappService.js';
import { handleAuraMessage } from '../services/auraMessageRouter.js';

/**
 * WhatsApp webhook controller
 */

export async function verifyWebhook(req, res) {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    
    if (!verifyToken) {
      console.error('[WhatsApp] WHATSAPP_VERIFY_TOKEN not configured');
      return res.sendStatus(500);
    }
    
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp] Webhook verified');
      return res.status(200).send(challenge);
    }
    
    console.warn('[WhatsApp] Webhook verification failed');
    return res.sendStatus(403);
  } catch (error) {
    console.error('[WhatsApp] Verification error:', error.message);
    return res.sendStatus(500);
  }
}

export async function handleWebhook(req, res) {
  try {
    // Respond quickly to Meta
    res.sendStatus(200);
    
    // Parse webhook payload
    const parsed = parseWebhookPayload(req.body);
    
    if (!parsed) {
      console.log('[WhatsApp] No message in webhook');
      return;
    }
    
    const { from, messageId, type, content } = parsed;
    
    console.log(`[WhatsApp] Message from ${from}: type=${type}`);
    
    // Mark as read
    await markAsRead(messageId);
    
    // Handle text messages
    if (type === 'text' && content) {
      await handleTextMessage(from, content, messageId);
    }
    // Handle audio messages (future enhancement)
    else if (type === 'audio') {
      await sendTextMessage(from, 'Audio messages are not yet supported. Please send text.');
    }
    // Unsupported types
    else {
      console.log(`[WhatsApp] Unsupported message type: ${type}`);
    }
  } catch (error) {
    console.error('[WhatsApp] Webhook error:', error.message);
  }
}

async function handleTextMessage(from, text, messageId) {
  try {
    // Route through unified Aura message handler
    const result = await handleAuraMessage({
      channel: 'whatsapp',
      userId: from,
      message: text,
      sessionId: `whatsapp_${from}`,
      metadata: { messageId }
    });
    
    if (result.success) {
      await sendTextMessage(from, result.response);
    } else {
      await sendTextMessage(from, 'Sorry, I encountered an error. Please try again.');
    }
  } catch (error) {
    console.error('[WhatsApp] Message handling error:', error.message);
    await sendTextMessage(from, 'An error occurred. Please try again later.');
  }
}
