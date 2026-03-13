import fetch from 'node-fetch';

/**
 * WhatsApp Cloud API service
 */

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

export async function sendTextMessage(to, text) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }
    
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('[WhatsApp] Message sent:', data.messages?.[0]?.id);
    
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('[WhatsApp] Send error:', error.message);
    return { success: false, error: error.message };
  }
}

export async function markAsRead(messageId) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;
    
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    });
  } catch (error) {
    console.error('[WhatsApp] Mark read error:', error.message);
  }
}

export async function downloadMedia(mediaId) {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    // Get media URL
    const mediaUrl = `${WHATSAPP_API_URL}/${mediaId}`;
    const mediaResponse = await fetch(mediaUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!mediaResponse.ok) {
      throw new Error(`Media fetch error: ${mediaResponse.status}`);
    }
    
    const mediaData = await mediaResponse.json();
    
    // Download actual media
    const fileResponse = await fetch(mediaData.url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!fileResponse.ok) {
      throw new Error(`File download error: ${fileResponse.status}`);
    }
    
    const buffer = await fileResponse.buffer();
    
    return {
      success: true,
      buffer,
      mimeType: mediaData.mime_type
    };
  } catch (error) {
    console.error('[WhatsApp] Download media error:', error.message);
    return { success: false, error: error.message };
  }
}

export function parseWebhookPayload(body) {
  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    
    if (!value?.messages) {
      return null;
    }
    
    const message = value.messages[0];
    const from = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;
    
    let content = null;
    let type = message.type;
    
    if (type === 'text') {
      content = message.text?.body;
    } else if (type === 'audio') {
      content = {
        mediaId: message.audio?.id,
        mimeType: message.audio?.mime_type
      };
    }
    
    return {
      from,
      messageId,
      timestamp,
      type,
      content
    };
  } catch (error) {
    console.error('[WhatsApp] Parse error:', error.message);
    return null;
  }
}
