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
      console.log('[Webhook] POST received:', JSON.stringify(req.body, null, 2));
      
      // Process message BEFORE responding (Vercel limitation)
      await processWhatsAppMessage(req.body);
      
      // Respond to Meta after processing
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

async function processWhatsAppMessage(body) {
  try {
    // Parse webhook payload
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    
    console.log('[Webhook] Parsed value:', JSON.stringify(value, null, 2));
    
    // Ignore non-message events
    if (!value?.messages) {
      console.log('[Webhook] No messages in payload, ignoring');
      return;
    }
    
    const message = value.messages[0];
    const phoneNumber = message.from;
    const messageText = message.text?.body;
    const messageId = message.id;
    
    console.log('[Webhook] Extracted:', {
      phoneNumber,
      messageText,
      messageId
    });
    
    // Ignore non-text messages
    if (!messageText) {
      console.log('[Webhook] Not a text message, ignoring');
      return;
    }
    
    // Generate Aura response using Gemini
    const auraResponse = await generateAuraResponse(messageText, phoneNumber);
    
    console.log('[Webhook] Aura response:', auraResponse);
    
    // Send response via WhatsApp
    await sendWhatsAppMessage(phoneNumber, auraResponse);
    
  } catch (error) {
    console.error('[Webhook] Message processing error:', error);
  }
}

async function generateAuraResponse(userMessage, userId) {
  try {
    const { GoogleGenerativeAI } = await import('@google/genai');
    const genAI = new GoogleGenerativeAI(process.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const prompt = `You are Aura, a helpful AI assistant. Respond concisely (max 1000 characters) to: ${userMessage}`;
    
    console.log('[Aura] Generating response for:', userMessage);
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    
    // Truncate for WhatsApp
    const truncated = response.length > 1000 ? response.substring(0, 997) + '...' : response;
    
    console.log('[Aura] Generated response:', truncated);
    
    return truncated;
  } catch (error) {
    console.error('[Aura] Generation error:', error);
    return 'I apologize, but I encountered an error processing your request. Please try again.';
  }
}

async function sendWhatsAppMessage(to, text) {
  try {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    
    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp credentials not configured');
    }
    
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    
    console.log('[WhatsApp] Sending message to:', to);
    
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
      console.error('[WhatsApp] API error:', response.status, error);
      throw new Error(`WhatsApp API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    console.log('[WhatsApp] Message sent successfully:', data.messages?.[0]?.id);
    
  } catch (error) {
    console.error('[WhatsApp] Send error:', error);
  }
}
