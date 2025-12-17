import React, { useState, useEffect } from 'react';
import { LanguageCode } from '../translations';
import { translateText } from '../services/geminiService';

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
      const translated = await translateText(text, language);
      if (isMounted) {
        setDisplay(translated);
      }
    };

    fetchTranslation();

    return () => { isMounted = false; };
  }, [text, language]);

  return <Component className={className}>{display}</Component>;
};

export default TranslatedText;