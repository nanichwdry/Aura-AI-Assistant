import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use phrases, not single common words
const ANCHOR_PHRASES = [
  "feeling low", "feeling down", "can't handle", "cant handle", "so tired of",
  "overwhelmed", "panic", "panicking", "anxious", "anxiety", "depressed",
  "lonely", "hopeless", "scared", "burnt out", "burned out", "breaking down",
  "i can't sleep", "cant sleep", "i feel empty"
];

const TEACHER_PHRASES = [
  "teach me", "explain", "how does", "how to", "step by step", "tutorial",
  "guide me", "help me learn", "show me how"
];

const PHILOSOPHER_PHRASES = [
  "why do i always", "why do i keep", "what's the meaning", "what is the meaning",
  "what's my purpose", "what should i do", "what if", "i feel stuck",
  "pattern i keep", "why am i like this"
];

const FRIEND_PHRASES = [
  "i got", "i did it", "achieved", "excited", "celebrate", "won", "promotion",
  "interview", "good news", "happy", "proud"
];

function scorePhrases(text, phrases) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const p of phrases) {
    if (lower.includes(p)) score += 2; // phrases are stronger signals
  }
  return score;
}

function shortNeutral(text) {
  const t = text.trim().toLowerCase();
  return t.length <= 6 && ["ok", "okay", "k", "yeah", "yep", "fine", "hmm", "sure"].includes(t);
}

function detectSafety(text) {
  const lower = text.toLowerCase();
  const selfHarm = [
    "kill myself", "suicide", "end it", "end my life", "better off dead",
    "hurt myself", "self harm"
  ];
  if (selfHarm.some((kw) => lower.includes(kw))) return { escalation: "encourage_support" };
  return { escalation: "none" };
}

async function classifyWithLLM(text) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          `Classify into ONE mode: anchor | teacher | philosopher | friend.
anchor: user is emotionally distressed or needs support.
teacher: user wants to learn or understand.
philosopher: meaning/purpose/patterns/reflective.
friend: casual chat or celebrating.
Return ONLY the single word.`
      },
      { role: "user", content: text }
    ],
    temperature: 0.1,
    max_tokens: 5
  });

  const mode = completion.choices?.[0]?.message?.content?.trim()?.toLowerCase();
  return ["anchor", "teacher", "philosopher", "friend"].includes(mode) ? mode : "friend";
}

export async function determinePersona({ text, userProfile = {}, session = {} }) {
  const safety = detectSafety(text);

  // Keep mode stable on short neutral replies
  if (shortNeutral(text) && session.lastMode) {
    return { mode: session.lastMode, style: null, safety };
  }

  const scores = {
    anchor: scorePhrases(text, ANCHOR_PHRASES),
    teacher: scorePhrases(text, TEACHER_PHRASES),
    philosopher: scorePhrases(text, PHILOSOPHER_PHRASES),
    friend: scorePhrases(text, FRIEND_PHRASES)
  };

  // Hard force anchor when safety triggers
  if (safety.escalation !== "none") {
    return {
      mode: "anchor",
      style: { warmth: 1.0, verbosity: 0.3, directness: 0.6, questionCountMax: 1 },
      safety
    };
  }

  // Mode inertia: if lastMode was anchor and message is not clearly another intent, stay anchor
  const maxScore = Math.max(...Object.values(scores));
  let mode;

  if (session.lastMode === "anchor" && maxScore < 2) {
    mode = "anchor";
  } else if (maxScore >= 2) {
    mode = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  } else {
    mode = await classifyWithLLM(text);
  }

  // Style preference should influence verbosity, not mode
  const verbosityPref = (userProfile.tonePreference || "").toLowerCase(); // e.g., "short" | "detailed"
  const baseStyles = {
    anchor: { warmth: 1.0, verbosity: 0.35, directness: 0.6, questionCountMax: 1 },
    teacher: { warmth: 0.6, verbosity: 0.8, directness: 0.9, questionCountMax: 0 },
    philosopher: { warmth: 0.6, verbosity: 0.6, directness: 0.5, questionCountMax: 1 },
    friend: { warmth: 0.9, verbosity: 0.5, directness: 0.7, questionCountMax: 1 }
  };

  const style = { ...baseStyles[mode] };
  if (verbosityPref === "short") style.verbosity = Math.max(0.2, style.verbosity - 0.25);
  if (verbosityPref === "detailed") style.verbosity = Math.min(1.0, style.verbosity + 0.25);

  return { mode, style, safety };
}
