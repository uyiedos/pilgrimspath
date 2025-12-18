import React, { useState, useEffect } from 'react';
import Button from './Button';
import SocialActionBar from './SocialActionBar';
import { generateDailyDevotional } from '../services/geminiService';
import { LanguageCode } from '../translations';

interface DevotionalViewProps {
  onBack: () => void;
  onSocialAction?: (action: 'like' | 'pray' | 'comment' | 'share') => void;
  language?: LanguageCode;
}

const DevotionalView: React.FC<DevotionalViewProps> = ({ onBack, onSocialAction, language = 'en' }) => {
  const [devotional, setDevotional] = useState<{
    title: string;
    scripture: string;
    content: string;
    prayer: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkedAsRead, setIsMarkedAsRead] = useState(false);

  useEffect(() => {
    const loadDevotional = async () => {
      try {
        setIsLoading(true);
        const today = new Date().toDateString();
        const storedDevotional = localStorage.getItem(`daily_devotional_${today}`);
        
        if (storedDevotional) {
          setDevotional(JSON.parse(storedDevotional));
        } else {
          const newDevotional = await generateDailyDevotional(language);
          setDevotional(newDevotional);
          localStorage.setItem(`daily_devotional_${today}`, JSON.stringify(newDevotional));
        }
      } catch (error) {
        console.error('Error loading devotional:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDevotional();
  }, [language]);

  const handleMarkAsRead = () => {
    setIsMarkedAsRead(true);
    // Could add points or achievement tracking here
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-stone-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Preparing today's devotional...</p>
        </div>
      </div>
    );
  }

  if (!devotional) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-600">Unable to load today's devotional.</p>
          <Button onClick={onBack} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col relative">
       {/* Hero Image */}
       <div className="h-64 md:h-80 w-full relative overflow-hidden">
          <img 
            src="https://image.pollinations.ai/prompt/majestic%20sunrise%20over%20mountains%20digital%20painting%20christian%20peaceful?width=1200&height=600&nologo=true" 
            alt="Sunrise"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-100 via-transparent to-black/30"></div>
          
          <div className="absolute top-20 left-4 z-10">
            <Button onClick={onBack} className="bg-white/20 hover:bg-white/30 backdrop-blur border-white/50 text-white">
               ← Home
            </Button>
          </div>
          
          <div className="absolute bottom-6 left-6 md:left-12">
             <div className="bg-yellow-500 text-yellow-900 font-bold px-3 py-1 text-xs tracking-wider uppercase inline-block mb-2 rounded-sm">
               Daily Devotional
             </div>
             <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 drop-shadow-sm">
               {devotional.title}
             </h1>
          </div>
       </div>

       {/* Content */}
       <div className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-12 -mt-10 relative z-10">
          <div className="bg-white p-8 md:p-12 rounded-lg shadow-xl border-t-4 border-yellow-500 mb-8">
             
             <div className="flex items-center gap-4 mb-8 border-b border-stone-200 pb-6">
                <div className="w-12 h-12 bg-stone-200 rounded-full flex items-center justify-center text-2xl">
                   ☀️
                </div>
                <div>
                   <p className="text-stone-500 text-sm font-serif italic">Today's Reading</p>
                   <p className="text-stone-900 font-bold">{devotional.scripture}</p>
                </div>
             </div>

             <blockquote className="text-xl md:text-2xl font-serif text-stone-800 leading-relaxed border-l-4 border-yellow-500 pl-6 mb-8 bg-stone-50 py-4 pr-4 rounded-r">
               "Finally, be strong in the Lord and in his mighty power. Put on the full armor of God, so that you can take your stand against the devil’s schemes."
             </blockquote>

             <div className="prose prose-stone prose-lg">
               {devotional.content.split('\n\n').map((paragraph, index) => (
                 <p key={index}>{paragraph}</p>
               ))}
             </div>

             <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-100">
                <h3 className="text-blue-900 font-bold mb-2 uppercase tracking-wide text-sm">Prayer for Today</h3>
                <p className="text-blue-800 font-serif italic">
                  "{devotional.prayer}"
                </p>
             </div>
             
             <div className="mt-8 text-center">
               <Button className="w-full md:w-auto">Mark as Read</Button>
             </div>
          </div>
          
          {/* Social Engagement */}
          {onSocialAction && (
             <SocialActionBar 
                onInteract={onSocialAction} 
                entityName="Daily Devotional" 
             />
          )}
       </div>
    </div>
  );
};

export default DevotionalView;