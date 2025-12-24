
import React from 'react';
import Button from './Button';
import { AppView } from '../types';

interface TokenLaunchViewProps {
  onBack: () => void;
  onGoToTV: () => void;
  onNavigate: (view: AppView) => void;
}

const TokenLaunchView: React.FC<TokenLaunchViewProps> = ({ onBack, onGoToTV, onNavigate }) => {
  return (
    <div className="h-full w-full bg-black flex flex-col items-center relative overflow-y-auto custom-scroll pt-20 pb-20">
      
      {/* Animated Background */}
      <div className="fixed inset-0 bg-[url('https://image.pollinations.ai/prompt/cyberpunk%20space%20nebula%20purple%20green%20pixel%20art?width=1200&height=800&nologo=true')] bg-cover bg-center opacity-40 pointer-events-none"></div>
      <div className="fixed inset-0 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none"></div>

      {/* Grid Overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,255,100,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,100,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-5xl p-6 flex flex-col items-center">
        
        {/* Navigation */}
        <div className="w-full flex justify-between items-center mb-12">
           <Button onClick={onBack} variant="secondary" className="border-green-500/50 text-green-400 bg-black/50 hover:bg-green-900/30">
             ← Back to Earth
           </Button>
           <div className="bg-green-900/30 border border-green-500/50 px-3 py-1 rounded text-green-400 font-mono text-xs animate-pulse">
             ● SOLANA NETWORK LIVE
           </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16 animate-slide-up">
           <div className="inline-block mb-6 relative group">
              <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
              <img 
                src="https://image.pollinations.ai/prompt/pixel%20art%20gold%20coin%20with%20cross%20symbol%20shiny?width=200&height=200&nologo=true" 
                alt="Token" 
                className="w-32 h-32 md:w-48 md:h-48 relative z-10 animate-float"
              />
           </div>
           
           <h1 className="text-5xl md:text-7xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-4 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]">
             $JOURNEY
           </h1>
           <p className="text-xl md:text-2xl text-gray-300 font-serif max-w-2xl mx-auto leading-relaxed">
             The spiritual currency of the metaverse. <br/>
             <span className="text-green-400 font-bold">Rewards. Utility. Eternity.</span>
           </p>
        </div>

        {/* TOKENOMICS GRID */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 animate-fade-in">
            <div className="bg-gray-900/80 border-2 border-green-500/30 p-6 rounded-2xl text-center backdrop-blur-md">
                <p className="text-gray-500 text-[10px] uppercase font-retro mb-2">Total Supply</p>
                <p className="text-green-400 font-mono text-xl md:text-2xl font-bold">1 BILLION</p>
            </div>
            <div className="bg-gray-900/80 border-2 border-green-500/30 p-6 rounded-2xl text-center backdrop-blur-md">
                <p className="text-gray-500 text-[10px] uppercase font-retro mb-2">Taxes</p>
                <p className="text-green-400 font-mono text-xl md:text-2xl font-bold">0% / 0%</p>
                <p className="text-[9px] text-gray-400">Buy / Sell</p>
            </div>
            <div className="bg-gray-900/80 border-2 border-green-500/30 p-6 rounded-2xl text-center backdrop-blur-md">
                <p className="text-gray-500 text-[10px] uppercase font-retro mb-2">Liquidity</p>
                <p className="text-red-400 font-mono text-xl md:text-2xl font-bold">BURNT 🔥</p>
                <p className="text-[9px] text-gray-400">100% Permanently Locked</p>
            </div>
            <div className="bg-gray-900/80 border-2 border-green-500/30 p-6 rounded-2xl text-center backdrop-blur-md">
                <p className="text-gray-500 text-[10px] uppercase font-retro mb-2">Authority</p>
                <p className="text-blue-400 font-mono text-xl md:text-2xl font-bold">REVOKED 🛑</p>
                <p className="text-[9px] text-gray-400">Community Owned</p>
            </div>
        </div>

        {/* UTILITY & ECOSYSTEM */}
        <div className="w-full max-w-4xl mb-16 space-y-8">
            <h2 className="text-3xl font-retro text-white text-center uppercase tracking-widest border-b border-white/10 pb-4">Divine Utility</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/60 p-6 rounded-2xl border border-white/10 hover:border-green-500 transition-colors group">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">💎</div>
                    <h3 className="text-green-400 font-bold font-mono uppercase mb-2">Reward Token</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Earn $JOURNEY through faithful participation, leaderboard dominance, and sacred artifact creation.
                    </p>
                </div>
                <div className="bg-black/60 p-6 rounded-2xl border border-white/10 hover:border-purple-500 transition-colors group">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🏛️</div>
                    <h3 className="text-purple-400 font-bold font-mono uppercase mb-2">Ecosystem Fund</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Transaction fees from the Marketplace and Raffles maintain the Treasury and fund global ministry partnerships.
                    </p>
                </div>
                <div className="bg-black/60 p-6 rounded-2xl border border-white/10 hover:border-yellow-500 transition-colors group">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">⚖️</div>
                    <h3 className="text-yellow-400 font-bold font-mono uppercase mb-2">Governance</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Holders vote on future campaigns, charity allocations, and platform upgrades.
                    </p>
                </div>
            </div>
        </div>

        {/* SACRIFICE / JOIN SECTION */}
        <div className="w-full max-w-3xl bg-gradient-to-br from-yellow-900/40 to-black p-8 md:p-12 rounded-[3rem] border-4 border-yellow-600 shadow-[0_0_60px_rgba(234,179,8,0.2)] text-center relative overflow-hidden mb-16">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
            
            <div className="relative z-10">
                <div className="text-6xl mb-6 animate-pulse">🩸</div>
                <h2 className="text-3xl md:text-5xl font-retro text-yellow-500 uppercase mb-4 tracking-tighter">The Offering</h2>
                <p className="text-gray-300 font-serif text-lg md:text-xl mb-8 max-w-xl mx-auto">
                    To join the inner circle and gain early access to token allocations, you must demonstrate conviction. 
                    <br/><br/>
                    <span className="text-white font-bold">Make a sacrifice at the Altar.</span>
                </p>

                <button 
                    onClick={() => onNavigate(AppView.DONATE)}
                    className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-4 px-12 rounded-full font-retro text-lg shadow-[0_0_30px_rgba(234,179,8,0.5)] transition-all hover:scale-105 active:scale-95 border-2 border-white/20"
                >
                    GO TO ALTAR (SACRIFICE)
                </button>
                <p className="text-[10px] text-yellow-700 font-mono mt-4 uppercase tracking-widest">
                    * Donations are recorded on-chain for whitelist priority
                </p>
            </div>
        </div>

        {/* Fun / Meme Footer */}
        <div className="text-center max-w-2xl opacity-60 hover:opacity-100 transition-opacity">
           <p className="text-gray-600 text-[10px] font-mono mb-4">
             CA: 9AozzrLpi9NNmZBKEsT2TfgFZxMUX442RQL4J5qSsBMF <br/>
             (Dev wallet held by the Spirit)
           </p>
           <p className="text-gray-500 font-retro text-xs">
             JOURNEY APP MEDIA • SOLANA NETWORK • 2025
           </p>
        </div>

      </div>
    </div>
  );
};

export default TokenLaunchView;
