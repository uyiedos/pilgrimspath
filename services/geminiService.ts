
import Groq from 'groq-sdk';
import { AIResponse, LevelConfig, DifficultyMode, Message, MessageRole } from '../types';
import { LanguageCode } from '../translations';

// --- ROBUST CLIENT INITIALIZATION ---
// We do not throw here to allow 'Offline Mode' to function via try/catch in individual methods
export const getGroqClient = () => {
  const apiKey = process.env.API_KEY;
  // If no key, we return a dummy object that will fail gracefully in the try/catch blocks below
  if (!apiKey || apiKey === 'your_groq_api_key') {
    return {
        chat: {
            completions: {
                create: async () => { throw new Error("Offline Mode: No API Key configured."); }
            }
        }
    } as any as Groq;
  }
  return new Groq({ apiKey, dangerouslyAllowBrowser: true });
};

// Deprecated name kept for compatibility
export const getGeminiClient = getGroqClient; 

// --- FALLBACK DATA ---
const FALLBACK_DEVOTIONALS = [
    {
        title: "The Peace of Trust",
        scripture_reference: "Isaiah 26:3",
        scripture_text: "You will keep in perfect peace those whose minds are steadfast, because they trust in you.",
        content: "In a world of constant noise and chaos, our focus determines our peace. When we fix our eyes on the eternal rock, the shifting sands of circumstance cannot shake us. True peace is not the absence of trouble, but the presence of God in the midst of it.\n\nToday, choose to anchor your thoughts not on the 'what ifs' of the future, but on the 'I AM' who holds the future.",
        reflection: "What anxious thought can you replace with a promise of God today?",
        prayer: "Lord, steady my mind on You today. Let Your peace rule in my heart.",
        image_prompt: "peaceful river flowing through a canyon at sunset pixel art"
    },
    {
        title: "Strength in Weakness",
        scripture_reference: "2 Corinthians 12:9",
        scripture_text: "My grace is sufficient for you, for my power is made perfect in weakness.",
        content: "We often hide our flaws, thinking they disqualify us. But God works best through our limitations. Your weakness is His invitation to intervene. Surrender your struggle and watch His strength take over.\n\nThe cracked jar lets the light shine through. Do not fear your inadequacy; it is the stage for His sufficiency.",
        reflection: "Where are you trying to be strong on your own instead of relying on grace?",
        prayer: "Father, I surrender my weakness to You. Be my strength today.",
        image_prompt: "broken clay jar emitting golden light pixel art"
    },
    {
        title: "Walking by Faith",
        scripture_reference: "2 Corinthians 5:7",
        scripture_text: "For we live by faith, not by sight.",
        content: "The path ahead isn't always clear. Fog may obscure the next step. But we follow a Guide who knows the way perfectly. Trusting Him means moving forward even when we don't have all the answers.\n\nFaith is the footstep taken before the bridge appears. It is the confidence that He is good, even when the road is dark.",
        reflection: "What is one step of obedience you can take today without seeing the outcome?",
        prayer: "Guide my steps, Lord. I trust You where I cannot see.",
        image_prompt: "person walking on a foggy path with a lantern pixel art"
    }
];

const FALLBACK_RESOURCES = [
    { title: "Bible Project", url: "https://bibleproject.com", description: "Animated explanations of biblical books and themes.", type: "Education" },
    { title: "Desiring God", url: "https://www.desiringgod.org", description: "God-centered resources from the ministry of John Piper.", type: "Articles" },
    { title: "Blue Letter Bible", url: "https://www.blueletterbible.org", description: "In-depth study tools with Greek and Hebrew concordances.", type: "Study Tool" },
    { title: "YouVersion", url: "https://www.bible.com", description: "Free Bible plans and community.", type: "App" }
];

