
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { Schema, Type } from "@google/genai";
import { getGeminiClient } from '../services/geminiService';

interface Devotional {
    title: string;
    scripture: string;
    content: string;
    prayer: string;
    image_prompt: string;
}

interface DevotionalViewProps {
  onBack: () => void;
  onAddPoints?: (amount: number) => void;
  onUnlockAchievement?: (id: string) => void;
  userId?: string;
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

const DevotionalView: React.FC<DevotionalViewProps> = ({ onBack, onAddPoints, onUnlockAchievement, userId }) => {
  const [devotional, setDevotional] = useState<Devotional | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRead, setIsRead] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  
  const todayStr = new Date().toLocaleDateString();

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      try {
        const dbDate = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('daily_devotionals')
          .select('*')
          .eq('day', dbDate)
          .maybeSingle();

        if (existing) {
          setDevotional(existing);
        } else {
          // Generate new one
          const themes = ["Hope", "Perseverance", "Faith", "Love", "Discipline", "Wisdom", "Grace", "Strength"];
          const theme = themes[Math.floor(Math.random() * themes.length)];
          
          let generated: Devotional | null = null;
          try {
            const ai = getGeminiClient();
            const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [{ parts: [{ text: `Generate a daily devotional. Theme: ${theme}. Ensure the scripture is central.` }] }],
              config: {
                systemInstruction: "You are a wise theologian. Create meaningful, biblically-grounded spiritual content.",
                responseMimeType: "application/json",
                responseSchema: devotionalSchema,
              }
            });
            generated = JSON.parse(response.text || "{}");
          } catch(e) {
             console.error("GenAI Error", e);
          }

