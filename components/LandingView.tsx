
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
    return UI_TEXT[language]?.[key] || UI_TEXT['en'][key];
  };

  // Helper for background cards to reduce repetition
  const MenuCard = ({ 
    onClick, 
    titleKey, 
    subtitleKey, 
    bgPrompt, 
    colSpan = "col-span-1", 
    height = "h-32",
    icon,
    color = "text-white",
    badge
  }: any) => (
    <div 
        onClick={onClick} 
        className={`${colSpan} ${height} relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-white/10 hover:border-white/30 transition-all hover:scale-[1.02] shadow-lg`}
    >
        <div className={`absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/${encodeURIComponent(bgPrompt)}?width=400&height=300&nologo=true')] bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity`}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        
        {badge && (
            <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[8px] font-bold px-2 py-1 rounded border border-red-400 shadow-lg z-20 backdrop-blur-md animate-pulse">
                {badge}
            </div>
        )}

        <div className="absolute bottom-0 left-0 p-4 w-full">
            <div className="flex justify-between items-end">
                <div>
                    <h3 className={`font-retro text-xs md:text-sm uppercase tracking-widest ${color} drop-shadow-md`}>{t(titleKey)}</h3>
                    <p className="text-[9px] md:text-[10px] text-gray-300 font-serif italic opacity-80">{t(subtitleKey)}</p>
                </div>
                <span className="text-2xl opacity-80 group-hover:scale-110 transition-transform">{icon}</span>
            </div>
        </div>
        
        {/* Hover Shine Effect */}
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
  );

  return (
    <div className="min-h-full w-full bg-[#1a1614] relative flex flex-col items-center p-4 animate-fade-in custom-scroll pb-32">
        {/* Global Background */}
        <div className="fixed inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20starry%20night%20desert%20calm?width=1200&height=800&nologo=true')] bg-cover bg-center opacity-20 pointer-events-none"></div>
        <div className="fixed inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none"></div>
        
        {/* Welcome Header */}
        <div className="relative z-10 w-full max-w-5xl mb-6 mt-2 flex justify-between items-end border-b border-white/10 pb-4">
            <div>
                <h1 className="text-2xl font-retro text-yellow-500 text-shadow-sm">
                    {user ? `${t('welcome')}, ${user.username}` : t('welcome')}
                </h1>
                <p className="text-gray-300 text-[10px] md:text-xs font-serif italic max-w-2xl mt-1 leading-relaxed">
                   {t('journey_subtitle')}
                </p>
            </div>
            <div className="text-right hidden md:block">
                <p className="text-[10px] text-gray-500 uppercase font-mono tracking-widest">Current Season</p>
                <p className="text-green-400 text-xs font-bold font-mono">ADVENT</p>
            </div>
        </div>

        {/* Dashboard Grid */}
        <div className="relative z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            
            {/* ROW 1: CAMPAIGN & TV */}
            <div onClick={() => onNavigate(AppView.GAME_LIBRARY)} className="col-span-2 row-span-1 md:row-span-2 relative rounded-3xl overflow-hidden cursor-pointer group border-2 border-blue-500/30 hover:border-blue-400 transition-all shadow-[0_0_30px_rgba(59,130,246,0.15)] min-h-[150px] md:min-h-[220px]">
                <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20fantasy%20rpg%20map%20world%20islands?width=600&height=400&nologo=true')] bg-cover bg-center transition-transform duration-700 group-hover:scale-105"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                
                <div className="absolute top-4 left-4">
                    <span className="bg-blue-600/90 text-white text-[9px] font-bold px-2 py-1 rounded border border-blue-400 backdrop-blur-md shadow-lg uppercase tracking-wider">
                        Campaign Mode
                    </span>
                </div>

                <div className="absolute bottom-0 left-0 p-5 w-full">
                    <h2 className="text-3xl font-retro text-white mb-1 drop-shadow-lg group-hover:text-yellow-300 transition-colors">{t('play')}</h2>
                    <p className="text-blue-200 font-serif text-xs opacity-90 line-clamp-2">{t('journey_desc')}</p>
                    <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 w-1/3"></div>
                        </div>
                        <span className="text-[9px] text-gray-400 font-mono">33% Progress</span>
                    </div>
                </div>
            </div>
            
            <div onClick={() => onNavigate(AppView.TV)} className="col-span-2 relative rounded-2xl overflow-hidden cursor-pointer group border-2 border-red-500/30 hover:border-red-400 transition-all min-h-[100px] md:min-h-[150px]">
                <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20tv%20broadcast%20studio%20news?width=400&height=200&nologo=true')] bg-cover bg-center grayscale group-hover:grayscale-0 transition-all duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent"></div>
                
                <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded-full border border-red-500/30">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                    <span className="text-[8px] text-red-400 font-bold tracking-widest">LIVE</span>
                </div>

                <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="text-lg font-retro text-white group-hover:text-red-300 transition-colors">{t('tv')}</h3>
                    <p className="text-gray-400 text-[10px]">Community Broadcasts</p>
                </div>
            </div>

            {/* ROW 2: CORE FEATURES */}
            <MenuCard 
                onClick={() => onNavigate(AppView.MISSIONS)} 
                titleKey="menu_quests" 
                subtitleKey="menu_quests_sub" 
                bgPrompt="pixel art parchment scroll quill active quest list" 
                icon="📜"
                color="text-yellow-200"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.DEVOTIONAL)} 
                titleKey="menu_daily_bread" 
                subtitleKey="menu_daily_bread_sub" 
                bgPrompt="pixel art sunrise over open bible holy light" 
                icon="🍞"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.PLANS)} 
                titleKey="menu_plans" 
                subtitleKey="menu_plans_sub" 
                bgPrompt="pixel art winding path through mountains map" 
                icon="📅"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.BIBLE)} 
                titleKey="menu_scripture" 
                subtitleKey="menu_scripture_sub" 
                bgPrompt="pixel art ancient scroll text hebrew greek" 
                icon="📖"
            />

            {/* ROW 3: TREASURY & RANKINGS (REQUESTED LAYOUT) */}
            <MenuCard 
                onClick={() => onNavigate(AppView.TREASURY)} 
                titleKey="menu_treasury" 
                subtitleKey="menu_treasury_sub" 
                bgPrompt="pixel art massive gold vault doors fantasy treasure" 
                icon="🪙"
                color="text-green-300"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.PRAYER_ROOM)} 
                titleKey="menu_prayer_room" 
                subtitleKey="menu_prayer_room_sub" 
                bgPrompt="pixel art candle lit dark room sanctuary" 
                icon="🕯️"
                color="text-cyan-300"
                badge="UNAVAILABLE"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.LEADERBOARD)} 
                titleKey="menu_rankings" 
                subtitleKey="menu_rankings_sub" 
                bgPrompt="pixel art trophy room gold statues" 
                icon="🏆"
                color="text-yellow-400"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.DONATE)} 
                titleKey="menu_donate" 
                subtitleKey="menu_donate_sub" 
                bgPrompt="pixel art holy altar offering gold coins divine light" 
                icon="❤️"
                color="text-red-300"
            />

            {/* ROW 4: COMMUNITY & UTILS */}
            <MenuCard 
                onClick={() => onNavigate(AppView.COMMUNITY)} 
                titleKey="menu_fellowship" 
                subtitleKey="menu_fellowship_sub" 
                bgPrompt="pixel art bonfire gathering friends night" 
                icon="🔥"
                color="text-orange-200"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.ACTIVITIES)} 
                titleKey="menu_practice" 
                subtitleKey="menu_practice_sub" 
                bgPrompt="pixel art monk meditating peaceful garden" 
                icon="🧘"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.JOURNAL)} 
                titleKey="menu_journal" 
                subtitleKey="menu_journal_sub" 
                bgPrompt="pixel art open leather book diary quill cozy candlelight" 
                icon="🖋️"
                color="text-amber-200"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.BROWSER)} 
                titleKey="menu_browser" 
                subtitleKey="menu_browser_sub" 
                bgPrompt="pixel art ancient library shelves infinite scrolls" 
                icon="🌐"
                color="text-cyan-200"
            />

            {/* ROW 5: REWARDS (Wider) */}
            <MenuCard 
                onClick={() => onNavigate(AppView.RAFFLES)} 
                titleKey="menu_raffles" 
                subtitleKey="menu_raffles_sub" 
                bgPrompt="pixel art golden spinning wheel fortune carnival fantasy" 
                icon="🎟️"
                color="text-pink-300"
                colSpan="col-span-1 md:col-span-2"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.GIVEAWAYS)} 
                titleKey="menu_giveaways" 
                subtitleKey="menu_giveaways_sub" 
                bgPrompt="pixel art treasure chest opening glowing loot sparkles" 
                icon="🎁"
                color="text-purple-300"
                colSpan="col-span-1 md:col-span-2"
            />

            {/* ROW 6: FOOTER UTILS */}
            <MenuCard 
                onClick={() => onNavigate(AppView.WIKI)} 
                titleKey="menu_wiki" 
                subtitleKey="menu_wiki_sub" 
                bgPrompt="pixel art ancient magic tome book open glowing" 
                icon="📘"
                color="text-blue-200"
            />
            <MenuCard 
                onClick={() => onNavigate(AppView.SUPPORT)} 
                titleKey="menu_support" 
                subtitleKey="menu_support_sub" 
                bgPrompt="pixel art angel scribe writing scroll help desk" 
                icon="🎧"
                color="text-gray-300"
            />

        </div>

        {/* FOOTER */}
        <div className="w-full max-w-6xl mt-12 space-y-6 animate-slide-up">
          {/* Sponsor Ads */}
          <div className="bg-black/60 backdrop-blur-md border border-yellow-600/30 rounded-2xl p-6 text-center">
            <div className="text-xs text-yellow-400 font-retro uppercase tracking-widest mb-3">🎁 Sponsor Ads</div>
            <button 
              onClick={() => window.open('https://example.com/sponsors', '_blank')}
              className="text-sm text-gray-300 hover:text-yellow-300 transition-colors font-serif"
            >
              Click to Reveal Special Offers 🎁
            </button>
          </div>

          {/* Privacy & Terms */}
          <div className="flex justify-center gap-6 text-xs text-gray-500">
            <button 
              onClick={() => window.open('/privacy', '_blank')}
              className="hover:text-gray-300 transition-colors"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button 
              onClick={() => window.open('/terms', '_blank')}
              className="hover:text-gray-300 transition-colors"
            >
              Terms of Service
            </button>
          </div>
        </div>
    </div>
  );
};

export default LandingView;
