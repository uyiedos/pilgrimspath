
import React, { useState, useEffect } from 'react';
import { LanguageCode } from '../translations';
import { getGeminiClient } from '../services/geminiService';

interface Props {
  text: string;
  language: LanguageCode;
  className?: string;
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'div';
}

const TranslatedText: React.FC<Props> = ({ text, language, className = '', as: Component = 'span' }) => {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    let isMounted = true;
    
    // Reset to original when text prop changes
    setDisplay(text);

    if (language === 'en' || !text) {
      return;
    }

    const fetchTranslation = async () => {
      try {
        // Use centralized client to ensure API Key check from env.local
        const ai = getGeminiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [{ text: `Translate the following text to ${language}. Keep the tone spiritual and reverent: "${text}"` }] }],
        });
        const translated = response.text || text;
        if (isMounted) {
          setDisplay(translated);
        }
      } catch (error) {
        console.error("Translation failed", error);
      }
    };

    fetchTranslation();

    return () => { isMounted = false; };
  }, [text, language]);

  return <Component className={className}>{display}</Component>;
};

export default TranslatedText;
