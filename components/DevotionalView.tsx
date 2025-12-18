import React, { useState, useEffect } from 'react';
import Button from './Button';
import { generateDailyDevotional } from '../services/geminiService';
import { LanguageCode } from '../translations';

interface DevotionalViewProps {
  onBack: () => void;
  language?: LanguageCode;
}

const DevotionalView: React.FC<DevotionalViewProps> = ({ onBack, language = 'en' }) => {
  const [devotional, setDevotional] = useState<{
    title: string;
    scripture: string;
    content: string;
    prayer: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkedAsRead, setIsMarkedAsRead] = useState(false);
  const [timeUntilNextDevotion, setTimeUntilNextDevotion] = useState<string>('');

  // Check if devotional was marked as read today and calculate countdown
  useEffect(() => {
    const checkReadStatus = () => {
      const today = new Date().toDateString();
      const lastReadDate = localStorage.getItem('devotional_last_read_date');
      const lastReadTime = localStorage.getItem('devotional_last_read_time');
      
      if (lastReadDate === today) {
        setIsMarkedAsRead(true);
        if (lastReadTime) {
          const nextDevotionTime = new Date(parseInt(lastReadTime));
          nextDevotionTime.setDate(nextDevotionTime.getDate() + 1);
          nextDevotionTime.setHours(0, 0, 0, 0);
          
          const updateCountdown = () => {
            const now = new Date();
            const timeDiff = nextDevotionTime.getTime() - now.getTime();
            
            if (timeDiff > 0) {
              const hours = Math.floor(timeDiff / (1000 * 60 * 60));
              const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
              setTimeUntilNextDevotion(`${hours}h ${minutes}m ${seconds}s`);
            } else {
              setTimeUntilNextDevotion('Available now!');
              setIsMarkedAsRead(false);
            }
          };
          
          updateCountdown();
          const interval = setInterval(updateCountdown, 1000);
          return () => clearInterval(interval);
        }
      } else {
        setIsMarkedAsRead(false);
        setTimeUntilNextDevotion('');
      }
    };
    
    checkReadStatus();
  }, []);

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
    const now = new Date();
    const today = now.toDateString();
    
    // Store the read date and timestamp
    localStorage.setItem('devotional_last_read_date', today);
    localStorage.setItem('devotional_last_read_time', now.getTime().toString());
    
    setIsMarkedAsRead(true);
    
    // Calculate next devotion time and start countdown
    const nextDevotionTime = new Date(now.getTime());
    nextDevotionTime.setDate(nextDevotionTime.getDate() + 1);
    nextDevotionTime.setHours(0, 0, 0, 0);
    
    const updateCountdown = () => {
      const currentTime = new Date();
      const timeDiff = nextDevotionTime.getTime() - currentTime.getTime();
      
      if (timeDiff > 0) {
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
        setTimeUntilNextDevotion(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeUntilNextDevotion('Available now!');
        setIsMarkedAsRead(false);
      }
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  };

  const handleShareDevotional = async () => {
    if (!devotional) return;
    
    const shareText = `Today's Devotional: "${devotional.title}"\n\nScripture: ${devotional.scripture}\n\n${devotional.content.substring(0, 200)}...\n\nRead more on The Journey App!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: devotional.title,
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Devotional copied to clipboard!');
      } catch (err) {
        alert('Share failed. Please copy manually.');
      }
    }
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
             
             <div className="mt-8 text-center space-y-4">
              <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                <Button 
                  onClick={handleMarkAsRead}
                  disabled={isMarkedAsRead}
                  className={`w-full md:w-auto ${isMarkedAsRead ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}
                >
                  {isMarkedAsRead ? 'Already Read Today' : 'Mark as Read'}
                </Button>
                
                <Button 
                  onClick={handleShareDevotional}
                  className="w-full md:w-auto bg-blue-600 hover:bg-blue-500"
                >
                  Share Devotional
                </Button>
              </div>
              
              {isMarkedAsRead && timeUntilNextDevotion && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-semibold">Next devotional available in:</span> {timeUntilNextDevotion}
                  </p>
                </div>
              )}
            </div>
          </div>
       </div>
    </div>
  );
};

export default DevotionalView;