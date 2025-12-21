
import React from 'react';
import { AppView, User } from '../types';
import { UI_TEXT, LanguageCode } from '../translations';

interface LandingViewProps {
  user: User | null;
  onNavigate: (view: AppView) => void;
  language: LanguageCode;
}

const LandingView: React.FC<LandingViewProps> = ({ user, onNavigate, language }) => {
  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT.en[key];

  return (
    <div className="min-h-full w-full bg-[#2a2420] relative flex flex-col items-center p-4 animate-fade-in">
        <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20ancient%20biblical%20map%20middle%20east%20parchment%20texture%20mountains%20rivers?width=1200&height=800&nologo=true')] bg-cover bg-center opacity-40 pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-amber-900/10 to-black/80 pointer-events-none"></div>
        
        {/* Dashboard Grid */}
        <div className="relative z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4 mb-24">
            {/* Hero Cards */}
            <div onClick={() => onNavigate(AppView.GAME_LIBRARY)} className="col-span-2 md:col-span-2 row-span-2 bg-gradient-to-br from-blue-900 to-black rounded-2xl border-4 border-blue-600/50 hover:border-yellow-400 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] group relative overflow-hidden min-h-[250px] md:min-h-[300px]">
                <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20fantasy%20map%20adventure?width=600&height=400&nologo=true')] bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                    <div className="bg-blue-600/90 text-white text-[10px] font-bold px-2 py-1 rounded inline-block mb-2 backdrop-blur-md border border-blue-400 shadow-lg">ARCADE MODE</div>
                    <h2 className="text-2xl md:text-4xl font-retro text-white mb-2 group-hover:text-yellow-300 transition-colors drop-shadow-md">{t('play')}</h2>
                    <p className="text-blue-100 font-serif text-xs md:text-sm opacity-90">Enter the stories. Walk the ancient paths.</p>
                    <div className="mt-4 flex gap-2"><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span><span className="text-[10px] text-yellow-400 font-mono">3 Campaigns Available</span></div>
                </div>
            </div>
            
            <div onClick={() => onNavigate(AppView.TV)} className="col-span-2 md:col-span-2 bg-gradient-to-br from-red-900 to-black rounded-2xl border-4 border-red-600/50 hover:border-white cursor-pointer transition-all hover:scale-[1.01] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] group relative overflow-hidden min-h-[140px]">
                <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20tv%20studio%20broadcast?width=600&height=300&nologo=true')] bg-cover bg-center opacity-30 group-hover:opacity-50 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 p-4"><h3 className="text-xl font-retro text-white group-hover:text-red-400 transition-colors">JOURNEY TV</h3><p className="text-red-200 font-serif text-xs">Live Broadcasts & Community</p></div>
                <div className="absolute top-4 right-4 flex gap-1 items-center bg-black/60 px-2 py-1 rounded-full border border-red-500/50"><span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span><span className="text-[9px] text-red-500 font-bold">LIVE</span></div>
            </div>

            {/* Utils */}
            <div onClick={() => onNavigate(AppView.MISSIONS)} className="col-span-1 bg-gray-800/80 backdrop-blur-sm border-2 border-gray-600 hover:border-yellow-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[100px] group">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">📜</span>
                <span className="text-[10px] font-retro text-gray-300 group-hover:text-yellow-400">QUESTS</span>
            </div>
            <div onClick={() => onNavigate(AppView.COMMUNITY)} className="col-span-1 bg-gray-800/80 backdrop-blur-sm border-2 border-gray-600 hover:border-orange-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[100px] group">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🔥</span>
                <span className="text-[10px] font-retro text-gray-300 group-hover:text-orange-400">FELLOWSHIP</span>
            </div>
            <div onClick={() => onNavigate(AppView.FORGE)} className="col-span-1 bg-gray-800/80 backdrop-blur-sm border-2 border-gray-600 hover:border-purple-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[100px] group">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">⚒️</span>
                <span className="text-[10px] font-retro text-gray-300 group-hover:text-purple-400">SACRED FORGE</span>
            </div>
            <div onClick={() => onNavigate(AppView.MARKETPLACE)} className="col-span-1 bg-gray-800/80 backdrop-blur-sm border-2 border-gray-600 hover:border-green-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all min-h-[100px] group">
                <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">🛒</span>
                <span className="text-[10px] font-retro text-gray-300 group-hover:text-green-400">MARKET</span>
            </div>

            {/* Daily Actions */}
            <div onClick={() => onNavigate(AppView.DEVOTIONAL)} className="col-span-1 bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-xl p-3 text-center cursor-pointer transition-all hover:-translate-y-1"><span className="text-xl block mb-1">🍞</span><span className="text-[9px] font-bold text-gray-400">Daily Bread</span></div>
            <div onClick={() => onNavigate(AppView.PLANS)} className="col-span-1 bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-xl p-3 text-center cursor-pointer transition-all hover:-translate-y-1"><span className="text-xl block mb-1">📅</span><span className="text-[9px] font-bold text-gray-400">Bible Plans</span></div>
            <div onClick={() => onNavigate(AppView.BIBLE)} className="col-span-1 bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-xl p-3 text-center cursor-pointer transition-all hover:-translate-y-1"><span className="text-xl block mb-1">📖</span><span className="text-[9px] font-bold text-gray-400">Scripture</span></div>
            <div onClick={() => onNavigate(AppView.ACTIVITIES)} className="col-span-1 bg-gray-900 border border-gray-700 hover:border-gray-500 rounded-xl p-3 text-center cursor-pointer transition-all hover:-translate-y-1"><span className="text-xl block mb-1">🧩</span><span className="text-[9px] font-bold text-gray-400">Disciplines</span></div>

            {/* Wide Banners */}
            <div onClick={() => onNavigate(AppView.STAKING)} className="col-span-2 bg-gradient-to-r from-yellow-900 to-amber-800 rounded-xl border-2 border-yellow-700/50 hover:border-yellow-400 p-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                <div className="text-yellow-100">
                    <h3 className="font-retro text-xs text-yellow-300">CELESTIAL VAULT</h3>
                    <p className="text-[9px] opacity-80">Stake XP & Earn Yield</p>
                </div>
                <span className="text-2xl animate-pulse">🏦</span>
            </div>
            
            <div onClick={() => onNavigate(AppView.PRAYER_ROOM)} className="col-span-2 bg-gradient-to-r from-cyan-900 to-blue-900 rounded-xl border-2 border-cyan-700/50 hover:border-cyan-400 p-4 flex items-center justify-between cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <div className="text-cyan-100">
                    <h3 className="font-retro text-xs text-cyan-300">PRAYER ROOM</h3>
                    <p className="text-[9px] opacity-80">Live Voice Counseling</p>
                </div>
                <span className="text-2xl animate-pulse">🕯️</span>
            </div>

            {/* Footer Row */}
            <div onClick={() => onNavigate(AppView.LEADERBOARD)} className="bg-gray-800 p-3 rounded-xl text-center cursor-pointer hover:bg-gray-700 border border-transparent hover:border-gray-500 transition-all"><span className="block text-xl">🏆</span><span className="text-[8px] uppercase font-bold text-gray-400">Rankings</span></div>
            <div onClick={() => onNavigate(AppView.TREASURY)} className="bg-gray-800 p-3 rounded-xl text-center cursor-pointer hover:bg-gray-700 border border-transparent hover:border-gray-500 transition-all"><span className="block text-xl">🏛️</span><span className="text-[8px] uppercase font-bold text-gray-400">Treasury</span></div>
            <div onClick={() => onNavigate(AppView.GIVEAWAYS)} className="bg-gray-800 p-3 rounded-xl text-center cursor-pointer hover:bg-gray-700 border border-transparent hover:border-gray-500 transition-all"><span className="block text-xl">🎁</span><span className="text-[8px] uppercase font-bold text-gray-400">Giveaways</span></div>
            <div onClick={() => onNavigate(AppView.TOKEN)} className="bg-gray-800 p-3 rounded-xl text-center cursor-pointer hover:bg-gray-700 border border-transparent hover:border-gray-500 transition-all"><span className="block text-xl">🚀</span><span className="text-[8px] uppercase font-bold text-gray-400">$JOURNEY</span></div>
            
            <div className="col-span-full flex justify-center gap-6 mt-4 text-gray-500 text-[10px] uppercase font-mono">
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
