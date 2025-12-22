
import React from 'react';
import { AppView, User } from '../types';
import { UI_TEXT, LanguageCode } from '../translations';

interface LandingViewProps {
  user: User | null;
  onNavigate: (view: AppView) => void;
  language: LanguageCode;
}

const LandingView: React.FC<LandingViewProps> = ({ user, onNavigate, language }) => {
  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[language][key] || UI_TEXT['en'][key];
  };

  // Helper for background cards to reduce repetition
  const MenuCard = ({ 
    onClick, 
    title, 
    subtitle, 
    bgPrompt, 
    colSpan = "col-span-1", 
    height = "h-32",
    icon,
    color = "text-white"
  }: any) => (
    <div 
        onClick={onClick} 
        className={`${colSpan} ${height} relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-white/10 hover:border-white/30 transition-all hover:scale-[1.02] shadow-lg`}
    >
        <div className={`absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/${encodeURIComponent(bgPrompt)}?width=400&height=300&nologo=true')] bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity`}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        
        <div className="absolute bottom-0 left-0 p-4 w-full">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className={`font-retro text-xs md:text-sm uppercase tracking-widest ${color} drop-shadow-md`}>{title}</h3>
                    <p className="text-[9px] md:text-[10px] text-gray-300 font-serif italic opacity-80">{subtitle}</p>
                </div>
                <span className="text-2xl opacity-80 group-hover:scale-110 transition-transform">{icon}</span>
            </div>
        </div>
        
        {/* Hover Shine Effect */}
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
  );

  return (
    <div className="min-h-full w-full bg-[#1a1614] relative flex flex-col items-center p-4 animate-fade-in custom-scroll pb-24">
        {/* Global Background */}
        <div className="fixed inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20starry%20night%20desert%20calm?width=1200&height=800&nologo=true')] bg-cover bg-center opacity-20 pointer-events-none"></div>
        <div className="fixed inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none"></div>
        
        {/* Welcome Header */}
        <div className="relative z-10 w-full max-w-5xl mb-6 mt-2 flex justify-between items-end border-b border-white/10 pb-4">
            <div>
                <h1 className="text-2xl font-retro text-yellow-500 text-shadow-sm">
                    {user ? `Greetings, ${user.username}` : 'Welcome Pilgrim'}
                </h1>
                <p className="text-gray-400 text-xs font-serif italic">Your journey continues...</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase font-mono tracking-widest">Current Season</p>
                <p className="text-green-400 text-xs font-bold font-mono">ADVENT</p>
            </div>
        </div>

        {/* Dashboard Grid */}
        <div className="relative z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            
            {/* 1. HERO: ARCADE MODE (Map Preview) */}
            <div onClick={() => onNavigate(AppView.GAME_LIBRARY)} className="col-span-2 md:col-span-2 row-span-2 relative rounded-3xl overflow-hidden cursor-pointer group border-2 border-blue-500/30 hover:border-blue-400 transition-all shadow-[0_0_30px_rgba(59,130,246,0.15)] min-h-[220px]">
                <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20fantasy%20rpg%20map%20world%20islands?width=600&height=400&nologo=true')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                
                <div className="absolute top-4 left-4">
                    <span className="bg-blue-600/90 text-white text-[9px] font-bold px-2 py-1 rounded border border-blue-400 backdrop-blur-md shadow-lg uppercase tracking-wider">
                        Campaign Mode
                    </span>
                </div>

                <div className="absolute bottom-0 left-0 p-5 w-full">
                    <h2 className="text-3xl font-retro text-white mb-1 drop-shadow-lg group-hover:text-yellow-300 transition-colors">{t('play')}</h2>
                    <p className="text-blue-200 font-serif text-xs opacity-90 line-clamp-2">Embark on the Pilgrim's Path. Conquer levels, collect verses, and ascend.</p>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 w-1/3"></div>
                        </div>
                        <span className="text-[9px] text-gray-400 font-mono">33% World Progress</span>
                    </div>
                </div>
            </div>
            
            {/* 2. JOURNEY TV (Live Preview) */}
            <div onClick={() => onNavigate(AppView.TV)} className="col-span-2 relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-red-500/30 hover:border-red-400 transition-all min-h-[100px]">
                <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20tv%20broadcast%20studio%20news?width=400&height=200&nologo=true')] bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
                
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full border border-red-500/30">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                    <span className="text-[8px] text-red-400 font-bold tracking-widest">LIVE</span>
                </div>

                <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="text-lg font-retro text-white group-hover:text-red-300 transition-colors">JOURNEY TV</h3>
                    <p className="text-gray-400 text-[10px]">Community Broadcasts</p>
                </div>
            </div>

            {/* 3. CORE FEATURES ROW */}
            <MenuCard 
                onClick={() => onNavigate(AppView.MISSIONS)} 
                title="Quests" 
                subtitle="Daily & Weekly" 
                bgPrompt="pixel art parchment scroll quill active quest list" 
                icon="📜"
                color="text-yellow-200"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.COMMUNITY)} 
                title="Fellowship" 
                subtitle="Guilds & Chat" 
                bgPrompt="pixel art bonfire gathering friends night" 
                icon="🔥"
                color="text-orange-200"
            />
            
            {/* 4. DAILY DISCIPLINES ROW */}
            <MenuCard 
                onClick={() => onNavigate(AppView.DEVOTIONAL)} 
                title="Daily Bread" 
                subtitle="Morning Manna" 
                bgPrompt="pixel art sunrise over open bible holy light" 
                icon="🍞"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.PLANS)} 
                title="Plans" 
                subtitle="Guided Reading" 
                bgPrompt="pixel art winding path through mountains map" 
                icon="📅"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.BIBLE)} 
                title="Scripture" 
                subtitle="The Word" 
                bgPrompt="pixel art ancient scroll text hebrew greek" 
                icon="📖"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.ACTIVITIES)} 
                title="Practice" 
                subtitle="Spiritual Habits" 
                bgPrompt="pixel art monk meditating peaceful garden" 
                icon="🧘"
            />

            {/* 5. ECONOMY ROW (Wide) */}
            <div onClick={() => onNavigate(AppView.FORGE)} className="col-span-2 h-32 relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-purple-500/30 hover:border-purple-400 transition-all">
                <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20blacksmith%20forge%20glowing%20magical%20anvil?width=600&height=300&nologo=true')] bg-cover bg-center opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-900/80 to-transparent"></div>
                <div className="absolute inset-0 p-5 flex flex-col justify-center">
                    <h3 className="text-xl font-retro text-purple-200 mb-1">SACRED FORGE</h3>
                    <p className="text-xs text-purple-100/70 font-serif italic">Manifest digital artifacts from Spirit XP.</p>
                    <div className="mt-2 text-[9px] text-purple-300 font-mono bg-black/40 px-2 py-1 rounded w-fit border border-purple-500/30">
                        Create • Collect • Trade
                    </div>
                </div>
                <div className="absolute right-4 bottom-4 text-3xl animate-pulse">⚒️</div>
            </div>

            <div onClick={() => onNavigate(AppView.MARKETPLACE)} className="col-span-2 h-32 relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-green-500/30 hover:border-green-400 transition-all">
                <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20bazaar%20market%20stalls%20night%20glowing%20items?width=600&height=300&nologo=true')] bg-cover bg-center opacity-50 group-hover:opacity-70 transition-opacity"></div>
                <div className="absolute inset-0 bg-gradient-to-l from-green-900/80 to-transparent"></div>
                <div className="absolute inset-0 p-5 flex flex-col justify-center items-end text-right">
                    <h3 className="text-xl font-retro text-green-200 mb-1">MARKETPLACE</h3>
                    <p className="text-xs text-green-100/70 font-serif italic">Trade artifacts with other pilgrims.</p>
                    <div className="mt-2 text-[9px] text-green-300 font-mono bg-black/40 px-2 py-1 rounded w-fit border border-green-500/30">
                        Live Economy
                    </div>
                </div>
                <div className="absolute left-4 bottom-4 text-3xl animate-bounce">🛒</div>
            </div>

            {/* 6. ADVANCED FEATURES */}
            <MenuCard 
                onClick={() => onNavigate(AppView.STAKING)} 
                title="Vault" 
                subtitle="Stake XP" 
                bgPrompt="pixel art bank vault gold bars secure" 
                icon="🏦"
                color="text-yellow-400"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.PRAYER_ROOM)} 
                title="Prayer Room" 
                subtitle="Live Voice" 
                bgPrompt="pixel art candle lit dark room sanctuary" 
                icon="🕯️"
                color="text-cyan-300"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.RAFFLES)} 
                title="Raffles" 
                subtitle="Win Prizes" 
                bgPrompt="pixel art golden tickets flying lottery" 
                icon="🎟️"
                color="text-pink-300"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.GIVEAWAYS)} 
                title="Giveaways" 
                subtitle="Community Gifts" 
                bgPrompt="pixel art gift boxes glowing loot" 
                icon="🎁"
                color="text-purple-300"
            />

            {/* 7. DATA & TOKEN */}
            <div className="col-span-full grid grid-cols-3 gap-2 mt-4">
                <div onClick={() => onNavigate(AppView.LEADERBOARD)} className="bg-gray-800/60 border border-white/5 hover:bg-gray-700 p-3 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all">
                    <span className="text-xl mb-1">🏆</span>
                    <span className="text-[8px] uppercase tracking-widest text-gray-400">Rankings</span>
                </div>
                <div onClick={() => onNavigate(AppView.TREASURY)} className="bg-gray-800/60 border border-white/5 hover:bg-gray-700 p-3 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all">
                    <span className="text-xl mb-1">🏛️</span>
                    <span className="text-[8px] uppercase tracking-widest text-gray-400">Treasury</span>
                </div>
                <div onClick={() => onNavigate(AppView.TOKEN)} className="bg-gray-800/60 border border-white/5 hover:bg-gray-700 p-3 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all">
                    <span className="text-xl mb-1">🚀</span>
                    <span className="text-[8px] uppercase tracking-widest text-green-400">$JOURNEY</span>
                </div>
            </div>

            {/* 8. DONATE BANNER */}
            <div onClick={() => onNavigate(AppView.DONATE)} className="col-span-full mt-4 relative rounded-xl overflow-hidden cursor-pointer group border border-yellow-600/30 hover:border-yellow-500 h-16">
                <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20altar%20offering%20gold%20coins%20light?width=800&height=200&nologo=true')] bg-cover bg-center opacity-30"></div>
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3">
                    <span className="text-xl group-hover:scale-125 transition-transform">❤️</span>
                    <div>
                        <h4 className="font-retro text-xs text-yellow-200 uppercase tracking-widest group-hover:text-white">Make an Offering</h4>
                        <p className="text-[8px] text-gray-400 font-mono text-center">Support the Ecosystem</p>
                    </div>
                </div>
            </div>

            {/* UTILITIES FOOTER */}
            <div className="col-span-full flex justify-center gap-6 mt-8 text-gray-600 text-[10px] uppercase font-mono">
                <button onClick={() => onNavigate(AppView.WIKI)} className="hover:text-white transition-colors">Wiki</button>
                <button onClick={() => onNavigate(AppView.BROWSER)} className="hover:text-white transition-colors">Browser</button>
                <button onClick={() => onNavigate(AppView.SUPPORT)} className="hover:text-white transition-colors">Support</button>
                <button onClick={() => onNavigate(AppView.JOURNAL)} className="hover:text-white transition-colors">Journal</button>
            </div>

        </div>
    </div>
  );
};

export default LandingView;
