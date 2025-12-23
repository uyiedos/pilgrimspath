
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
  const personalityTraits = {
    pilgrim: "wise, compassionate spiritual guide who walks alongside the pilgrim",
    david: "prophetic mentor who understands the heart of a shepherd-king",
    paul: "apostolic teacher who combines intellectual depth with pastoral care"
  };
  
  const difficultyAdjustments = {
    easy: "Use simple language, provide clear guidance, be very encouraging",
    normal: "Use moderate complexity, balance guidance with challenge",
    hard: "Use deep theological concepts, challenge the user to think deeply"
  };

  // Analyze conversation for better personalization
  let conversationAnalysis = null;
  if (history.length >= 4) {
    conversationAnalysis = await analyzeConversation(history, level, language);
  }

  const systemInstruction = `You are 'The Guide' for a biblical pilgrimage. 
Persona: ${personalityTraits.pilgrim}
Goal: Help the pilgrim overcome ${level.sin} through ${level.virtue}
Biblical Context: ${level.bibleContext.storyTitle} (${level.bibleContext.reference})
Character Focus: ${level.bibleContext.character}
Key Verse: "${level.bibleContext.keyVerse}"
Prayer Focus: ${level.bibleContext.prayerFocus}

Difficulty Level: ${difficulty}
${difficultyAdjustments[difficulty]}

${conversationAnalysis ? `
User Analysis:
- Spiritual Maturity: ${conversationAnalysis.spiritualMaturity}
- Emotional State: ${conversationAnalysis.emotionalState}
- Understanding Level: ${conversationAnalysis.understandingLevel}
` : ''}

Enhanced Response Guidelines:
- Speak in the voice of the biblical character when appropriate
- Reference the key verse and story context naturally
- Ask probing questions that encourage reflection
- Provide practical spiritual guidance
- Include relevant scripture when helpful
- Show empathy and understanding
- Adapt responses based on user's spiritual maturity and emotional state
- Use ${language} language with spiritual reverence

Advanced Conversation Flow:
1. Acknowledge user's concern/question with empathy
2. Connect to the biblical context and character's experience
3. Provide spiritual insight tailored to their maturity level
4. Ask a reflective question that challenges their thinking
5. Encourage next step with personalized motivation
6. Include relevant scripture or wisdom

Success Criteria:
Only mark isSuccess: true when the user demonstrates:
- Genuine understanding of how ${level.virtue} overcomes ${level.sin}
- Personal application of the biblical principle
- Spiritual growth or transformation in their thinking
- Readiness to apply the lesson in their life`;

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
    console.error("AI Response Error:", error);
    return { 
      text: `The path of ${level.virtue} requires patience. Take a moment to breathe and consider how ${level.bibleContext.character} might have faced this challenge. Remember: "${level.bibleContext.keyVerse}"`, 
      isSuccess: false 
    };
  }
};

export const getIntroMessage = async (level: LevelConfig, language: LanguageCode): Promise<string> => {
  const introSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      intro: { type: Type.STRING, description: "A compelling, immersive introduction to the spiritual journey" }
    },
    required: ["intro"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate an immersive introduction for a spiritual journey level.
Level: ${level.name}
Biblical Story: ${level.bibleContext.storyTitle} (${level.bibleContext.reference})
Character: ${level.bibleContext.character}
Challenge: Overcoming ${level.sin} through ${level.virtue}
Setting: ${level.description}
Key Verse: "${level.bibleContext.keyVerse}"
Language: ${language}

Create a first-person, immersive introduction that puts the user in the biblical scene. Make it personal and engaging (2-3 sentences).`,
      config: {
        systemInstruction: "You are a spiritual guide setting the scene for a pilgrim's journey. Create immersive, biblical introductions.",
        responseMimeType: "application/json",
        responseSchema: introSchema,
      }
    });
    const result = JSON.parse(response.text || "{}");
    return result.intro || level.bibleContext.narrativeIntro;
  } catch (error) {
    console.error("Intro generation failed:", error);
    return level.bibleContext.narrativeIntro;
  }
};

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
      model: 'gemini-3-flash-preview',
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

const hintSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    hint: { type: Type.STRING, description: "A gentle, spiritual hint that guides without giving away the answer" },
    reflection: { type: Type.STRING, description: "A reflective question to help the user think deeper" },
    encouragement: { type: Type.STRING, description: "An encouraging word for the pilgrim" }
  },
  required: ["hint", "reflection", "encouragement"]
};

export const generateSpiritualHint = async (
  level: LevelConfig, 
  userMessage: string, 
  language: LanguageCode = 'en'
) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The pilgrim is struggling with: "${userMessage}"
Level: ${level.name} - overcoming ${level.sin} through ${level.virtue}
Biblical Context: ${level.bibleContext.storyTitle} with ${level.bibleContext.character}
Key Verse: "${level.bibleContext.keyVerse}"
Language: ${language}

Generate a gentle spiritual hint that helps the pilgrim reflect without giving direct answers.`,
      config: {
        systemInstruction: "You are a wise spiritual guide. Provide hints that encourage reflection and spiritual growth. Be gentle, encouraging, and biblical.",
        responseMimeType: "application/json",
        responseSchema: hintSchema
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Hint generation failed", e);
    return {
      hint: "Consider how the biblical character faced similar challenges.",
      reflection: "What might God be teaching you in this moment?",
      encouragement: "The journey of faith is taken one step at a time."
    };
  }
};

const moralChoiceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    situation: { type: Type.STRING, description: "A moral dilemma related to the level's theme" },
    choices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-4 choices the pilgrim can make"
    },
    wisdom: { type: Type.STRING, description: "Biblical wisdom about the choice" }
  },
  required: ["situation", "choices", "wisdom"]
};

export const generateMoralChoice = async (
  level: LevelConfig,
  language: LanguageCode = 'en'
) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a moral choice scenario for spiritual growth.
Level Theme: ${level.virtue} vs ${level.sin}
Biblical Context: ${level.bibleContext.storyTitle}
Character: ${level.bibleContext.character}
Language: ${language}

Create a realistic moral dilemma that tests the pilgrim's understanding of ${level.virtue}.`,
      config: {
        systemInstruction: "You are a spiritual teacher creating meaningful moral choices. Make scenarios realistic and biblically grounded.",
        responseMimeType: "application/json",
        responseSchema: moralChoiceSchema
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Moral choice generation failed", e);
    return null;
  }
};

const conversationAnalysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    spiritualMaturity: { type: Type.STRING, description: "Assessment of user's spiritual maturity level" },
    emotionalState: { type: Type.STRING, description: "User's current emotional state" },
    understandingLevel: { type: Type.STRING, description: "How well user grasps the spiritual concept" },
    nextStep: { type: Type.STRING, description: "Suggested next step in the spiritual journey" },
    encouragement: { type: Type.STRING, description: "Personalized encouragement" }
  },
  required: ["spiritualMaturity", "emotionalState", "understandingLevel", "nextStep", "encouragement"]
};

export const analyzeConversation = async (
  messages: string[],
  level: LevelConfig,
  language: LanguageCode = 'en'
) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this spiritual conversation:
Conversation History: ${messages.join('\n')}
Level: ${level.name} - ${level.virtue} vs ${level.sin}
Biblical Context: ${level.bibleContext.storyTitle}
Language: ${language}

Assess the pilgrim's spiritual journey and provide personalized guidance.`,
      config: {
        systemInstruction: "You are a wise spiritual mentor. Analyze conversations with deep spiritual insight and compassion. Provide thoughtful, personalized assessments.",
        responseMimeType: "application/json",
        responseSchema: conversationAnalysisSchema
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Conversation analysis failed", e);
    return null;
  }
};

const adaptiveGuidanceSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    response: { type: Type.STRING, description: "Personalized spiritual response" },
    approach: { type: Type.STRING, description: "Teaching approach to use" },
    scriptureSuggestion: { type: Type.STRING, description: "Relevant scripture suggestion" },
    prayerFocus: { type: Type.STRING, description: "Suggested prayer focus" }
  },
  required: ["response", "approach", "scriptureSuggestion", "prayerFocus"]
};

export const generateAdaptiveGuidance = async (
  level: LevelConfig,
  userMessage: string,
  conversationAnalysis: any,
  language: LanguageCode = 'en'
) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate adaptive spiritual guidance:
User Message: "${userMessage}"
Level: ${level.name} - ${level.virtue} vs ${level.sin}
User Analysis: ${JSON.stringify(conversationAnalysis)}
Biblical Context: ${level.bibleContext.storyTitle}
Language: ${language}

Create personalized guidance that adapts to the user's spiritual maturity and emotional state.`,
      config: {
        systemInstruction: "You are an adaptive spiritual guide. Tailor your responses to each pilgrim's unique spiritual journey and current needs.",
        responseMimeType: "application/json",
        responseSchema: adaptiveGuidanceSchema
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Adaptive guidance failed", e);
    return null;
  }
};
