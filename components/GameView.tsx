
import React, { useState, useEffect, useRef } from 'react';
import { LevelConfig, Message, MessageRole, DifficultyMode, AppView } from '../types';
import Button from './Button';
import { LanguageCode, UI_TEXT } from '../translations';
import { AudioSystem } from '../utils/audio';
import TranslatedText from './TranslatedText';
import { generateGuideResponse, translateText } from '../services/geminiService';

interface GameViewProps {
  level: LevelConfig;
  onBack: () => void;
  onHome: () => void;
  onComplete: (verse: string) => void;
  onNavigate: (view: AppView) => void;
  language: LanguageCode;
  difficulty: DifficultyMode;
}

const GameView: React.FC<GameViewProps> = ({ level, onBack, onHome, onComplete, onNavigate, language, difficulty }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[language][key] || UI_TEXT['en'][key];
  };

  useEffect(() => {
    // Initial load - Generate Intro
    const loadIntro = async () => {
      setIsLoading(true);
      let introText = level.bibleContext.narrativeIntro;
      
      // Translate if needed
      if (language !== 'en') {
          introText = await translateText(introText, language);
      }

      setMessages([
        { id: 'init', role: MessageRole.GUIDE, text: introText }
      ]);
      setIsLoading(false);
      AudioSystem.init();
    };
    loadIntro();
    setIsLevelComplete(false);
    setIsContextExpanded(false); 
  }, [level, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLevelCompletion = async () => {
      setIsLevelComplete(true);
      setIsContextExpanded(true);
      AudioSystem.playLevelComplete();
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    AudioSystem.playVoxelTap();

    const userMsg: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      text: input
    };

    const currentHistory = [...messages]; 

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const result = await generateGuideResponse(level, userMsg.text, currentHistory, language, difficulty);

        const guideMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: MessageRole.GUIDE,
            text: result.text,
            isScripture: !!result.scriptureRef
        };

        setMessages(prev => [...prev, guideMsg]);
        AudioSystem.playMessage();

        if (result.isSuccess) {
            handleLevelCompletion();
        }

    } catch (error) {
        console.error("AI Error:", error);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: MessageRole.GUIDE,
            text: "The connection to the guide is faint. Please try again."
        }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-7xl mx-auto md:border-x-4 border-gray-800 bg-gray-950 shadow-2xl relative">
      
      {/* Level Completion Overlay */}
      {isLevelComplete && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-4">
           <div className="text-center p-6 md:p-8 bg-gray-900 border-4 border-yellow-500 rounded-3xl shadow-[0_0_80px_rgba(234,179,8,0.4)] max-w-lg w-full transform animate-slide-up relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-900/20 to-transparent pointer-events-none"></div>
              
              <div className="relative z-10">
                  <div className="text-4xl md:text-6xl mb-4 animate-bounce">✨</div>
                  <h2 className="text-2xl md:text-4xl font-retro text-yellow-400 mb-2 text-shadow-md tracking-tight">{t('level_cleared')}</h2>
                  
                  <div className="bg-black/40 p-4 rounded-2xl border border-white/10 mb-6">
                      <p className="text-gray-300 font-serif italic text-sm md:text-base leading-relaxed">
                         "<TranslatedText text={level.bibleContext.keyVerse} language={language} />"
                      </p>
                  </div>
                  
                  <div className="flex justify-center gap-6 mb-8 text-sm font-mono text-gray-400">
                    <div className="flex flex-col items-center bg-white/5 p-3 rounded-xl border border-white/5 min-w-[80px]">
                      <span className="text-green-400 font-bold text-xl">
                          +{Math.floor( (100 + (level.id * 25)) * (difficulty === 'hard' ? 1.5 : difficulty === 'easy' ? 0.8 : 1) )}
                      </span>
                      <span className="text-[9px] uppercase tracking-wider">{t('xp_gained')}</span>
                    </div>
                    <div className="flex flex-col items-center bg-white/5 p-3 rounded-xl border border-white/5 min-w-[80px]">
                      <span className="text-yellow-400 font-bold text-xl">1</span>
                      <span className="text-[9px] uppercase tracking-wider">Verse</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                      <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl flex items-center gap-3 text-left">
                          <span className="text-2xl">📖</span>
                          <div className="flex-1">
                              <p className="text-blue-300 font-retro text-[9px] uppercase">Journal Updated</p>
                              <p className="text-white font-bold text-xs">Verse Unlocked</p>
                          </div>
                      </div>

                      <Button onClick={() => onComplete(level.bibleContext.keyVerse)} className="w-full text-sm md:text-base py-4 bg-green-600 hover:bg-green-500 border-green-800 shadow-xl animate-pulse">
                         CONTINUE TO LEVEL {level.id + 1} ➤
                      </Button>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center p-2 md:p-4 bg-gray-900/95 backdrop-blur border-b-2 border-white/10 shrink-0 gap-2">
        <div className="flex gap-2 w-full md:w-auto justify-between md:justify-start">
            <Button variant="secondary" onClick={onHome} className="text-[10px] py-2 px-3 bg-gray-800 border-gray-700">🏠 {t('home')}</Button>
            <Button variant="secondary" onClick={onBack} className="text-[10px] py-2 px-3 bg-gray-800 border-gray-700">🗺️ {t('map')}</Button>
        </div>
        <div className="text-center flex-1 mx-2 w-full md:w-auto">
            <h1 className="text-white font-retro text-sm text-yellow-500 tracking-wider truncate">
              <TranslatedText text={level.name} language={language} />
            </h1>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden bg-black min-h-0">
        
        {/* Left Panel: Visuals & Context */}
        <div className="w-full md:w-[400px] bg-gray-900 p-2 md:p-4 border-b-2 md:border-b-0 md:border-r-2 border-white/10 overflow-y-auto custom-scroll shrink-0">
           
           {/* Landscape Visual (Hero) */}
           <div className="relative rounded-2xl border-4 border-gray-800 bg-black overflow-hidden mb-4 shadow-2xl group">
              <img src={level.images.landscape} className="w-full h-48 md:h-64 object-cover opacity-90 group-hover:scale-105 transition-transform duration-1000" alt="Landscape" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10 text-[8px] text-gray-400 font-mono uppercase tracking-widest">
                  VOXEL VIEW
              </div>

              <div className="absolute bottom-2 left-2 flex items-end gap-3">
                 <div className="w-16 h-16 rounded-xl border-2 border-yellow-600 bg-black overflow-hidden shadow-lg relative">
                    <img src={level.images.character} className="w-full h-full object-cover" alt="Character" />
                 </div>
                 <div className="mb-1">
                    <div className="text-yellow-500 font-retro text-[8px] leading-tight">HERO</div>
                    <div className="text-white font-bold text-sm leading-none font-serif">
                       {level.bibleContext.character}
                    </div>
                 </div>
              </div>
           </div>

           {/* Biblical Context */}
           <div className="bg-gray-800/50 rounded-xl border border-white/5 p-3 space-y-3">
              <button 
                onClick={() => setIsContextExpanded(!isContextExpanded)}
                className="w-full flex justify-between items-center text-left"
              >
                <span className="text-yellow-500 font-retro text-[10px] uppercase tracking-wide">{t('biblical_context')}</span>
                <span className="text-gray-500 text-xs">{isContextExpanded ? '[-]' : '[+]'}</span>
              </button>
              
              {(isContextExpanded || true) && (
                 <div className="space-y-3 animate-slide-up">
                    <div>
                        <h3 className="text-white font-bold font-serif text-sm leading-tight">
                            <TranslatedText text={level.bibleContext.storyTitle} language={language} />
                        </h3>
                        <p className="text-gray-500 text-[10px] font-mono">{level.bibleContext.reference}</p>
                    </div>

                    <p className="text-gray-300 text-xs italic font-serif leading-relaxed border-l-2 border-gray-600 pl-2">
                        "<TranslatedText text={level.bibleContext.narrativeIntro} language={language} />"
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-red-900/20 p-2 rounded border border-red-800/30">
                            <p className="text-[8px] text-red-400 uppercase font-retro">Sin</p>
                            <p className="text-xs text-white"><TranslatedText text={level.sin} language={language} /></p>
                        </div>
                        <div className="bg-green-900/20 p-2 rounded border border-green-800/30">
                            <p className="text-[8px] text-green-400 uppercase font-retro">Virtue</p>
                            <p className="text-xs text-white"><TranslatedText text={level.virtue} language={language} /></p>
                        </div>
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
                    relative max-w-[90%] md:max-w-[80%] p-3 md:p-4 rounded-2xl text-sm md:text-lg leading-relaxed shadow-lg
                    ${msg.role === MessageRole.USER 
                      ? 'bg-blue-900/80 text-blue-100 border border-blue-700/50 rounded-tr-none' 
                      : 'bg-gray-800/90 text-gray-200 border border-gray-700/50 rounded-tl-none'
                    }
                    ${msg.isScripture ? 'border-yellow-500/50 bg-yellow-900/40 text-yellow-100' : ''}
                  `}
                >
                  <p>{msg.text}</p>
                  <div className="text-[8px] opacity-50 mt-2 text-right uppercase tracking-widest font-mono">
                     {msg.role === MessageRole.USER ? t('identity') : t('guide')}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
               <div className="flex justify-start animate-fade-in">
                  <div className="bg-gray-800/50 text-gray-400 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-700/30 text-xs flex items-center gap-2">
                     <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce"></span>
                     <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce delay-100"></span>
                     <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-bounce delay-200"></span>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 md:p-4 bg-gray-900 border-t border-white/10 flex gap-2 md:gap-4 shrink-0">
             <input
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder={isLoading ? t('praying') : `${t('speak')}...`}
               disabled={isLoading || isLevelComplete}
               className="flex-1 bg-black text-white p-3 md:p-4 rounded-xl border border-gray-700 focus:border-yellow-500 outline-none font-serif text-base shadow-inner"
               autoFocus
             />
             <Button 
               type="submit" 
               disabled={isLoading || !input.trim() || isLevelComplete}
               className={`px-4 md:px-6 rounded-xl ${isLoading ? 'opacity-50' : ''}`}
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
