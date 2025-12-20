import React from 'react';
import { GameModeConfig } from '../types';
import Button from './Button';
import { LanguageCode, UI_TEXT } from '../translations';
import TranslatedText from './TranslatedText';

interface LevelMapProps {
  gameConfig: GameModeConfig;
  unlockedLevelId: number;
  onSelectLevel: (levelId: number) => void;
  onLibrary: () => void;
  onHome: () => void;
  language: LanguageCode;
}

const LevelMap: React.FC<LevelMapProps> = ({ gameConfig, unlockedLevelId, onSelectLevel, onLibrary, onHome, language }) => {
  const { levels, title, mapBackground } = gameConfig;
  
  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[language][key] || UI_TEXT['en'][key];
  };

  return (
    <div 
      className="flex flex-col items-center justify-start min-h-screen px-4 pb-4 pt-20 md:pt-24 space-y-8 animate-fade-in bg-gray-900 bg-cover bg-center bg-fixed bg-blend-overlay"
      style={{ backgroundImage: `url('${mapBackground}')` }}
    >
      
      <header className="w-full max-w-6xl flex justify-between items-center bg-black/60 backdrop-blur p-4 rounded-xl border border-white/10 shadow-lg">
         <div className="flex gap-2">
           <Button onClick={onHome} variant="secondary" className="text-xs py-2 px-3">
             🏠 {t('home')}
           </Button>
           <Button onClick={onLibrary} variant="secondary" className="text-xs py-2 px-3">
             📚 {t('library')}
           </Button>
         </div>
         <div className="text-center">
            <h2 className="text-2xl md:text-3xl text-yellow-500 font-retro drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
              <TranslatedText text={title} language={language} />
            </h2>
            <p className="text-gray-300 text-xs font-mono mt-1">
              <TranslatedText text="Select your path" language={language} />
            </p>
         </div>
         <div className="w-24"></div> {/* Spacer for balance */}
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {levels.map((level) => {
          const isUnlocked = level.id <= unlockedLevelId;
          const isCompleted = level.id < unlockedLevelId;

          return (
            <div 
              key={level.id}
              onClick={() => isUnlocked && onSelectLevel(level.id)}
              className={`
                group relative overflow-hidden rounded-xl border-4 transition-all duration-300 h-64
                ${isUnlocked 
                  ? 'border-gray-400 cursor-pointer hover:scale-105 hover:border-yellow-400 hover:shadow-2xl hover:shadow-yellow-900/20' 
                  : 'border-gray-800 opacity-60 grayscale cursor-not-allowed'
                }
                bg-gray-900 pixel-shadow
              `}
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <img 
                  src={level.images.landscape} 
                  alt={level.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              </div>

              {/* Content */}
              <div className="relative p-6 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className={`font-retro text-[10px] px-2 py-1 rounded border-2 border-black shadow-sm ${isCompleted ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-300'}`}>
                    {isCompleted ? t('cleared') : `LVL ${level.id}`}
                  </span>
                  {!isUnlocked && <span className="text-2xl drop-shadow-md">🔒</span>}
                </div>

                <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className={`text-2xl font-bold font-retro mb-1 text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]`}>
                    <TranslatedText text={level.name} language={language} />
                  </h3>
                  <div className="text-yellow-400 text-sm font-retro uppercase tracking-wider mb-2 drop-shadow-md">
                    <TranslatedText text={level.sin} language={language} />
                  </div>
                  
                  {isUnlocked && (
                    <div className="h-0 group-hover:h-auto overflow-hidden transition-all opacity-0 group-hover:opacity-100">
                       <p className="text-gray-200 text-xs font-serif italic line-clamp-2 drop-shadow-md">
                         <TranslatedText text={level.description} language={language} />
                       </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LevelMap;