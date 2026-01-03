
import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import { User } from '../types';
import { LanguageCode } from '../translations';
import { AudioSystem } from '../utils/audio';
import { generatePrayerResponse } from '../services/geminiService';

interface PrayerRoomViewProps {
  user: User | null;
  onBack: () => void;
  language: LanguageCode;
  onAddPoints: (amount: number) => void;
  onUnlockAchievement: (id: string) => void;
  spendPoints?: (amount: number, type?: string) => Promise<boolean>;
}

const PRAYER_HINTS = [
  "🙏 'Pray for peace in my heart'",
  "📖 'Read Psalm 23 to me'",
  "🛡️ 'Help me find strength'",
  "🕊️ 'Guide me through forgiveness'",
  "✨ 'Explain the Beatitudes'"
];

const PrayerRoomView: React.FC<PrayerRoomViewProps> = ({ user, onBack, language, spendPoints, onAddPoints, onUnlockAchievement }) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Sanctuary Entrance');
  const [transcription, setTranscription] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const handleMakeOffering = async () => {
      if (!user) return alert("Sign in to enter.");
      setIsProcessing(true);
      const success = spendPoints ? await spendPoints(10, 'prayer_offering') : true;
      if (success) {
          setHasAccess(true);
          setStatus('Offering Accepted');
          AudioSystem.playAchievement();
      } else {
          alert("Insufficient XP.");
      }
      setIsProcessing(false);
  };

  const handleConnect = async () => {
      if (isActive) return;
      
      // Check browser support
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
          alert("Your browser does not support Voice Recognition. Please use Chrome or Safari.");
          return;
      }

      setIsProcessing(true);
      setStatus('Communing...');

      try {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = false; // Stop after one sentence
          recognitionRef.current.interimResults = false;
          recognitionRef.current.lang = language === 'en' ? 'en-US' : language;

          recognitionRef.current.onstart = () => {
              setIsListening(true);
              setStatus('Listening...');
          };

          recognitionRef.current.onend = () => {
              setIsListening(false);
              // Don't auto-restart, let user speak when ready or after AI response
          };

          recognitionRef.current.onresult = async (event: any) => {
              const transcript = event.results[0][0].transcript;
              setTranscription(prev => [...prev.slice(-2), `You: ${transcript}`]);
              
              // Send to AI
              await processInput(transcript);
          };

          setIsActive(true);
          setIsProcessing(false);
          setStatus('Presence Felt');
          
          // Reward
          if(onUnlockAchievement) onUnlockAchievement('prayer_intercessor');
          if(onAddPoints) onAddPoints(50);

          startListening();

      } catch (err) {
          console.error(err);
          cleanup();
      }
  };

  const startListening = () => {
      if (recognitionRef.current && !isListening) {
          try {
              recognitionRef.current.start();
          } catch(e) { console.log("Recog already started"); }
      }
  };

  const processInput = async (text: string) => {
      setStatus('Interceding...');
      
      // Use the new dedicated Groq-powered function
      const responseText = await generatePrayerResponse(text, language);
      
      setTranscription(prev => [...prev.slice(-2), `Guide: ${responseText}`]);
      setStatus('Speaking...');
      
      const utterance = new SpeechSynthesisUtterance(responseText);
      utterance.lang = language === 'en' ? 'en-US' : language;
      // Slight slow down for gravitas
      utterance.rate = 0.9; 
      utterance.pitch = 1.0;

      utterance.onend = () => {
          setStatus('Listening...');
          startListening(); // Resume listening after speaking
      };
      
      synthRef.current.speak(utterance);
  };

  const cleanup = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
    }
    if (synthRef.current) {
        synthRef.current.cancel();
    }
    
    setIsActive(false);
    setStatus('Severed');
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 overflow-hidden">
      <header className="w-full max-w-4xl flex justify-between p-6 bg-white/5 rounded-[2rem] border border-white/10 mb-8">
           <div>
              <h1 className="text-xl md:text-3xl font-retro text-white uppercase">Prayer Sanctuary</h1>
              <p className="text-cyan-400 text-[10px] uppercase font-mono">{status}</p>
           </div>
           <Button onClick={() => { cleanup(); onBack(); }} variant="secondary">Exit</Button>
      </header>

      <div className="relative flex flex-col items-center">
           {/* Visualizer Circle */}
           <div className={`w-64 h-64 md:w-80 md:h-80 rounded-[5rem] border-4 transition-all flex items-center justify-center mb-8 ${isActive ? 'border-cyan-500 shadow-[0_0_50px_rgba(6,182,212,0.3)]' : 'border-white/10'}`}>
              {isActive ? (
                  <div className="flex gap-2">
                     {isListening ? (
                         Array.from({length: 5}).map((_, i) => <div key={i} className="w-2 h-12 bg-cyan-400 animate-pulse" style={{animationDelay: `${i * 0.1}s`}} />)
                     ) : (
                         <div className="text-cyan-200 text-4xl animate-pulse">🕊️</div>
                     )}
                  </div>
              ) : hasAccess ? (
                  <div onClick={handleConnect} className="cursor-pointer text-center group">
                     <div className="text-8xl mb-4 group-hover:scale-110 transition-transform">🕯️</div>
                     <p className="font-retro text-[8px] text-white">IGNITE CONNECTION</p>
                  </div>
              ) : (
                  <div onClick={handleMakeOffering} className="cursor-pointer text-center group">
                     <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">🪙</div>
                     <p className="font-retro text-[8px] text-yellow-500">OFFER 10 XP</p>
                  </div>
              )}
           </div>

           {/* PRAYER HINTS */}
           {!isActive && (
               <div className="max-w-md w-full flex flex-wrap justify-center gap-2 mb-8 animate-fade-in px-4">
                   {PRAYER_HINTS.map((hint, idx) => (
                       <span 
                         key={idx} 
                         className="text-[10px] text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5 hover:bg-white/10 hover:text-cyan-300 transition-colors cursor-default"
                       >
                           {hint}
                       </span>
                   ))}
               </div>
           )}
      </div>

      {/* Transcription Log */}
      <div className="max-w-2xl w-full text-center p-8 bg-white/5 rounded-[3rem] min-h-[150px] border border-white/5 flex flex-col justify-end">
           {transcription.map((line, i) => (
               <p key={i} className={`font-serif italic text-lg leading-relaxed ${line.startsWith('You') ? 'text-gray-400 text-sm' : 'text-white'}`}>
                   {line}
               </p>
           ))}
      </div>

      {isActive && <button onClick={cleanup} className="mt-8 bg-red-600/80 hover:bg-red-600 p-6 rounded-full text-4xl shadow-lg transition-transform active:scale-95">🛑</button>}
    </div>
  );
};

export default PrayerRoomView;
