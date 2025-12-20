import React from 'react';
import Button from './Button';

interface TokenLaunchViewProps {
  onBack: () => void;
  onGoToTV: () => void;
}

const TokenLaunchView: React.FC<TokenLaunchViewProps> = ({ onBack, onGoToTV }) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center relative overflow-hidden pt-20">
      
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/cyberpunk%20space%20nebula%20purple%20green%20pixel%20art?width=1200&height=800&nologo=true')] bg-cover bg-center opacity-50"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>

      {/* Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,100,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,100,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>

      <div className="relative z-10 w-full max-w-5xl p-6 flex flex-col items-center">
        
        {/* Navigation */}
        <div className="w-full flex justify-between items-center mb-12">
           <Button onClick={onBack} variant="secondary" className="border-green-500/50 text-green-400 bg-black/50 hover:bg-green-900/30">
             ← Back to Earth
           </Button>
           <div className="bg-green-900/30 border border-green-500/50 px-3 py-1 rounded text-green-400 font-mono text-xs animate-pulse">
             ● LIVE LAUNCH IMMINENT
           </div>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-16 animate-slide-up">
           <div className="inline-block mb-4 relative">
              <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 rounded-full"></div>
              <img 
                src="https://image.pollinations.ai/prompt/pixel%20art%20gold%20coin%20with%20cross%20symbol%20shiny?width=150&height=150&nologo=true" 
                alt="Token" 
                className="w-32 h-32 md:w-48 md:h-48 relative z-10 animate-float"
              />
           </div>
           
           <h1 className="text-5xl md:text-7xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-purple-500 mb-4 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
             $JOURNEY
           </h1>
           <p className="text-xl md:text-2xl text-gray-300 font-serif max-w-2xl mx-auto">
             The first faith-based community token on Solana. 
             <br />
             <span className="text-green-400 font-bold">Invest in the Spirit.</span>
           </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-16">
           
           {/* Pump.fun Card */}
           <div className="bg-gray-900/80 p-8 rounded-xl border-4 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.2)] hover:scale-105 transition-transform group relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-500 text-black font-bold text-xs px-2 py-1">SOLANA</div>
              <h2 className="text-2xl font-retro text-white mb-2 group-hover:text-green-400">LAUNCHPAD</h2>
              <p className="text-gray-400 text-sm mb-6">
                Fair launch on <span className="text-green-400 font-bold">pump.fun</span>. No pre-sale. Community driven.
              </p>
              
              <div className="bg-black/50 p-3 rounded border border-gray-700 mb-6 font-mono text-xs text-center break-all">
                CA: Coming Soon...
              </div>

              <button className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-black font-bold py-4 rounded font-retro text-lg shadow-lg">
                 BUY ON PUMP.FUN 🚀
              </button>
           </div>

           {/* Live Stream Card */}
           <div className="bg-gray-900/80 p-8 rounded-xl border-4 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:scale-105 transition-transform flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                   <h2 className="text-2xl font-retro text-white group-hover:text-purple-400">LAUNCH PARTY</h2>
                   <span className="text-red-500 animate-ping text-xl">●</span>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Watch the dev ignite the thrusters live on Journey TV. Giveaways, roadmap reveal, and prayer.
                </p>
              </div>
              
              <div className="relative rounded-lg overflow-hidden border-2 border-gray-700 mb-6">
                 <img src="https://image.pollinations.ai/prompt/pixel%20art%20rocket%20launch%20night%20sky?width=400&height=200&nologo=true" className="w-full h-32 object-cover opacity-50" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl">📺</span>
                 </div>
              </div>

              <Button onClick={onGoToTV} className="w-full bg-purple-600 border-purple-800 hover:bg-purple-500 text-white">
                 WATCH LIVE
              </Button>
           </div>
        </div>

        {/* Disclaimer / Footer */}
        <div className="text-center max-w-2xl">
           <p className="text-gray-600 text-[10px] font-mono mb-4">
             DISCLAIMER: $JOURNEY is a community utility token for the Journey ecosystem. Cryptocurrency involves risk. Do not invest money you cannot afford to lose. This is not financial advice.
           </p>
           <p className="text-gray-500 font-retro text-xs">
             JOURNEY APP MEDIA • SOLANA NETWORK
           </p>
        </div>

      </div>
    </div>
  );
};

export default TokenLaunchView;