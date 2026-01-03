
import React, { useEffect, useState } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { BarChart, ChartDataPoint } from './Charts';
import { AudioSystem } from '../utils/audio';
import { TreasuryStats } from '../types';
import { LanguageCode, UI_TEXT } from '../translations';

interface TreasuryViewProps {
  onBack: () => void;
  language?: LanguageCode;
}

const TreasuryView: React.FC<TreasuryViewProps> = ({ onBack, language = 'en' }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'rankings'>('dashboard');
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); 
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_treasury_analytics');
      if (error) throw error;
      setStats(data as TreasuryStats);
      setErrorMsg(null);
    } catch (e: any) {
      console.error("Stats Failed:", e);
      let message = "Connection Error";
      if (e instanceof Error) message = e.message;
      setErrorMsg(message);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loadingStats && !stats) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 border-8 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-8 shadow-[0_0_50px_rgba(234,179,8,0.2)]"></div>
        <h2 className="font-retro text-yellow-500 text-sm animate-pulse tracking-[0.5em] uppercase">Syncing Points...</h2>
      </div>
    );
  }

  if (errorMsg && !stats) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-red-500 font-retro text-xl mb-4">Data Error</h2>
            <div className="bg-red-900/20 border border-red-800 p-4 rounded-xl max-w-lg overflow-auto text-xs font-mono text-red-300 mx-auto">
                {errorMsg}
            </div>
            <Button onClick={() => { setLoadingStats(true); fetchStats(); }} className="mt-8">Reconnect</Button>
            <Button onClick={onBack} variant="secondary" className="mt-4">Exit</Button>
        </div>
      );
  }

  // Safe Data Mapping
  const userGrowthData: ChartDataPoint[] = (stats?.weekly_growth || []).map(w => ({
      label: w.week_label || 'Week',
      value: w.new_users || 0,
      color: '#3b82f6'
  }));

  const xpGrowthData: ChartDataPoint[] = (stats?.weekly_growth || []).map(w => ({
      label: w.week_label || 'Week',
      value: w.xp_generated || 0,
      color: '#eab308'
  }));

  const globalNetWorth = stats?.net_worth || 0;
  const liquidXP = stats?.liquid_supply || 0;
  const assetXP = stats?.asset_supply || 0;
  const stakedXP = stats?.staked_supply || 0;
  const treasuryBal = stats?.balance || 0;
  const activityCount = stats?.tx_count || 0;
  const holders = stats?.holders || [];

  return (
    <div className="min-h-screen bg-[#050508] p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center animate-fade-in custom-scroll relative">
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b,transparent)] pointer-events-none opacity-50"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid.png')] opacity-10 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-7xl">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 bg-gray-900/60 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5 shadow-2xl">
            <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_40px_rgba(234,179,8,0.3)] border-2 border-white animate-float">
                    📊
                </div>
                <div>
                    <h1 className="text-2xl md:text-4xl font-retro text-white uppercase tracking-tighter drop-shadow-md">Global Economy</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[9px] font-mono border border-green-500/30">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            LIVE TRACKING
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">v11.0</span>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                <div className="flex flex-wrap justify-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 w-full md:w-auto">
                    <button
                        onClick={() => { setActiveTab('dashboard'); AudioSystem.playVoxelTap(); }}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-retro uppercase transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => { setActiveTab('rankings'); AudioSystem.playVoxelTap(); }}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-retro uppercase transition-all whitespace-nowrap ${activeTab === 'rankings' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Rankings
                    </button>
                </div>
                <Button onClick={onBack} variant="secondary" className="w-full md:w-auto text-xs">EXIT</Button>
            </div>
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
            <div className="animate-slide-up space-y-6 pb-20">
                
                {/* HERO STATS */}
                <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <span className="text-9xl grayscale">🏛️</span>
                    </div>
                    <div className="relative z-10 text-center md:text-left">
                        <p className="text-xs font-retro text-gray-500 uppercase tracking-[0.2em] mb-2">Total Network Wealth (TVL)</p>
                        <h2 className="text-5xl md:text-7xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-white to-yellow-600 drop-shadow-xl tracking-tight">
                            {globalNetWorth.toLocaleString()} <span className="text-2xl md:text-4xl text-yellow-600/80">XP</span>
                        </h2>
                    </div>
                </div>

                {/* SUPPLY BREAKDOWN */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-black/40 border border-blue-500/20 p-6 rounded-3xl flex flex-col justify-between hover:bg-blue-900/10 transition-colors">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-3xl">💧</span>
                                <span className="text-[10px] font-retro text-blue-400 uppercase tracking-widest bg-blue-900/20 px-2 py-1 rounded">Liquid</span>
                            </div>
                            <p className="text-gray-400 text-xs">Circulating in Wallets</p>
                        </div>
                        <p className="text-2xl font-mono text-white font-bold mt-4">{liquidXP.toLocaleString()}</p>
                    </div>

                    <div className="bg-black/40 border border-purple-500/20 p-6 rounded-3xl flex flex-col justify-between hover:bg-purple-900/10 transition-colors">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-3xl">💎</span>
                                <span className="text-[10px] font-retro text-purple-400 uppercase tracking-widest bg-purple-900/20 px-2 py-1 rounded">Assets</span>
                            </div>
                            <p className="text-gray-400 text-xs">Locked in Artifacts</p>
                        </div>
                        <p className="text-2xl font-mono text-white font-bold mt-4">{assetXP.toLocaleString()}</p>
                    </div>

                    <div className="bg-black/40 border border-green-500/20 p-6 rounded-3xl flex flex-col justify-between hover:bg-green-900/10 transition-colors">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-3xl">🏦</span>
                                <span className="text-[10px] font-retro text-green-400 uppercase tracking-widest bg-green-900/20 px-2 py-1 rounded">Staked</span>
                            </div>
                            <p className="text-gray-400 text-xs">Secured in Vaults</p>
                        </div>
                        <p className="text-2xl font-mono text-white font-bold mt-4">{stakedXP.toLocaleString()}</p>
                    </div>
                </div>

                {/* TREASURY & CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-gray-900/80 p-6 rounded-3xl border border-yellow-600/30 flex flex-col justify-center text-center shadow-lg">
                        <p className="text-[10px] font-retro text-yellow-600 uppercase tracking-widest mb-2">System Treasury Revenue</p>
                        <p className="text-4xl font-mono text-white font-bold mb-4">{treasuryBal.toLocaleString()}</p>
                        <div className="text-xs text-gray-500 space-y-1">
                            <p>Total Volume: {(stats?.balance || 0 + activityCount * 100).toLocaleString()}</p>
                            <p>Transactions: {activityCount.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-black/40 border border-white/10 p-6 rounded-3xl h-80 flex flex-col">
                        <h3 className="text-sm font-retro text-gray-400 uppercase mb-6 flex justify-between items-center">
                            <span>Ecosystem Growth</span>
                            <span className="text-yellow-500 text-[10px]">XP Generated</span>
                        </h3>
                        <div className="flex-1 w-full min-h-0 min-w-0">
                            {xpGrowthData.length > 0 ? (
                                <BarChart data={xpGrowthData} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-600 text-xs font-mono">No recent activity data</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* RANKINGS TAB */}
        {activeTab === 'rankings' && (
            <div className="animate-slide-in pb-20">
                <div className="bg-black/40 border border-white/10 rounded-3xl p-8 shadow-2xl">
                    <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                        <h3 className="text-white font-retro text-lg flex items-center gap-3">
                            <span>👑</span> Top Pilgrims (Net Worth)
                        </h3>
                        <span className="text-xs text-gray-500 font-mono uppercase">Liquid + Assets + Staked</span>
                    </div>
                    
                    <div className="space-y-4">
                        {holders.length === 0 ? (
                            <p className="text-gray-500 text-center py-12 italic">No ranking data available yet.</p>
                        ) : (
                            holders.map((holder, idx) => (
                                <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-4 last:border-0 hover:bg-white/5 transition-colors p-4 rounded-2xl group">
                                    <div className="flex items-center gap-4 mb-2 md:mb-0">
                                        <div className="relative shrink-0">
                                            <img src={holder.avatar} className="w-12 h-12 rounded-2xl border-2 border-gray-800 object-cover group-hover:scale-105 transition-transform" />
                                            <div className={`absolute -top-2 -left-2 w-6 h-6 flex items-center justify-center rounded-full font-bold text-[10px] border-2 border-black ${idx < 3 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/50' : 'bg-gray-700 text-white'}`}>
                                                {idx + 1}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm group-hover:text-yellow-400 transition-colors">{holder.username}</p>
                                            <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">{holder.archetype || 'Wanderer'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[9px] text-gray-500 uppercase">Liquid</p>
                                            <p className="text-xs text-blue-400 font-mono">{(holder.liquid || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[9px] text-gray-500 uppercase">Assets</p>
                                            <p className="text-xs text-purple-400 font-mono">{(holder.assets || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-gray-500 uppercase md:hidden">Net Worth</p>
                                            <span className="text-green-400 font-mono text-lg font-bold block shadow-green-500/20 drop-shadow-sm">{(holder.net_worth || 0).toLocaleString()} XP</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default TreasuryView;