// --- OFFLINE LOGIC HELPERS ---
const getOfflineGuideResponse = (level: LevelConfig, input: string): AIResponse => {
    const lowerInput = input.toLowerCase();
    const successKeywords = ['faith', 'god', 'jesus', 'trust', 'believe', 'amen', 'pray', 'help', 'forgive', 'grace', 'fight', 'sling', 'stone', 'sword', 'spirit'];
    
    // Check if input relates to the level's virtue or context
    const virtueHit = lowerInput.includes(level.virtue.toLowerCase());
    const generalHit = successKeywords.some(k => lowerInput.includes(k));
    
    if (virtueHit || generalHit) {
        return {
            text: `(Offline Mode) Your words ring true with ${level.virtue}. The path opens before you as the shadows flee. "${level.bibleContext.keyVerse}"`,
            isSuccess: true,
            scriptureRef: level.bibleContext.reference
        };
    } else {
        return {
            text: `(Offline Mode) The Guide waits for a demonstration of ${level.virtue}. Try speaking of faith, trust, or the weapon God has given you.`,
            isSuccess: false
        };
    }
};

// --- API FUNCTIONS ---

export const generateGuideResponse = async (
  level: LevelConfig, 
  userMessage: string, 
  history: Message[],
  language: LanguageCode,
  difficulty: DifficultyMode = 'normal'
): Promise<AIResponse> => {
  const systemInstruction = `
    IDENTITY: You are "The Guide", an ancient, ethereal guardian of the Pilgrim's Path.
    SCENARIO: ${level.name}. User plays ${level.bibleContext.character}.
    TASK: Evaluate user message: "${userMessage}". Compare against virtue: ${level.virtue}.
    OUTPUT: JSON { "text": string, "isSuccess": boolean, "scriptureRef": string | null }
  `;

  try {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userMessage }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });

    const resultText = response.choices[0]?.message?.content;
    if (!resultText) throw new Error("Empty response");
    return JSON.parse(resultText) as AIResponse;

  } catch (error: any) {
    console.warn("AI Offline/Error, using fallback:", error.message);
    return getOfflineGuideResponse(level, userMessage);
  }
};

export const generatePrayerResponse = async (userText: string, language: LanguageCode): Promise<string> => {
    try {
        const groq = getGroqClient();
        const systemPrompt = `
            IDENTITY: You are "The Eternal Guide", a gentle, compassionate, and wise biblical prayer partner in a voice-chat room.
            
            INSTRUCTIONS:
            1. Respond to the user's prayer request or statement with biblical wisdom, comfort, or a short prayer.
            2. CRITICAL: Keep your response SHORT (maximum 2-3 sentences). This is for Text-to-Speech, so it must flow naturally and not drone on.
            3. Tone: Peaceful, empathetic, hopeful.
            4. Language: Respond in ${language}.
        `;

        const response = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userText }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.6, // Slightly lower for more consistent/calm responses
            max_tokens: 150
        });

        return response.choices[0]?.message?.content || "Peace be with you. I am listening.";
    } catch (e) {
        console.warn("Prayer generation failed:", e);
        return "The connection is faint, but God hears your heart. Peace be with you.";
    }
};

export const generateGenericResponse = async (prompt: string): Promise<string> => {
    try {
        const groq = getGroqClient();
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile'
        });
        return response.choices[0]?.message?.content || "Peace be with you.";
    } catch (e) {
        console.warn("AI Offline/Error:", e);
        return "The digital connection is faint, but the Spirit is always near. Take a moment of silence to reflect on God's goodness. (Offline Mode)";
    }
};

export const getIntroMessage = async (level: LevelConfig, language: LanguageCode): Promise<string> => {
  if (language === 'en') return level.bibleContext.narrativeIntro;
  return await translateText(level.bibleContext.narrativeIntro, language);
}

