
import { GoogleGenAI, Type } from "@google/genai";
import type { Schema } from "@google/genai";
import { AIResponse, LevelConfig, DifficultyMode } from '../types';
import { LanguageCode } from '../translations';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'demo-key' });

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    isSuccess: { type: Type.BOOLEAN },
    scriptureRef: { type: Type.STRING, nullable: true }
  },
  required: ["text", "isSuccess"],
};

export const generateGuideResponse = async (
  level: LevelConfig, 
  userMessage: string, 
  history: string[],
  language: LanguageCode,
  difficulty: DifficultyMode = 'normal'
): Promise<AIResponse> => {
  const systemInstruction = `You are 'The Guide' for a biblical pilgrimage. The player is embodying the character of ${level.bibleContext.character} from ${level.bibleContext.reference}. 

  Character Context: ${level.bibleContext.narrativeIntro}
  
  Goal: Help the player overcome ${level.sin} through ${level.virtue}. 
  Speak to them AS IF they are ${level.bibleContext.character}, using appropriate biblical language and context.
  Reference their specific situation and challenges from the scripture.
  Respond in ${language}. 
  Current Difficulty: ${difficulty}.
  
  IMPORTANT: Make the player feel immersed in their character's journey. Use "you" to address them as the character, not as a modern player.`;

  // Check if API key is configured
  if (!process.env.API_KEY || process.env.API_KEY === 'your_google_ai_api_key_here') {
    console.warn("AI Service: No valid API key configured. Using demo mode.");
    return { 
      text: `My child ${level.bibleContext.character}, I see the weight of ${level.sin} upon your heart. Yet through ${level.virtue}, you shall find strength. As you walk this path, remember that ${level.bibleContext.narrativeIntro.split('.')[0]}. What troubles your spirit today?`,
      isSuccess: true 
    };
  }

  try {
    console.log("AI Request - API Key available:", !!process.env.API_KEY);
    console.log("AI Request - Model: gemini-1.5-flash");
    console.log("AI Request - Character:", level.bibleContext.character);
    console.log("AI Request - Message:", userMessage);
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: userMessage,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });
    
    console.log("AI Response:", response);
    return JSON.parse(response.text || "{}") as AIResponse;
  } catch (error) {
    console.error("AI Error Details:", error);
    return { 
      text: `My dear ${level.bibleContext.character}, even in moments of uncertainty, the path forward becomes clear through prayer and reflection. Take a moment to consider how ${level.virtue} can guide you past ${level.sin}. What specific guidance do you seek on your journey?`, 
      isSuccess: false 
    };
  }
};

export const getIntroMessage = async (level: LevelConfig, language: LanguageCode): Promise<string> => {
  return level.bibleContext.narrativeIntro;
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
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Generate a daily devotional. Theme: ${theme}. Target Language: ${language}. Ensure the scripture is central.`,
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
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Translate the following text to ${targetLanguage}. Keep the tone spiritual and reverent: "${text}"`,
    });
    return response.text || text;
  } catch (error) {
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
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Identify the bible verse described or referenced here: "${query}". Return the full text in ${language} language.`,
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
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Find FREE Christian resources, ministries, and study materials for: "${query}".`,
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
