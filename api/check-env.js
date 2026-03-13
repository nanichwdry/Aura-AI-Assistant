export default async function handler(req, res) {
  const envCheck = {
    WHATSAPP_VERIFY_TOKEN: !!process.env.WHATSAPP_VERIFY_TOKEN,
    WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
    VITE_GEMINI_API_KEY: !!process.env.VITE_GEMINI_API_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
  };
  
  return res.status(200).json(envCheck);
}