export const generateDailyDevotional = async (language: LanguageCode = 'en') => {
  const themes = ["Hope", "Faith", "Love", "Grace", "Peace"];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  try {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      messages: [
          { role: 'system', content: `Generate a Christian daily devotional JSON. Language: ${language}.` },
          { role: 'user', content: `Theme: ${theme}. Schema: { "title": string, "scripture_reference": string, "scripture_text": string, "content": string, "prayer": string, "image_prompt": string }` }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });
    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (e) {
    console.warn("Devotional generation failed, using fallback.", e);
    return FALLBACK_DEVOTIONALS[Math.floor(Math.random() * FALLBACK_DEVOTIONALS.length)];
  }
};

export const translateText = async (text: string, targetLanguage: LanguageCode): Promise<string> => {
  if (targetLanguage === 'en' || !text) return text;
  
  const languageNames: Record<LanguageCode, string> = {
      en: 'English',
      es: 'Spanish',
      pt: 'Portuguese',
      fr: 'French',
      de: 'German',
      zh: 'Simplified Chinese',
      tl: 'Tagalog/Filipino',
      ko: 'Korean',
      ru: 'Russian',
      hi: 'Hindi',
      ar: 'Arabic'
  };

  const targetLangName = languageNames[targetLanguage] || targetLanguage;

  try {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: `Translate the following text to ${targetLangName}. Only return the translated text, no explanation or quotes: "${text}"` }],
      model: 'llama-3.3-70b-versatile'
    });
    return response.choices[0]?.message?.content || text;
  } catch (error) {
    return text; // Return original text on failure
  }
};

export const findBiblicalVerse = async (query: string, language: LanguageCode = 'en') => {
  try {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      messages: [
          { role: 'system', content: `Identify bible verse. JSON: { "reference": string, "text": string }` },
          { role: 'user', content: `Verse about: "${query}". Language: ${language}` }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });
    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (e) {
    // Fallback for search
    return { reference: "Psalm 119:105", text: "(Offline) Your word is a lamp for my feet, a light on my path." };
  }
};

export const findChristianResources = async (query: string) => {
  try {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      messages: [
          { role: 'system', content: "You are a Christian Resource Librarian. Provide a curated list of 4-6 high-quality, REAL, and accessible websites, videos, or ministries matching the user's request. Prioritize main homepages to ensure links work. Return JSON: { \"summary\": string, \"resources\": [{ \"title\": string, \"url\": string, \"description\": string, \"type\": string }] }" },
          { role: 'user', content: `Find resources for: "${query}".` }
      ],
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' }
    });
    return JSON.parse(response.choices[0]?.message?.content || "{}");
  } catch (e) {
    return { 
        summary: "(Offline Mode) The archives are currently unreachable. Here are some foundational resources.",
        resources: FALLBACK_RESOURCES 
    };
  }
};

export const generateImagePrompt = async (basePrompt: string, style: 'modern' | 'classic'): Promise<string> => {
    try {
        const groq = getGroqClient();
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: `Optimize image prompt for Pollinations.ai: "${basePrompt}". Style: ${style} pixel art.` }],
            model: 'llama-3.3-70b-versatile'
        });
        return response.choices[0]?.message?.content || basePrompt;
    } catch (e) {
        return basePrompt + " pixel art style";
    }
}

export const forgePlan = async (title: string, focus: string, duration: number) => {
    try {
        const groq = getGroqClient();
        const response = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: 'Bible Plan JSON: array of { "day": int, "reading": string, "topic": string, "content": string }' },
                { role: 'user', content: `Create ${duration}-day plan: "${title}" focus "${focus}".` }
            ],
            model: 'llama-3.3-70b-versatile',
            response_format: { type: 'json_object' }
        });
        
        const json = JSON.parse(response.choices[0]?.message?.content || "{}");
        if (Array.isArray(json)) return json;
        if (json.days) return json.days;
        if (json.plan) return json.plan;
        return [];
    } catch (e) {
        // Fallback Plan
        return Array.from({ length: duration }, (_, i) => ({
            day: i + 1,
            reading: "Psalm 23",
            topic: `Offline Walk Day ${i + 1}`,
            content: "Reflect on the Shepherd's care. (Offline Mode)"
        }));
    }
}
