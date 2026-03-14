export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      console.log('[SMS] POST hit at', new Date().toISOString());
      console.log('[SMS] Raw body:', JSON.stringify(req.body, null, 2));

      const senderPhone = req.body.From;
      const messageText = req.body.Body;

      if (!senderPhone || !messageText) {
        console.log('[SMS] Missing From or Body in payload');
        return res.status(200).send('<Response></Response>');
      }

      console.log('[SMS] Sender:', senderPhone);
      console.log('[SMS] Message:', messageText);

      // Generate Aura response
      const auraResponse = await generateAuraResponse(messageText, senderPhone);

      console.log('[SMS] Aura response:', auraResponse);

      // Send reply via Twilio
      await sendSMS(senderPhone, auraResponse);

      // Return empty TwiML (we send reply via REST API)
      return res.status(200).send('<Response></Response>');
    }

    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[SMS] Webhook fatal error:', error);
    return res.status(200).send('<Response></Response>');
  }
}

async function generateAuraResponse(userMessage, userId) {
  try {
    const { GoogleGenAI } = await import('@google/genai');

    const apiKey = process.env.GEMINI_API_KEY ||
                   process.env.GOOGLE_API_KEY ||
                   process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[Aura] Missing Gemini API key');
      return 'Aura is not configured correctly. Missing API key.';
    }

    console.log('[Aura] Initializing Gemini for SMS');

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: `You are Aura, a helpful AI assistant replying via SMS. Keep response under 160 characters when possible, max 320 characters. Be concise and direct.\n\nUser: ${userMessage}`
    });

    const text = response.text();

    // Truncate for SMS (320 char limit for 2 segments)
    const truncated = text.length > 320 ? text.substring(0, 317) + '...' : text;

    console.log('[Aura] Generated SMS response:', truncated);

    return truncated;
  } catch (error) {
    console.error('[Aura] Generation error:', error);
    return "Hello! I'm Aura. I'm having trouble right now, please try again shortly.";
  }
}

async function sendSMS(to, body) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.error('[SMS] Missing Twilio credentials');
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    console.log('[SMS] Sending to:', to, 'from:', fromNumber);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: body
      }).toString()
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[SMS] Twilio API error:', response.status, error);
      return;
    }

    const data = await response.json();
    console.log('[SMS] Message sent:', data.sid);
  } catch (error) {
    console.error('[SMS] Send error:', error);
  }
}
