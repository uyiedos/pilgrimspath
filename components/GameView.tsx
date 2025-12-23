
import React, { useState, useEffect, useRef } from 'react';
import { LevelConfig, Message, MessageRole, DifficultyMode } from '../types';
import VoxelScene from './VoxelScene';
import Button from './Button';
import { generateGuideResponse, getIntroMessage, generateSpiritualHint } from '../services/geminiService';
import { LanguageCode, UI_TEXT } from '../translations';
import { AudioSystem } from '../utils/audio';
import TranslatedText from './TranslatedText';

interface GameViewProps {
  level: LevelConfig;
  onBack: () => void;
  onHome: () => void;
  onComplete: (verse: string) => void;
  language: LanguageCode;
  difficulty: DifficultyMode;
  onUnlockVerse?: (verse: string) => void;
}

const GameView: React.FC<GameViewProps> = ({ level, onBack, onHome, onComplete, language, difficulty, onUnlockVerse }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [hint, setHint] = useState<any>(null);
  const [conversationStuck, setConversationStuck] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[language][key] || UI_TEXT['en'][key];
  };

  useEffect(() => {
    // Initial load
    const loadIntro = async () => {
      setIsLoading(true);
      const introText = await getIntroMessage(level, language);
      setMessages([
        { id: 'init', role: MessageRole.GUIDE, text: introText }
      ]);
      setIsLoading(false);
      // Ensure audio context is ready
      AudioSystem.init();
    };
    loadIntro();
    setIsLevelComplete(false);
    setIsContextExpanded(true); // Auto-expand on new level
  }, [level, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect if conversation is stuck (too many messages without success)
  useEffect(() => {
    if (messages.length >= 8 && !isLevelComplete) {
      const recentMessages = messages.slice(-4);
      const hasProgress = recentMessages.some(msg => msg.role === MessageRole.GUIDE && msg.text.includes('understand') || msg.text.includes('growth'));
      if (!hasProgress) {
        setConversationStuck(true);
      }
    }
  }, [messages, isLevelComplete]);

  const handleGetHint = async () => {
    if (!input.trim()) return;
    
    AudioSystem.playVoxelTap();
    const hintData = await generateSpiritualHint(level, input, language);
    setHint(hintData);
    setShowHint(true);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Play subtle tap sound for user interaction
    AudioSystem.playVoxelTap();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const historyText = messages.map(m => `${m.role}: ${m.text}`);
    const response = await generateGuideResponse(level, userMsg.text, historyText, language, difficulty);

    const guideMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: MessageRole.GUIDE,
      text: response.text,
      isScripture: !!response.scriptureRef
    };

    setMessages(prev => [...prev, guideMsg]);
    setIsLoading(false);
    
    // Play message sound for response
    AudioSystem.playMessage();

    if (response.isSuccess) {
        setIsLevelComplete(true);
        // Play victory sound
        AudioSystem.playLevelComplete();
        // Ensure context is open to show the revealed verse
        setIsContextExpanded(true);
        
        // Unlock the bible verse
        const verseToUnlock = level.bibleContext.keyVerse;
        if (onUnlockVerse) {
          onUnlockVerse(verseToUnlock);
        }
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-7xl mx-auto md:border-x-4 border-gray-800 bg-gray-900 shadow-2xl relative">
      
      {/* Level Completion Overlay */}
      {isLevelComplete && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center justify-center animate-fade-in p-4 max-w-lg w-full">
           <div className="text-center p-4 md:p-6 bg-gray-900 border-4 border-yellow-500 rounded-xl shadow-[0_0_50px_rgba(234,179,8,0.3)] w-full transform animate-slide-up">
              <div className="text-4xl md:text-6xl mb-4 animate-bounce">✨</div>
              <h2 className="text-2xl md:text-4xl font-retro text-yellow-400 mb-2 text-shadow-md">{t('level_cleared')}</h2>
              <p className="text-gray-300 font-serif italic mb-6 text-sm md:text-base">
                 <TranslatedText text={level.bibleContext.keyVerse} language={language} />
              </p>
              
              <div className="flex justify-center gap-8 mb-8 text-sm font-mono text-gray-400">
                <div className="flex flex-col items-center">
                  <span className="text-green-400 font-bold text-xl">
                      {/* Dynamic Display for UI feedback (Note: Real calculation handled in App.tsx) */}
                      +{Math.floor( (100 + (level.id * 25)) * (difficulty === 'hard' ? 1.5 : difficulty === 'easy' ? 0.8 : 1) )}
                  </span>
                  <span>{t('xp_gained')}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-blue-400 font-bold text-xl">1</span>
                  <span>Verse</span>
                </div>
              </div>

              <div className="bg-gray-800 p-2 rounded mb-4 text-xs font-mono text-yellow-600">
                  DIFFICULTY BONUS: {difficulty.toUpperCase()}
              </div>

              <Button onClick={() => onComplete(level.bibleContext.keyVerse)} className="w-full text-base md:text-lg py-3 md:py-4 bg-green-700 hover:bg-green-600 border-green-900">
                 {t('ascend')}
              </Button>
           </div>
        </div>
      )}

      {/* Background Ambience Layer */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <img src={level.images.landscape} alt="" className="w-full h-full object-cover blur-sm" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-2 md:p-4 bg-gray-800/90 backdrop-blur border-b-4 border-black shrink-0">
        <div className="flex gap-2">
            <Button variant="secondary" onClick={onHome} className="text-[10px] md:text-xs py-2 px-2 md:px-3">🏠 {t('home')}</Button>
            <Button variant="secondary" onClick={onBack} className="text-[10px] md:text-xs py-2 px-2 md:px-3">🗺️ {t('map')}</Button>
        </div>
        <div className="text-center flex-1 mx-2">
            <h1 className="text-white font-retro text-[10px] md:text-xl text-yellow-500 tracking-wider shadow-black drop-shadow-md truncate">
              <TranslatedText text={level.name} language={language} />
            </h1>
            <div className="text-gray-300 text-[9px] md:text-xs uppercase tracking-widest mt-1 hidden md:block">
              <TranslatedText text={level.bibleContext.storyTitle} language={language} />
            </div>
        </div>
        <div className="w-16 md:w-24">
             {/* Difficulty Indicator */}
             <div className="text-[9px] text-gray-500 text-right font-mono uppercase border border-gray-700 rounded px-1">
                 MODE: <span className={difficulty === 'hard' ? 'text-red-500' : difficulty === 'easy' ? 'text-green-500' : 'text-yellow-500'}>{difficulty}</span>
             </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-900/80 min-h-0">
        
        {/* Left Panel: Visuals & Context - Collapsible on Mobile or Stacked */}
        <div className="w-full md:w-[400px] lg:w-[450px] bg-gray-850/90 p-2 md:p-4 border-b-4 md:border-b-0 md:border-r-4 border-black overflow-y-auto custom-scroll max-h-[40vh] md:max-h-full shrink-0 md:shrink">
           
           {/* Visual Scene Card */}
           <div className="relative rounded-lg border-2 md:border-4 border-gray-700 bg-black overflow-hidden mb-4 md:mb-6 pixel-shadow">
              <img src={level.images.landscape} className="w-full h-32 md:h-48 object-cover opacity-90" alt="Landscape" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              
              <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 flex items-end gap-2 md:gap-3">
                 <div className="w-12 h-12 md:w-20 md:h-20 rounded border-2 border-yellow-600 bg-black overflow-hidden shadow-lg">
                    <img src={level.images.character} className="w-full h-full object-cover" alt="Character" />
                 </div>
                 <div className="mb-1">
                    <div className="text-yellow-500 font-retro text-[8px] md:text-[10px] leading-tight">CHARACTER</div>
                    <div className="text-white font-bold text-sm md:text-lg leading-none font-serif">
                       {level.bibleContext.character}
                    </div>
                 </div>
              </div>
           </div>

           {/* 3D Scene Projection */}
           <div className="flex mb-6 justify-center perspective-1000 group w-full">
              <div className="relative p-2 w-full flex flex-col items-center">
                 {/* Holographic Glow Base */}
                 <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full animate-pulse pointer-events-none"></div>
                 
                 <div className="scale-75 md:scale-100 origin-center transform transition-transform">
                    <VoxelScene level={level} isCompleted={isLevelComplete} />
                 </div>
                 
                 <div className="text-center md:mt-2 text-[10px] text-blue-400 font-mono tracking-widest uppercase opacity-70">
                    3D Scene Projection
                 </div>
              </div>
           </div>

           {/* Collapsible Biblical Context */}
           <div className="border-2 border-gray-600 bg-gray-900/60 rounded overflow-hidden shadow-lg">
             <button 
               onClick={() => setIsContextExpanded(!isContextExpanded)}
               className="w-full p-2 md:p-3 flex justify-between items-center bg-gray-800 hover:bg-gray-700 transition-colors border-b border-gray-700"
             >
               <span className="text-yellow-500 font-retro text-[10px] md:text-xs tracking-wide">{t('biblical_context')}</span>
               <span className="text-gray-400 font-mono text-[10px] md:text-xs">{isContextExpanded ? '[-]' : '[+]'}</span>
             </button>
             
             {isContextExpanded && (
               <div className="p-3 md:p-4 space-y-3 md:space-y-5 animate-slide-up">
                  
                  {/* Story & Reference */}
                  <div className="border-l-2 border-yellow-600 pl-3">
                     <h3 className="text-gray-100 font-bold font-serif text-sm md:text-lg leading-tight">
                        <TranslatedText text={level.bibleContext.storyTitle} language={language} />
                     </h3>
                     <p className="text-yellow-600 text-[10px] md:text-xs font-mono mt-1">{level.bibleContext.reference}</p>
                  </div>

                  {/* Narrative Intro */}
                  <div className="text-gray-300 text-xs md:text-sm italic font-serif leading-relaxed">
                     "<TranslatedText text={level.bibleContext.narrativeIntro} language={language} />"
                  </div>

                  {/* Character & Prayer Focus Grid */}
                  <div className="grid grid-cols-1 gap-2 md:gap-3">
                     <div className="bg-green-900/20 p-2 rounded border border-green-800/50">
                        <h4 className="text-[9px] md:text-[10px] text-green-400 font-retro mb-1 uppercase">{t('prayer_focus')}</h4>
                        <p className="text-xs md:text-sm text-gray-200">
                           <TranslatedText text={level.bibleContext.prayerFocus} language={language} />
                        </p>
                     </div>
                  </div>

                  {/* Key Verse - The Revealed Secret */}
                  <div className={`
                     relative p-3 md:p-4 rounded border-2 transition-all duration-1000 transform
                     ${isLevelComplete 
                       ? 'border-yellow-400 bg-gradient-to-br from-yellow-900/40 to-black shadow-[0_0_30px_rgba(234,179,8,0.5)] scale-105 ring-2 ring-yellow-500/50' 
                       : 'border-gray-800 bg-gray-950/50 opacity-60 grayscale'
                     }
                  `}>
                     <div className="flex justify-between items-center mb-1">
                        <h4 className={`text-[9px] md:text-[10px] font-retro uppercase ${isLevelComplete ? 'text-yellow-400 animate-pulse' : 'text-gray-500'}`}>
                          {isLevelComplete ? `✨ ${t('revelation')}` : `🔒 ${t('locked')}`}
                        </h4>
                     </div>
                     
                     {isLevelComplete ? (
                        <p className="text-white font-serif italic text-sm md:text-lg text-center leading-relaxed drop-shadow-md animate-glow animate-fade-in">
                          "<TranslatedText text={level.bibleContext.keyVerse} language={language} />"
                        </p>
                     ) : (
                        <div className="flex flex-col items-center justify-center py-2 space-y-2">
                          <p className="text-gray-600 font-mono text-[10px] md:text-xs text-center">
                             Overcome <TranslatedText text={level.sin} language={language} />.
                          </p>
                        </div>
                     )}
                  </div>

               </div>
             )}
           </div>
        </div>

        {/* Right Panel: Chat Log */}
        <div className="flex-1 flex flex-col bg-gray-900/50 backdrop-blur-sm min-h-0">
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 custom-scroll">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === MessageRole.USER ? 'justify-end' : 'justify-start'} animate-slide-up`}
              >
                <div 
                  className={`
                    relative max-w-[95%] md:max-w-[85%] p-3 md:p-4 rounded-lg text-sm md:text-lg leading-relaxed pixel-shadow-sm
                    ${msg.role === MessageRole.USER 
                      ? 'bg-blue-900/90 text-blue-100 border-2 border-blue-700' 
                      : 'bg-gray-800/90 text-gray-200 border-2 border-gray-600'
                    }
                    ${msg.isScripture ? 'border-yellow-500 bg-yellow-900/80' : ''}
                  `}
                >
                  <p>{msg.text}</p>
                  <div className="text-[10px] opacity-50 mt-1 text-right uppercase tracking-widest">
                     {msg.role === MessageRole.USER ? t('identity') : t('guide')}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
               <div className="flex justify-start animate-fade-in">
                  <div className="bg-gray-800/90 text-gray-400 p-3 rounded-lg border-2 border-gray-600 text-sm flex items-center gap-2">
                     <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce"></span>
                     <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce delay-100"></span>
                     <span className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce delay-200"></span>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 md:p-4 bg-gray-900 border-t-2 border-black flex gap-2 md:gap-4 shrink-0">
             <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder={isLoading ? t('praying') : `${t('speak')}...`}
               disabled={isLoading || isLevelComplete}
               className="flex-1 bg-black text-white p-3 md:p-4 rounded border-2 border-gray-700 focus:border-yellow-500 outline-none font-serif text-base md:text-lg shadow-inner"
               autoFocus
             />
             <Button 
               type="submit" 
               disabled={isLoading || !input.trim() || isLevelComplete}
               className={`px-4 md:px-8 ${isLoading ? 'opacity-50' : ''}`}
             >
               {isLoading ? '...' : '➤'}
             </Button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default GameView;
