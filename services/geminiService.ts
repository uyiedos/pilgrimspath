
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
  
  IMPORTANT: Make the player feel immersed in their character's journey. Use "you" to address them as the character, not as a modern player.
  
  PROGRESSION HELPERS:
  - If player seems stuck, provide gentle hints about what they should focus on
  - Guide them toward understanding how ${level.virtue} helps overcome ${level.sin}
  - Reference the key verse: "${level.bibleContext.keyVerse}" when appropriate
  - When they show understanding, reward them with scripture references
  - Keep responses conversational and encouraging, not preachy
  
  INTERACTION STYLE:
  - Ask questions to guide their thinking
  - Share relevant biblical stories or parables
  - Connect their struggles to the character's biblical journey
  - Be patient and supportive in your guidance`;

  // Check if API key is configured
  if (!process.env.API_KEY || process.env.API_KEY === 'your_google_ai_api_key_here') {
    console.warn("AI Service: No valid API key configured. Using enhanced demo mode.");
    
    // Dynamic demo mode with contextual responses based on user input
    const userMessageLower = userMessage.toLowerCase();
    let responseText = '';
    let successRate = 0.3; // Base success rate
    
    // Generate contextual responses based on user input
    if (userMessageLower.includes('help') || userMessageLower.includes('stuck')) {
      responseText = `My dear ${level.bibleContext.character}, I sense your struggle with ${level.sin}. Remember that ${level.virtue} is your key to freedom. Consider what small step of ${level.virtue} you could take right now. Even the mightiest prophets began with a single act of faith.`;
      successRate = 0.6;
    } else if (userMessageLower.includes('why') || userMessageLower.includes('how')) {
      responseText = `${level.bibleContext.character}, your question reveals a seeking heart. The scriptures teach that ${level.virtue} conquers ${level.sin} through divine grace. As it is written: "${level.bibleContext.keyVerse}". How might this truth apply to your current situation?`;
      successRate = 0.5;
    } else if (userMessageLower.includes(level.virtue.toLowerCase())) {
      responseText = `Excellent insight, ${level.bibleContext.character}! You're beginning to understand the power of ${level.virtue}. This virtue was instrumental in your biblical journey - ${level.bibleContext.narrativeIntro.split('.')[0]}. Continue to embrace this truth, and you will see victory over ${level.sin}.`;
      successRate = 0.8;
    } else if (userMessageLower.includes(level.sin.toLowerCase())) {
      responseText = `I understand your battle with ${level.sin}, my child. This is the very struggle that defined your character's journey in ${level.bibleContext.reference}. But take heart! ${level.virtue} is the divine weapon given to you. What aspect of ${level.virtue} could you focus on today?`;
      successRate = 0.4;
    } else if (userMessageLower.includes('thank') || userMessageLower.includes('grateful')) {
      responseText = `Your gratitude pleases the divine, ${level.bibleContext.character}. A thankful heart opens the way for ${level.virtue} to flourish. As you continue this journey, remember that every step forward in ${level.virtue} is a victory over ${level.sin}. How else can I guide you today?`;
      successRate = 0.7;
    } else {
      // Default contextual responses
      const defaultResponses = [
        `Welcome, ${level.bibleContext.character}. I am here to guide you on this sacred journey. Your path involves overcoming ${level.sin} through the power of ${level.virtue}. What weighs most heavily on your heart today?`,
        `${level.bibleContext.character}, I see you seeking wisdom. Remember your story from ${level.bibleContext.reference} - ${level.bibleContext.narrativeIntro.split('.')[0]}. How can ${level.virtue} help you in your current struggle with ${level.sin}?`,
        `My child ${level.bibleContext.character}, the divine has brought you here for a purpose. Your journey through ${level.sin} toward ${level.virtue} mirrors the path of many great prophets. What aspect of this challenge would you like to explore?`
      ];
      responseText = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }
    
    return { 
      text: responseText,
      isSuccess: Math.random() < successRate
    };
  }

  try {
    console.log("AI Request - API Key available:", !!process.env.API_KEY);
    console.log("AI Request - Model: gemini-1.5-flash");
    console.log("AI Request - Character:", level.bibleContext.character);
    console.log("AI Request - Message:", userMessage);
    
    // Build conversation context from history
    let conversationContext = '';
    if (history && history.length > 0) {
      const recentHistory = history.slice(-4); // Last 4 messages for context
      conversationContext = `\n\nRecent conversation:\n${recentHistory.join('\n')}`;
    }
    
    const fullPrompt = `${userMessage}${conversationContext}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });
    
    console.log("AI Response:", response);
    const result = JSON.parse(response.text || "{}") as AIResponse;
    
    // Make progression easier by being more generous with success
    if (!result.isSuccess && userMessage.toLowerCase().includes(level.virtue.toLowerCase())) {
      result.isSuccess = true;
      result.scriptureRef = level.bibleContext.reference;
    }
    
    // Prevent repetitive responses
    if (history.length > 0 && result.text === history[history.length - 1]) {
      result.text = `${result.text} Let me elaborate further on this spiritual truth...`;
    }
    
    return result;
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
