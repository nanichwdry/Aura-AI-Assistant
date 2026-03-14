import fetch from 'node-fetch';

/**
 * Twilio SMS service for Aura
 */

export async function sendSMS(to, body) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

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
      throw new Error(`Twilio API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log('[SMS] Message sent:', data.sid);

    return { success: true, sid: data.sid };
  } catch (error) {
    console.error('[SMS] Send error:', error.message);
    return { success: false, error: error.message };
  }
}

export function parseTwilioPayload(body) {
  try {
    const from = body.From;
    const to = body.To;
    const text = body.Body;
    const messageSid = body.MessageSid;

    if (!from || !text) {
      return null;
    }

    return { from, to, text, messageSid };
  } catch (error) {
    console.error('[SMS] Parse error:', error.message);
    return null;
  }
}
