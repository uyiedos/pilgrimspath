import React, { useState, useEffect, useRef } from 'react';
import { LevelConfig, Message, MessageRole, DifficultyMode, AppView } from '../types';
import VoxelScene from './VoxelScene';
import Button from './Button';
import { UI_TEXT, LanguageCode, getTranslation } from '../translations';
import { AudioSystem } from '../utils/audio';
import TranslatedText from './TranslatedText';
import { supabase } from '../lib/supabase';
import { Type, Schema } from "@google/genai";
import { getGeminiClient } from '../services/geminiService';

interface GameViewProps {
  level: LevelConfig;
  onBack: () => void;
  onHome: () => void;
  onComplete: (verse: string) => void;
  onNavigate: (view: AppView) => void;
  language: LanguageCode;
  difficulty: DifficultyMode;
}

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    isSuccess: { type: Type.BOOLEAN },
    scriptureRef: { type: Type.STRING } 
  },
  required: ["text", "isSuccess"],
};

const GameView: React.FC<GameViewProps> = ({ level, onBack, onHome, onComplete, onNavigate, language, difficulty }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [isContextExpanded, setIsContextExpanded] = useState(true);
  const [isMintingArtifact, setIsMintingArtifact] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize AI Client from centralized service
  const ai = getGeminiClient();

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return getTranslation(language, key);
  };

  useEffect(() => {
    // Initial load - Generate Intro
    const loadIntro = async () => {
      setIsLoading(true);
      let introText = level.bibleContext.narrativeIntro;
      
      // Translate if needed
      if (language !== 'en') {
          try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ parts: [{ text: `Translate to ${language}: "${introText}"` }] }],
            });
            if (response.text) introText = response.text;
          } catch (e) {
            console.error("Translation failed", e);
          }
      }

      setMessages([
        { id: 'init', role: MessageRole.GUIDE, text: introText }
      ]);
      setIsLoading(false);
      AudioSystem.init();
    };
    loadIntro();
    setIsLevelComplete(false);
    setIsContextExpanded(true); 
  }, [level, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLevelCompletion = async () => {
      setIsLevelComplete(true);
      setIsContextExpanded(true);
      AudioSystem.playLevelComplete();

      // Mint Game Artifact in Background
      mintLevelReward();
  };

  const mintLevelReward = async () => {
      // Get current user session securely
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return; // Guest mode or not logged in

      setIsMintingArtifact(true);
      try {
          // Note: using level image as artifact image. In a full system, you might generate a new one.
          await supabase.rpc('mint_level_artifact', {
              p_user_id: session.user.id,
              p_level_name: level.name,
              p_image_url: level.images.landscape,
              p_verse: level.bibleContext.keyVerse
          });
      } catch (e) {
          console.error("Failed to mint level artifact", e);
      } finally {
          setIsMintingArtifact(false);
      }
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
        // AI Logic Inlined
        const systemInstruction = `
            IDENTITY: You are "The Guide", an ancient, ethereal guardian of the Pilgrim's Path.
            
            SCENARIO CONTEXT:
            - Role: The user is playing as ${level.bibleContext.character}.
            - Location: ${level.name}.
            - Scene Description: ${level.bibleContext.narrativeIntro}
            - Spiritual Conflict: Battling "${level.sin}" vs "${level.virtue}".
            - The Hidden Truth: "${level.bibleContext.keyVerse}"
            
            YOUR MISSION:
            1. ENVIRONMENTAL ANALYSIS: Begin by vividy describing the immediate environment.
            2. EVALUATE ACTION: Judge the User's message ("${userMsg.text}") against the virtue of ${level.virtue}.
            3. DIFFICULTY (${difficulty.toUpperCase()}):
            - EASY: Allow simple intent.
            - NORMAL: Require specific action or reflection.
            - HARD: Require scripture quotation or deep theological insight.
            4. OUTCOME:
            - SUCCESS: If they demonstrate ${level.virtue}, set 'isSuccess' to TRUE. Narrate the victory. Reveal the verse.
            - FAIL: If they falter, set 'isSuccess' to FALSE. Narrate the consequence. Offer a hint.
            
            FORMATTING:
            - Keep response under 70 words.
            - Language: ${language}.
        `;

        const contents = currentHistory
            .filter(m => m.role === MessageRole.USER || m.role === MessageRole.GUIDE)
            .map(m => ({
                role: m.role === MessageRole.USER ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));
        
        contents.push({ role: 'user', parts: [{ text: userMsg.text }] });

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: contents,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const result = JSON.parse(response.text || '{"text": "...", "isSuccess": false}');

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
    <div className="flex flex-col h-[100dvh] w-full max-w-7xl mx-auto md:border-x-4 border-gray-800 bg-gray-900 shadow-2xl relative">
      
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
                      {/* Game Artifact Preview */}
                      <div className="bg-purple-900/20 border border-purple-500/30 p-3 rounded-xl flex items-center gap-3 text-left">
                          <img src={level.images.landscape || ''} className="w-12 h-12 rounded-lg border border-purple-500 object-cover" />
                          <div className="flex-1">
                              <p className="text-purple-300 font-retro text-[9px] uppercase">Loot Discovered</p>
                              <p className="text-white font-bold text-xs">{level.name} Artifact</p>
                          </div>
                          <button 
                            onClick={() => onNavigate(AppView.FORGE)}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-[9px] px-3 py-1.5 rounded uppercase font-bold transition-colors"
                          >
                              VIEW IN FORGE
                          </button>
                      </div>

                      <Button onClick={() => onComplete(level.bibleContext.keyVerse)} className="w-full text-sm md:text-base py-4 bg-green-600 hover:bg-green-500 border-green-800 shadow-xl animate-pulse">
                         CONTINUE TO LEVEL {level.id + 1} ➤
                      </Button>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* Background Ambience Layer */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <img src={level.images.landscape || ''} alt="" className="w-full h-full object-cover blur-sm" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center p-2 md:p-4 bg-gray-800/90 backdrop-blur border-b-4 border-black shrink-0 gap-2 md:gap-4">
        <div className="flex gap-2 w-full md:w-auto justify-between md:justify-start">
            <Button variant="secondary" onClick={onHome} className="text-[10px] md:text-xs py-2 px-2 md:px-3 flex-1 md:flex-none">🏠 {t('home')}</Button>
            <Button variant="secondary" onClick={onBack} className="text-[10px] md:text-xs py-2 px-2 md:px-3 flex-1 md:flex-none">🗺️ {t('map')}</Button>
            <div className="md:hidden">
               <div className="text-[9px] text-gray-500 text-center font-mono uppercase border border-gray-700 rounded px-2 py-2 bg-black/50">
                   <span className={difficulty === 'hard' ? 'text-red-500' : difficulty === 'easy' ? 'text-green-500' : 'text-yellow-500'}>{difficulty}</span>
               </div>
            </div>
        </div>
        <div className="text-center flex-1 mx-2 w-full md:w-auto">
            <h1 className="text-white font-retro text-sm md:text-xl text-yellow-500 tracking-wider shadow-black drop-shadow-md truncate">
              <TranslatedText text={level.name} language={language} />
            </h1>
            <div className="text-gray-300 text-[9px] md:text-xs uppercase tracking-widest mt-1 hidden md:block">
              <TranslatedText text={level.bibleContext.storyTitle} language={language} />
            </div>
        </div>
        <div className="hidden md:block w-24">
             <div className="text-[9px] text-gray-500 text-right font-mono uppercase border border-gray-700 rounded px-1">
                 MODE: <span className={difficulty === 'hard' ? 'text-red-500' : difficulty === 'easy' ? 'text-green-500' : 'text-yellow-500'}>{difficulty}</span>
             </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden bg-gray-900/80 min-h-0">
        
        {/* Left Panel */}
        <div className="w-full md:w-[400px] lg:w-[450px] bg-gray-850/90 p-2 md:p-4 border-b-4 md:border-b-0 md:border-r-4 border-black overflow-y-auto custom-scroll max-h-[35vh] md:max-h-full shrink-0 md:shrink">
           
           {/* Visual Scene Card */}
           <div className="relative rounded-lg border-2 md:border-4 border-gray-700 bg-black overflow-hidden mb-4 md:mb-6 pixel-shadow">
              <img src={level.images.landscape || ''} className="w-full h-32 md:h-48 object-cover opacity-90" alt="Landscape" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              
              <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 flex items-end gap-2 md:gap-3">
                 <div className="w-12 h-12 md:w-20 md:h-20 rounded border-2 border-yellow-600 bg-black overflow-hidden shadow-lg">
                    <img src={level.images.character || ''} className="w-full h-full object-cover" alt="Character" />
                 </div>
                 <div className="mb-1">
                    <div className="text-yellow-500 font-retro text-[8px] md:text-[10px] leading-tight">CHARACTER</div>
                    <div className="text-white font-bold text-sm md:text-lg leading-none font-serif">
                       {level.bibleContext.character}
                    </div>
                 </div>
              </div>
           </div>

           {/* 3D Scene Projection (Now LEGO Style) */}
           <div className="flex mb-6 justify-center perspective-1000 group w-full">
              <div className="relative p-2 w-full flex flex-col items-center">
                 <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full animate-pulse pointer-events-none"></div>
                 
                 <div className="scale-75 md:scale-100 origin-center transform transition-transform">
                    <VoxelScene level={level} isCompleted={isLevelComplete} />
                 </div>
                 
                 <div className="text-center md:mt-2 text-[10px] text-yellow-400 font-retro tracking-widest uppercase opacity-80 bg-black/40 px-2 rounded">
                    Voxel Reality View
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
                  <div className="border-l-2 border-yellow-600 pl-3">
                     <h3 className="text-gray-100 font-bold font-serif text-sm md:text-lg leading-tight">
                        <TranslatedText text={level.bibleContext.storyTitle} language={language} />
                     </h3>
                     <p className="text-yellow-600 text-[10px] md:text-xs font-mono mt-1">{level.bibleContext.reference}</p>
                  </div>

                  <div className="text-gray-300 text-xs md:text-sm italic font-serif leading-relaxed">
                     "<TranslatedText text={level.bibleContext.narrativeIntro} language={language} />"
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:gap-3">
                     <div className="bg-green-900/20 p-2 rounded border border-green-800/50">
                        <h4 className="text-[9px] md:text-[10px] text-green-400 font-retro mb-1 uppercase">{t('prayer_focus')}</h4>
                        <p className="text-xs md:text-sm text-gray-200">
                           <TranslatedText text={level.bibleContext.prayerFocus} language={language} />
                        </p>
                     </div>
                  </div>

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