          if (generated) {
            const { data: saved, error } = await supabase
              .from('daily_devotionals')
              .insert({
                day: dbDate,
                title: generated.title,
                scripture: generated.scripture,
                content: generated.content,
                prayer: generated.prayer,
                image_prompt: generated.image_prompt
              })
              .select()
              .single();
            
            setDevotional(error ? generated : saved);
          }
        }

        if (userId && !userId.startsWith('offline-')) {
          const { data: completion } = await supabase
            .from('user_devotional_completions')
            .select('*')
            .eq('user_id', userId)
            .eq('day', dbDate)
            .maybeSingle();
          if (completion) setIsRead(true);
        }
      } catch (e) {
        console.error("Spiritual drought detected:", e);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [userId]);

  const handleMarkRead = async () => {
    if (isRead || !devotional || isMarking) return;
    setIsMarking(true);

    try {
      const dbDate = new Date().toISOString().split('T')[0];
      if (userId && !userId.startsWith('offline-')) {
        await supabase.from('user_devotional_completions').insert({
          user_id: userId,
          day: dbDate
        });
      }
      
      setIsRead(true);
      if (onAddPoints) onAddPoints(50); 
      if (onUnlockAchievement) onUnlockAchievement('devoted');
      
      AudioSystem.playLevelComplete();
    } catch (e) {
      console.error("Failed to record discipline", e);
    } finally {
      setIsMarking(false);
    }
  };

  const handleShare = async () => {
      if (!devotional) return;
      AudioSystem.playVoxelTap();
      
      const excerpt = devotional.content.length > 150 
        ? devotional.content.substring(0, 150) + "..." 
        : devotional.content;
        
      const shareUrl = window.location.origin;
      const shareTitle = `Daily Bread: ${devotional.title}`;
      const shareText = `🍞 ${devotional.title}\n\n"${devotional.scripture}"\n\n${excerpt}\n\nRead more on The Journey App:`;

      let shared = false;

      if (navigator.share) {
          try {
              await navigator.share({
                  title: shareTitle,
                  text: shareText,
                  url: shareUrl
              });
              shared = true;
          } catch (e) { console.log('Share cancelled'); }
      } 
      
      if (!shared) {
          try {
              await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
              alert("Daily Bread excerpt copied to clipboard! Share it with a friend.");
              shared = true;
          } catch (e) {
              alert("Failed to copy.");
          }
      }

      if (shared && userId) {
          const storageKey = `journey_last_share_devotional_${userId}`;
          const lastShare = localStorage.getItem(storageKey);
          
          if (lastShare !== todayStr) {
              if (onAddPoints) onAddPoints(50);
              if (onUnlockAchievement) onUnlockAchievement('evangelist');
              
              if (!userId.startsWith('offline-')) {
                  supabase.from('activity_feed').insert({
                      user_id: userId,
                      activity_type: 'share',
                      details: { 
                          target: 'devotional', 
                          title: devotional.title,
                          reward: 50 
                      }
                  }).then(() => console.log("Share logged"));
              }

              localStorage.setItem(storageKey, todayStr);
              AudioSystem.playAchievement();
              setTimeout(() => alert("Evangelist Bonus: +50 XP Awarded for sharing the Word!"), 500);
          } else {
              alert("You have already claimed your daily share reward. Keep spreading the word!");
          }
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-8">
        <div className="text-5xl animate-bounce mb-6">🍞</div>
        <p className="font-retro text-stone-500 text-[10px] animate-pulse uppercase tracking-[0.3em]">Scribing Daily Bread...</p>
      </div>
    );
  }

  const imageUrl = `https://image.pollinations.ai/prompt/pixel%20art%20holy%20landscape%20${encodeURIComponent(devotional?.image_prompt || 'bible scenery')}?width=1200&height=600&nologo=true`;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col relative animate-fade-in custom-scroll">
       <div className="h-64 md:h-96 w-full relative overflow-hidden shrink-0">
          <img src={imageUrl} alt="Meditation" className="w-full h-full object-cover grayscale-[20%] sepia-[10%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-100 via-black/10 to-transparent"></div>
          
          <div className="absolute top-20 left-4">
            <Button onClick={onBack} variant="secondary" className="bg-white/20 backdrop-blur-md text-white border-white/40 px-4 py-2 text-xs">← Home</Button>
          </div>

          <div className="absolute bottom-8 left-6 md:left-12 max-w-2xl">
             <div className="bg-yellow-600 text-white font-retro text-[9px] px-3 py-1.5 rounded-lg inline-block mb-3 shadow-xl border border-yellow-400 uppercase">
                Daily Bread • {todayStr}
             </div>
             <h1 className="text-4xl md:text-6xl font-serif font-bold text-stone-900 drop-shadow-md leading-tight">{devotional?.title}</h1>
          </div>
       </div>

       <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-12 -mt-10 relative z-10">
          <div className="bg-white p-8 md:p-16 rounded-2xl shadow-2xl border-t-8 border-yellow-500 mb-12 pixel-shadow relative">
             
             <button 
                onClick={handleShare}
                className="absolute top-6 right-6 flex items-center gap-2 text-[10px] font-retro uppercase text-stone-400 hover:text-yellow-600 transition-colors border border-stone-200 hover:border-yellow-500 px-3 py-1.5 rounded-full"
             >
                ↗️ Share Word (+50 XP)
             </button>

             <div className="flex items-start gap-4 mb-12 text-stone-800 bg-stone-50 p-6 rounded-xl border border-stone-200 mt-6 md:mt-0">
                <span className="text-4xl text-yellow-600">📜</span>
                <p className="text-stone-900 font-bold text-xl md:text-3xl font-serif italic leading-snug">
                   "{devotional?.scripture}"
                </p>
             </div>
             
             <div className="prose prose-stone prose-lg max-w-none mb-12">
                {devotional?.content.split('\n').map((p, i) => (
                  <p key={i} className="text-stone-800 leading-relaxed font-serif text-lg md:text-xl mb-6 first-letter:text-5xl first-letter:font-bold first-letter:text-yellow-600 first-letter:float-left first-letter:mr-2">
                    {p}
                  </p>
                ))}
             </div>

             <div className="mt-12 p-8 bg-blue-50 rounded-2xl border-2 border-blue-100 text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">🙏</div>
                <h3 className="text-blue-900 font-retro text-[10px] mb-4 uppercase tracking-[0.2em] font-bold">Prayer Focus</h3>
                <p className="text-blue-800 font-serif italic text-xl md:text-2xl leading-relaxed">"{devotional?.prayer}"</p>
             </div>

             <div className="mt-12 pt-8 border-t border-stone-100 flex flex-col items-center gap-4">
                <Button 
                   onClick={handleMarkRead} 
                   disabled={isRead || isMarking}
                   className={`w-full md:w-auto py-5 px-16 text-xl transform transition-all active:scale-95 ${isRead ? 'bg-green-600 opacity-80 cursor-default grayscale-[40%]' : 'bg-stone-900 hover:bg-stone-800'}`}
                >
                   {isMarking ? 'Communing...' : isRead ? '✓ Fed for Today' : 'Mark as Read (+50 XP)'}
                </Button>
                {!isRead && <p className="text-stone-400 text-[10px] font-mono uppercase tracking-widest animate-pulse">Touch to complete your daily discipline</p>}
             </div>
          </div>
       </div>
    </div>
  );
};

export default DevotionalView;
