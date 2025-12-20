
import { GoogleGenAI, Type } from "@google/genai";
import type { Schema } from "@google/genai";
import { AIResponse, LevelConfig, DifficultyMode } from '../types';
import { LanguageCode } from '../translations';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
  const systemInstruction = `You are 'The Guide' for a biblical pilgrimage. Goal: Overcome ${level.sin} through ${level.virtue}. Respond in ${language}. Current Difficulty: ${difficulty}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });
    return JSON.parse(response.text || "{}") as AIResponse;
  } catch (error) {
    return { text: "The path is narrow. Keep seeking.", isSuccess: false };
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
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
      contents: `Translate the following text to ${targetLanguage}. Keep the tone spiritual and reverent: "${text}"`,
    });
    return response.text?.trim() || text;
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
      model: 'gemini-3-flash-preview',
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

/**
 * Uses Google Search Grounding to bypass iframe restrictions.
 * Acts as a proxy that extracts the main content of any site or search query.
 */
export const fetchWebContent = async (queryOrUrl: string) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `MANIFEST ZONE: ${queryOrUrl}. 
            If this is a URL, visit it and provide the FULL TEXT content formatted in beautiful Markdown. 
            If this is a query, perform a deep search and provide a comprehensive report. 
            Always strip ads, sidebars, and clutter. Present only the 'Essence' of the truth.`,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "You are the Nexus Spectral Browser. You manifest blocked web content into the Sanctuary. Use Markdown (bold, headers, lists) to make the content readable and majestic."
            }
        });

        return {
            text: response.text,
            sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
        };
    } catch (e) {
        console.error("Extraction failed", e);
        return null;
    }
};
