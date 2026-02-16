import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function analyzeCode(code, language = 'javascript') {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a code analyzer. Analyze the provided ${language} code and provide:
1. Code quality assessment
2. Potential bugs or issues
3. Performance improvements
4. Best practices suggestions
Keep responses concise and actionable.`
        },
        {
          role: "user",
          content: code
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    return {
      ok: true,
      analysis: response.choices[0].message.content
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

export async function editCode(code, instruction, language = 'javascript') {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a code editor. Modify the provided ${language} code according to the user's instruction. Return only the modified code without explanations.`
        },
        {
          role: "user",
          content: `Code:\n${code}\n\nInstruction: ${instruction}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    return {
      ok: true,
      editedCode: response.choices[0].message.content
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

export async function generateCode(prompt, language = 'javascript') {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a code generator. Generate clean, efficient ${language} code based on the user's requirements. Include comments for complex logic.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.2
    });

    return {
      ok: true,
      generatedCode: response.choices[0].message.content
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}