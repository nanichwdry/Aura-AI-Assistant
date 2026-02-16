import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ANCHOR_KEYWORDS = ['feeling', 'anxious', 'sad', 'depressed', 'lonely', 'scared', 'worried', 'stressed', 'overwhelmed', 'hurt', 'pain', 'cry', 'help me'];
const TEACHER_KEYWORDS = ['teach', 'explain', 'how does', 'what is', 'how to', 'learn', 'understand', 'tutorial', 'guide', 'show me'];
const PHILOSOPHER_KEYWORDS = ['why do i', 'why does', 'meaning', 'purpose', 'should i', 'what if', 'always', 'never', 'pattern', 'keep doing'];
const FRIEND_KEYWORDS = ['got', 'achieved', 'excited', 'celebrate', 'won', 'finished', 'made it', 'interview', 'promotion'];

function scoreMode(text) {
  const lower = text.toLowerCase();
  const scores = {
    anchor: 0,
    teacher: 0,
    philosopher: 0,
    friend: 0
  };

  ANCHOR_KEYWORDS.forEach(kw => { if (lower.includes(kw)) scores.anchor++; });
  TEACHER_KEYWORDS.forEach(kw => { if (lower.includes(kw)) scores.teacher++; });
  PHILOSOPHER_KEYWORDS.forEach(kw => { if (lower.includes(kw)) scores.philosopher++; });
  FRIEND_KEYWORDS.forEach(kw => { if (lower.includes(kw)) scores.friend++; });

  return scores;
}

async function classifyWithLLM(text) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: `Classify user message into ONE mode:
- "anchor": emotional support, feeling low/anxious/sad
- "teacher": wants to learn/understand something
- "philosopher": existential questions, patterns, meaning
- "friend": sharing wins, casual chat, excitement

Return only: anchor, teacher, philosopher, or friend`
    }, {
      role: 'user',
      content: text
    }],
    temperature: 0.1,
    max_tokens: 10
  });

  const mode = completion.choices[0].message.content.trim().toLowerCase();
  return ['anchor', 'teacher', 'philosopher', 'friend'].includes(mode) ? mode : 'friend';
}

function detectSafety(text) {
  const lower = text.toLowerCase();
  const selfHarmKeywords = ['kill myself', 'end it', 'suicide', 'not worth living', 'better off dead'];
  
  if (selfHarmKeywords.some(kw => lower.includes(kw))) {
    return { escalation: 'encourage_support' };
  }
  
  return { escalation: 'none' };
}

export async function determinePersona({ text, userProfile = {}, session = {} }) {
  const scores = scoreMode(text);
  const safety = detectSafety(text);

  // Force anchor if score >= 2 or safety escalation
  if (scores.anchor >= 2 || safety.escalation !== 'none') {
    return {
      mode: 'anchor',
      style: {
        warmth: 1.0,
        verbosity: 0.3,
        directness: 0.8,
        questionCountMax: 1
      },
      safety
    };
  }

  // Determine mode from scores
  let mode = 'friend';
  const maxScore = Math.max(...Object.values(scores));
  
  if (maxScore > 0) {
    mode = Object.entries(scores).find(([_, score]) => score === maxScore)[0];
  } else {
    // Ambiguous - use LLM
    mode = await classifyWithLLM(text);
  }

  // Apply user preference override
  if (userProfile.tonePreference && ['anchor', 'teacher', 'philosopher', 'friend'].includes(userProfile.tonePreference)) {
    mode = userProfile.tonePreference;
  }

  // Mode-specific styles
  const styles = {
    anchor: { warmth: 1.0, verbosity: 0.3, directness: 0.8, questionCountMax: 1 },
    teacher: { warmth: 0.7, verbosity: 0.8, directness: 0.9, questionCountMax: 0 },
    philosopher: { warmth: 0.6, verbosity: 0.6, directness: 0.5, questionCountMax: 1 },
    friend: { warmth: 0.9, verbosity: 0.5, directness: 0.7, questionCountMax: 1 }
  };

  return {
    mode,
    style: styles[mode],
    safety
  };
}
