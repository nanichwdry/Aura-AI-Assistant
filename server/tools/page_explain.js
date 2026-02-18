import OpenAI from "openai";

function clip(s = "", n = 12000) {
  s = String(s || "");
  return s.length > n ? s.slice(0, n) + "\n...[clipped]" : s;
}

export async function page_explain(input = {}) {
  const { question, url, title, selectionText, contextText } = input;

  const q = (question || "Explain this").trim();
  const sel = clip(selectionText || "", 6000);
  const ctx = clip(contextText || "", 6000);

  if (!sel && !ctx) {
    return { success: false, error: "No text provided. Select text on the page first." };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: "OPENAI_API_KEY not configured on server." };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = `
You are Aura helping explain web content.
Rules:
- Use ONLY the provided selection and context.
- Explain clearly and concisely.
- If missing key details, ask ONE targeted question max.
- Be practical and direct.
`.trim();

  const user = `
Page: ${title || "(unknown)"}
URL: ${url || "(unknown)"}

Question: ${q}

Selected text:
${sel || "(none)"}

Context:
${ctx || "(none)"}
`.trim();

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.3,
      max_tokens: 600
    });

    const answer = resp.choices?.[0]?.message?.content?.trim() || "No answer generated.";
    return { success: true, data: { answer } };
  } catch (error) {
    return { success: false, error: `AI service error: ${error.message}` };
  }
}
