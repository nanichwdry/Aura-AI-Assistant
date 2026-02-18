import OpenAI from "openai";

function clip(s = "", n = 8000) {
  s = String(s || "");
  return s.length > n ? s.slice(0, n) + "\n...[clipped]" : s;
}

export async function vscode_help(input = {}) {
  const {
    question,
    filePath,
    languageId,
    selectionText,
    contextSnippet,
    diagnostics,
    terminalTail
  } = input;

  const q = (question || "Help me fix this").trim();

  const sel = clip(selectionText || "", 6000);
  const ctx = clip(contextSnippet || "", 6000);
  const term = clip(terminalTail || "", 8000);
  const diags = diagnostics ? JSON.stringify(diagnostics, null, 2) : "[]";

  if (!sel && !ctx && !term && diags === "[]") {
    return { success: false, error: "No code/error context provided." };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: "OPENAI_API_KEY not configured on server." };
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const system = `
You are Aura helping inside VS Code.
Rules:
- Use ONLY the provided snippet/diagnostics/terminal output.
- If missing a key detail, ask ONE targeted question max.
- Output structure:
  1) Root cause
  2) Exact fix steps
  3) Patch/diff if possible
Be precise and practical.
`.trim();

  const user = `
File: ${filePath || "(unknown)"}
Language: ${languageId || "(unknown)"}

Question: ${q}

Selected:
${sel || "(none)"}

Context snippet:
${ctx || "(none)"}

Diagnostics:
${diags}

Terminal output:
${term || "(none)"}
`.trim();

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2,
      max_tokens: 650
    });

    const answer = resp.choices?.[0]?.message?.content?.trim() || "No answer.";
    return { success: true, data: { answer } };
  } catch (error) {
    return { success: false, error: `AI service error: ${error.message}` };
  }
}
