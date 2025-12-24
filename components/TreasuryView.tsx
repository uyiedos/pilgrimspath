
import React, { useEffect, useState, useMemo } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { DonutChart, ChartDataPoint, LineChart, BarChart } from './Charts';
import { AudioSystem } from '../utils/audio';
import { TreasuryStats, LedgerTransaction } from '../types';

interface TreasuryViewProps {
  onBack: () => void;
}

// Extended interface for the new enriched data
interface EnrichedLedgerTransaction extends LedgerTransaction {
  artifact_image?: string;
  artifact_name?: string;
}

const TreasuryView: React.FC<TreasuryViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ledger' | 'holders'>('dashboard');
  
  // Stats State
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ledger State
  const [ledger, setLedger] = useState<EnrichedLedgerTransaction[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // 1. Fetch Global Stats (Once)
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Poll stats every 30s
    return () => clearInterval(interval);
  }, []);

  // 2. Fetch Ledger (Whenever filter changes or tab becomes 'ledger')
  useEffect(() => {
    if (activeTab === 'ledger') {
        fetchLedger();
    }
  }, [filter, activeTab]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_treasury_analytics');
      if (error) throw error;
      setStats(data as TreasuryStats);
      setErrorMsg(null);
    } catch (e: any) {
      console.error("Treasury Audit Failed:", e);
      // Robust Error Serialization to avoid [object Object]
      let message = "Connection Error";
      if (e instanceof Error) message = e.message;
      else if (typeof e === 'object' && e !== null) {
          try {
              message = JSON.stringify(e);
          } catch {
              message = String(e);
          }
      } else {
          message = String(e);
      }
      
      setErrorMsg(message);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchLedger = async () => {
      setLoadingLedger(true);
      try {
          const { data, error } = await supabase.rpc('get_ledger_entries', {
              p_filter: filter,
              p_limit: 50
          });
          if (error) throw error;
          setLedger(data as EnrichedLedgerTransaction[] || []);
      } catch (e) {
          console.error("Ledger Sync Failed:", e);
      } finally {
          setLoadingLedger(false);
      }
  };

  // Client-side search filtering on the fetched batch
  const displayedTxs = useMemo(() => {
      return ledger.filter(tx => {
          if (!search) return true;
          const s = search.toLowerCase();
          return (
            tx.id?.toLowerCase().includes(s) || 
            (tx.sender_name || '').toLowerCase().includes(s) ||
            (tx.receiver_name || '').toLowerCase().includes(s) ||
            (tx.type || '').toLowerCase().includes(s)
          );
      });
  }, [ledger, search]);

  const getTxStyles = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('forge')) return { icon: '⚒️', color: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30', label: 'FORGE' };
    if (t.includes('burn')) return { icon: '🔥', color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-500/30', label: 'BURN' };
    if (t.includes('sale')) return { icon: '🤝', color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30', label: 'SALE' };
    if (t.includes('reward') || t.includes('achievement')) return { icon: '✨', color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30', label: 'REWARD' };
    if (t.includes('stake')) return { icon: '🏦', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-500/30', label: 'STAKE' };
    if (t.includes('tithe') || t.includes('giveaway')) return { icon: '🪙', color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-500/30', label: 'TITHE' };
    return { icon: '📦', color: 'text-gray-400', bg: 'bg-gray-900/20', border: 'border-gray-500/30', label: type.toUpperCase() };
  };

  if (loadingStats && !stats) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <div className="w-24 h-24 border-8 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-8 shadow-[0_0_50px_rgba(234,179,8,0.2)]"></div>
        <h2 className="font-retro text-yellow-500 text-sm animate-pulse tracking-[0.5em] uppercase">Connecting to Mainnet</h2>
        <p className="text-gray-600 font-mono text-xs mt-4">Syncing Ledger Blocks...</p>
      </div>
    );
  }

  if (errorMsg && !stats) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-red-500 font-retro text-xl mb-4">Node Error</h2>
            <div className="bg-red-900/20 border border-red-800 p-4 rounded-xl max-w-lg overflow-auto text-xs font-mono text-red-300 mx-auto">
                {errorMsg}
            </div>
            <Button onClick={() => { setLoadingStats(true); fetchStats(); }} className="mt-8">Reconnect</Button>
            <Button onClick={onBack} variant="secondary" className="mt-4">Exit</Button>
        </div>
      );
  }

  const distribution: ChartDataPoint[] = [
    { label: 'Liquid', value: stats?.liquid_supply || 1, color: '#3b82f6' },
    { label: 'Artifacts', value: stats?.asset_supply || 1, color: '#a855f7' },
    { label: 'Staked', value: stats?.staked_supply || 1, color: '#10b981' },
    { label: 'Reserve', value: stats?.balance || 1, color: '#eab308' },
  ];

  const userGrowthData: ChartDataPoint[] = (stats?.weekly_growth || []).map(w => ({
      label: w.week_label,
      value: w.new_users,
      color: '#3b82f6'
  }));

  const xpGrowthData: ChartDataPoint[] = (stats?.weekly_growth || []).map(w => ({
      label: w.week_label,
      value: w.xp_generated,
      color: '#eab308'
  }));

  const txVolumeData: ChartDataPoint[] = (stats?.tx_history || []).map(t => ({
      label: t.date_label,
      value: t.tx_volume,
      color: '#22c55e'
  }));

  return (
    <div className="min-h-screen bg-[#050508] p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center animate-fade-in custom-scroll relative">
      
      {/* Background Hologram FX */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b,transparent)] pointer-events-none opacity-50"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid.png')] opacity-10 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-7xl">
        
        {/* HEADER / NAV */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 bg-gray-900/60 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5 shadow-2xl">
            <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_40px_rgba(234,179,8,0.3)] border-2 border-white animate-float">
                    🌐
                </div>
                <div>
                    <h1 className="text-2xl md:text-4xl font-retro text-white uppercase tracking-tighter drop-shadow-md">Nexus Explorer</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-[9px] font-mono border border-green-500/30">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            SYSTEM OPERATIONAL
                        </span>
                        <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest hidden md:inline-block">Height: {stats?.tx_count.toLocaleString()}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                <div className="flex flex-wrap justify-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 w-full md:w-auto">
                    {(['dashboard', 'ledger', 'holders'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); AudioSystem.playVoxelTap(); }}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-[10px] font-retro uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <Button onClick={onBack} variant="secondary" className="w-full md:w-auto">EXIT</Button>
            </div>
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
            <div className="animate-slide-up space-y-6">
                {/* MACRO STATS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-900/60 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-6xl opacity-5">💰</div>
                        <p className="text-[9px] text-gray-500 font-retro uppercase mb-1">Total Value Locked</p>
                        <p className="text-2xl font-mono text-white font-bold">{stats?.net_worth.toLocaleString()}</p>
                        <div className="mt-2 h-1 w-full bg-gray-800 rounded-full"><div className="h-full bg-blue-500 w-full animate-pulse"></div></div>
                    </div>
                    <div className="bg-gray-900/60 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-6xl opacity-5">🏛️</div>
                        <p className="text-[9px] text-gray-500 font-retro uppercase mb-1">Treasury Reserve</p>
                        <p className="text-2xl font-mono text-yellow-500 font-bold">{stats?.balance.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-900/60 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-6xl opacity-5">🌊</div>
                        <p className="text-[9px] text-gray-500 font-retro uppercase mb-1">Circulating Supply</p>
                        <p className="text-2xl font-mono text-blue-400 font-bold">{stats?.liquid_supply.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-900/60 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-6xl opacity-5">💎</div>
                        <p className="text-[9px] text-gray-500 font-retro uppercase mb-1">Asset Cap</p>
                        <p className="text-2xl font-mono text-purple-400 font-bold">{stats?.asset_supply.toLocaleString()}</p>
                    </div>
                </div>

                {/* TOKEN FLOW */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-purple-900/30 to-black p-6 rounded-3xl border border-purple-500/30 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-purple-300 font-retro uppercase">Creation (Forge)</p>
                            <p className="text-2xl font-mono text-white font-bold">+{stats?.forge_volume.toLocaleString()}</p>
                        </div>
                        <div className="text-3xl">⚒️</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-900/30 to-black p-6 rounded-3xl border border-red-500/30 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-red-300 font-retro uppercase">Destruction (Burn)</p>
                            <p className="text-2xl font-mono text-white font-bold">-{stats?.burn_volume.toLocaleString()}</p>
                        </div>
                        <div className="text-3xl">🔥</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-900/30 to-black p-6 rounded-3xl border border-green-500/30 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-green-300 font-retro uppercase">Velocity (Transfers)</p>
                            <p className="text-2xl font-mono text-white font-bold">{stats?.transfer_volume.toLocaleString()}</p>
                        </div>
                        <div className="text-3xl">💸</div>
                    </div>
                </div>

                {/* ANALYTICS CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-black/40 border border-white/10 p-6 rounded-3xl h-80 flex flex-col">
                        <h3 className="text-sm font-retro text-gray-400 uppercase mb-6 flex justify-between items-center">
                            <span>Weekly Pilgrim Growth</span>
                            <span className="text-blue-500 text-[10px]">New Users</span>
                        </h3>
                        <div className="flex-1 w-full min-h-0 min-w-0">
                            <BarChart data={userGrowthData} />
                        </div>
                    </div>

                    <div className="bg-black/40 border border-white/10 p-6 rounded-3xl h-80 flex flex-col">
                        <h3 className="text-sm font-retro text-gray-400 uppercase mb-6 flex justify-between items-center">
                            <span>Weekly Economic Expansion</span>
                            <span className="text-yellow-500 text-[10px]">XP Generated</span>
                        </h3>
                        <div className="flex-1 w-full min-h-0 min-w-0">
                            <BarChart data={xpGrowthData} />
                        </div>
                    </div>

                    <div className="col-span-1 lg:col-span-2 bg-black/40 border border-white/10 p-6 rounded-3xl h-80 flex flex-col overflow-hidden">
                        <h3 className="text-sm font-retro text-gray-400 uppercase mb-6 flex justify-between items-center">
                            <span>Daily Transaction Volume (14 Days)</span>
                            <span className="text-green-500 text-[10px]">XP Volume</span>
                        </h3>
                        <div className="flex-1 w-full min-h-0 min-w-0">
                            <BarChart data={txVolumeData} />
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* LEDGER TAB */}
        {activeTab === 'ledger' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
                <div className="lg:col-span-1 bg-black/40 p-6 rounded-3xl border border-white/10 h-fit sticky top-24">
                    <h3 className="text-white font-retro text-sm mb-4">Filter Feed</h3>
                    <div className="space-y-2">
                        {['all', 'forge', 'burn', 'sale', 'reward', 'stake', 'tithe'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-retro uppercase transition-all border ${filter === f ? 'bg-yellow-600 text-black border-yellow-500' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="mt-6">
                        <input 
                            type="text" 
                            placeholder="Search Hash..." 
                            className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-xs font-mono outline-none focus:border-yellow-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="lg:col-span-3 bg-black/40 border border-white/10 rounded-3xl p-6 min-h-[600px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-retro text-white">Live Transactions</h3>
                        <div className="flex items-center gap-2">
                            {loadingLedger && <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>}
                            <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-1 rounded border border-green-500/20">
                                {ledger.length} Block(s)
                            </span>
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        {displayedTxs.map((tx) => {
                            const styles = getTxStyles(tx.type);
                            return (
                                <div key={tx.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:bg-white/[0.08] group relative overflow-hidden">
                                    <div className="flex items-center gap-4 w-full md:w-auto z-10">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner shrink-0 ${styles.bg} ${styles.border}`}>
                                            {styles.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[9px] font-retro uppercase ${styles.color}`}>{styles.label}</span>
                                                <span className="text-[8px] text-gray-600 font-mono hidden md:inline">{tx.id}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold text-xs truncate max-w-[100px]">{tx.sender_name || 'System'}</span>
                                                <span className="text-gray-600 text-[10px]">→</span>
                                                <span className="text-white font-bold text-xs truncate max-w-[100px]">{tx.receiver_name || 'System'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Artifact Preview in Ledger */}
                                    {tx.artifact_image && (
                                        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-24 opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none">
                                            <img src={tx.artifact_image} className="h-full w-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-transparent to-gray-900"></div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center w-full md:w-auto gap-6 pl-14 md:pl-0 z-10">
                                        {tx.metadata && (
                                            <div className="hidden md:block text-[9px] text-gray-500 font-mono max-w-[200px] truncate">
                                                {tx.artifact_name ? 
                                                    <span className="text-yellow-500/80">{tx.artifact_name}</span> : 
                                                    JSON.stringify(tx.metadata).replace(/[{"}]/g, '')
                                                }
                                            </div>
                                        )}
                                        <div className="text-right">
                                            <p className="text-yellow-500 font-mono font-bold text-sm">{tx.amount.toLocaleString()} XP</p>
                                            <p className="text-[8px] text-gray-600 uppercase font-mono">{new Date(tx.created_at).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {displayedTxs.length === 0 && !loadingLedger && (
                            <div className="py-20 text-center text-gray-600 font-mono text-xs">No matching blocks found for this filter.</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* HOLDERS TAB */}
        {activeTab === 'holders' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-in">
                <div className="lg:col-span-2 bg-black/40 border border-white/10 rounded-3xl p-8">
                    <h3 className="text-white font-retro text-lg mb-6 flex items-center gap-3">
                        <span>👑</span> Top Stewards
                    </h3>
                    <div className="space-y-4">
                        {stats?.holders.map((holder, idx) => (
                            <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 hover:bg-white/5 transition-colors p-3 rounded-2xl group">
                                <div className="flex items-center gap-4">
                                    <div className="relative shrink-0">
                                        <img src={holder.avatar} className="w-12 h-12 rounded-2xl border-2 border-gray-800 object-cover" />
                                        <div className={`absolute -top-2 -left-2 w-6 h-6 flex items-center justify-center rounded-full font-bold text-[10px] border-2 border-black ${idx < 3 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}>
                                            {idx + 1}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm group-hover:text-yellow-400 transition-colors">{holder.username}</p>
                                        <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">{holder.archetype}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-green-400 font-mono text-lg font-bold block">{holder.net_worth.toLocaleString()}</span>
                                    <div className="flex gap-3 text-[8px] font-mono justify-end mt-1">
                                        <span className="text-blue-500/80">Liq: {holder.liquid.toLocaleString()}</span>
                                        <span className="text-purple-500/80">Ast: {holder.assets.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-black/40 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
                        <h4 className="text-gray-400 font-retro text-xs uppercase mb-6">Wealth Distribution</h4>
                        <div className="w-48 h-48">
                            <DonutChart data={distribution} />
                        </div>
                        <div className="mt-6 w-full space-y-2">
                            {distribution.map((d, i) => (
                                <div key={i} className="flex justify-between text-xs border-b border-white/5 pb-1">
                                    <span style={{ color: d.color }}>{d.label}</span>
                                    <span className="text-white font-mono">{d.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default TreasuryView;
