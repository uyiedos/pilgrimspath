import React from 'react';
import { GAMES } from '../constants';
import Button from './Button';
import { GameModeId } from '../types';
import { LanguageCode, UI_TEXT } from '../translations';
import TranslatedText from './TranslatedText';

interface GameLibraryViewProps {
  onSelectGame: (gameId: GameModeId) => void;
  onBack: () => void;
  language?: LanguageCode;
}

const GameLibraryView: React.FC<GameLibraryViewProps> = ({ onSelectGame, onBack, language = 'en' }) => {
  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT.en[key];

  const safeLanguage = language || 'en';

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-6 pt-24 md:pt-28 relative overflow-hidden bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20ancient%20library%20bookshelves%20mystical?width=1080&height=720&nologo=true')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/70"></div>
      
      <header className="relative z-10 w-full max-w-6xl flex justify-between items-center mb-10 border-b-4 border-yellow-700 pb-4 bg-black/40 p-4 rounded-xl">
         <div className="text-left">
           <h1 className="text-4xl font-retro text-yellow-500 text-shadow-md">
             <TranslatedText text="Biblical Adventures" language={safeLanguage} />
           </h1>
           <p className="text-gray-300 font-serif italic">
             <TranslatedText text="Choose your spiritual journey" language={safeLanguage} />
           </p>
         </div>
         <Button onClick={onBack} variant="secondary">🏠 {t('home')}</Button>
      </header>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {GAMES.map((game) => (
          <div 
            key={game.id}
            onClick={() => onSelectGame(game.id)}
            className="bg-gray-800 rounded-xl overflow-hidden border-4 border-gray-600 hover:border-yellow-500 cursor-pointer transition-all hover:scale-105 group pixel-shadow flex flex-col h-full"
          >
             <div className="h-48 overflow-hidden relative border-b-4 border-black">
               <img 
                 src={game.image} 
                 alt={game.title} 
                 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80 group-hover:opacity-100" 
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
               <div className="absolute bottom-2 left-2">
                 <span className="bg-black/80 text-yellow-500 text-xs px-2 py-1 rounded font-mono border border-yellow-700">
                    {game.levels.length} <TranslatedText text="LEVELS" language={safeLanguage} />
                 </span>
               </div>
             </div>
             
             <div className="p-6 flex-1 flex flex-col justify-between bg-gradient-to-b from-gray-800 to-gray-900">
               <div>
                 <h3 className="text-2xl font-retro text-white mb-2 group-hover:text-yellow-400 transition-colors">
                   <TranslatedText text={game.title} language={safeLanguage} />
                 </h3>
                 <div className="text-gray-400 text-sm font-serif leading-relaxed">
                   <TranslatedText text={game.description} language={safeLanguage} />
                 </div>
               </div>
               
               <div className="mt-6">
                 <Button className="w-full text-xs">{t('play')}</Button>
               </div>
             </div>
          </div>
        ))}

        {/* Coming Soon Card */}
        <div className="bg-gray-900/50 rounded-xl border-4 border-gray-700 border-dashed flex flex-col items-center justify-center p-8 opacity-70 grayscale">
           <div className="text-4xl mb-4">🔒</div>
           <h3 className="text-xl font-retro text-gray-500">
             <TranslatedText text="Exodus: The Wilderness" language={safeLanguage} />
           </h3>
           <p className="text-gray-600 text-sm mt-2 font-mono">{t('locked')}...</p>
        </div>
      </div>
    </div>
  );
};

export default GameLibraryView;