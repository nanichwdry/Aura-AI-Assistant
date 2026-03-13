export default async function handler(req, res) {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  
  return res.status(200).json({
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    firstChar: token ? token[0] : null,
    lastChar: token ? token[token.length - 1] : null
  });
}
