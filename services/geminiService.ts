
import { GoogleGenAI, Type } from "@google/genai";
import type { Schema } from "@google/genai";
import { AIResponse, LevelConfig, DifficultyMode, Message, MessageRole } from '../types';
import { LanguageCode } from '../translations';

// CENTRALIZED CLIENT INITIALIZATION
// This ensures we rely completely on the environment variables defined in .env.local
export const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("CRITICAL ERROR: API Key is missing.");
    console.error("Please create a .env.local file in the root directory with: VITE_GEMINI_API_KEY=your_key_here");
    throw new Error("API Key missing. Check .env.local configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    isSuccess: { type: Type.BOOLEAN },
    scriptureRef: { type: Type.STRING } 
  },
  required: ["text", "isSuccess"],
};

export const generateGuideResponse = async (
  level: LevelConfig, 
  userMessage: string, 
  history: Message[],
  language: LanguageCode,
  difficulty: DifficultyMode = 'normal'
): Promise<AIResponse> => {
  // Enhanced Persona & Context Injection with Environmental Focus
  const systemInstruction = `
    IDENTITY: You are "The Guide", an ancient, ethereal guardian of the Pilgrim's Path. You speak with wisdom, gravity, and biblical authority.
    
    SCENARIO CONTEXT:
    - Role: The user is playing as ${level.bibleContext.character}.
    - Location: ${level.name}.
    - Scene Description: ${level.bibleContext.narrativeIntro}
    - Spiritual Conflict: Battling "${level.sin}" vs "${level.virtue}".
    - The Hidden Truth: "${level.bibleContext.keyVerse}"
    
    YOUR MISSION:
    1. ENVIRONMENTAL ANALYSIS: Begin your response by vividy describing the immediate environment. What does the character see, hear, and feel? (e.g., "The cold waves crash against your shins," "The giant's shadow blocks the sun," "The crowd jeers loudly"). Make the player feel present in the biblical scene.
    2. EVALUATE ACTION: Judge the User's message ("${userMessage}") against the virtue of ${level.virtue}.
    3. DIFFICULTY (${difficulty.toUpperCase()}):
       - EASY: Allow simple intent.
       - NORMAL: Require specific action or reflection.
       - HARD: Require scripture quotation or deep theological insight.
    4. OUTCOME:
       - SUCCESS: If they demonstrate ${level.virtue}, set 'isSuccess' to TRUE. Narrate the victory (e.g., "Jesus catches your hand," "The stone strikes true"). Reveal the verse.
       - FAIL: If they falter, set 'isSuccess' to FALSE. Narrate the consequence (e.g., "You sink beneath the waves," "Fear freezes your feet"). Offer a hint.
    
    FORMATTING:
    - Keep response under 70 words (concise but descriptive).
    - Language: ${language}.
  `;

  try {
    const ai = getGeminiClient();

    // 1. Format History for Gemini (Filter out system messages if any)
    const contents = history
      .filter(m => m.role === MessageRole.USER || m.role === MessageRole.GUIDE)
      .map(m => ({
        role: m.role === MessageRole.USER ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

    // 2. Add Current User Message
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    // 3. Call API
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI");

    const result = JSON.parse(resultText);
    return result as AIResponse;

  } catch (error: any) {
    console.error("AI Guide Error:", error);
    return { text: "The connection to the guide is faint (API Error). Please try again.", isSuccess: false };
  }
};

export const getIntroMessage = async (level: LevelConfig, language: LanguageCode): Promise<string> => {
  if (language === 'en') return level.bibleContext.narrativeIntro;
  return await translateText(level.bibleContext.narrativeIntro, language);
}

const devotionalSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    scripture: { type: Type.STRING, description: "Book Chapter:Verse - The full text of the verse." },
    content: { type: Type.STRING, description: "A 2-3 paragraph spiritual meditation." },
    prayer: { type: Type.STRING, description: "A short closing prayer." },
    image_prompt: { type: Type.STRING, description: "A visual prompt for an AI image based on the theme." }
  },
  required: ["title", "scripture", "content", "prayer", "image_prompt"]
};

export const generateDailyDevotional = async (language: LanguageCode = 'en') => {
  const themes = ["Hope", "Perseverance", "Faith", "Love", "Discipline", "Wisdom", "Grace", "Strength"];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `Generate a daily devotional. Theme: ${theme}. Target Language: ${language}. Ensure the scripture is central.` }] }],
      config: {
        systemInstruction: "You are a wise theologian. Create meaningful, biblically-grounded spiritual content.",
        responseMimeType: "application/json",
        responseSchema: devotionalSchema,
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Devotional generation failed", e);
    return null;
  }
};

export const translateText = async (text: string, targetLanguage: LanguageCode): Promise<string> => {
  if (targetLanguage === 'en' || !text) return text;
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `Translate the following text to ${targetLanguage}. Keep the tone spiritual and reverent: "${text}"` }] }],
    });
    return response.text || text;
  } catch (error) {
    console.error("Translation failed", error);
    return text;
  }
};

const verseLookupSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    reference: { type: Type.STRING, description: "The full canonical bible reference (e.g. John 3:16)" },
    text: { type: Type.STRING, description: "The full text of the identified verse in the requested language." }
  },
  required: ["reference", "text"]
};

export const findBiblicalVerse = async (query: string, language: LanguageCode = 'en') => {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `Identify the bible verse described or referenced here: "${query}". Return the full text in ${language} language.` }] }],
      config: {
        systemInstruction: "You are a biblical scholar. Identify exact verses and provide their full text accurately in the requested language.",
        responseMimeType: "application/json",
        responseSchema: verseLookupSchema,
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Verse lookup failed", e);
    return null;
  }
};

const resourceSearchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "A brief, encouraging summary of the resources found." },
    resources: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING },
          description: { type: Type.STRING, description: "A short description of what this resource offers." },
          type: { type: Type.STRING, description: "e.g. 'Book', 'Video', 'Ministry', 'Study Guide', 'Article'" }
        }
      }
    }
  },
  required: ["summary", "resources"]
};

export const findChristianResources = async (query: string) => {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: `Find FREE Christian resources, ministries, and study materials for: "${query}".` }] }],
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a Christian Resource Librarian. Connect seekers with free spiritual materials.",
        responseMimeType: "application/json",
        responseSchema: resourceSearchSchema
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Resource search failed", e);
    return null;
  }
};
