
import React, { useEffect, useState } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { BarChart, DonutChart, ChartDataPoint } from './Charts';

interface TreasuryViewProps {
  onBack: () => void;
}

interface TreasuryStats {
  balance: number;
  volume: number;
  liquid_supply: number;
  asset_supply: number;
  net_worth: number; // Total Ecosystem Value
  tx_count: number;
  holders: Array<{
    username: string;
    avatar: string;
    net_worth: number;
    liquid: number;
    assets: number;
    archetype: string;
  }>;
  transactions: Array<{
    id: string;
    amount: number;
    type: string;
    created_at: string;
    sender_name?: string;
    sender_avatar?: string;
    receiver_name?: string;
  }>;
}

const TreasuryView: React.FC<TreasuryViewProps> = ({ onBack }) => {
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Optional: Set up real-time listener for 'transactions' table
    const channel = supabase
      .channel('public:transactions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_treasury_dashboard_stats');
      if (error) throw error;
      setStats(data as TreasuryStats);
    } catch (e) {
      console.error("Treasury Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'market_fee': return '🧾';
      case 'tithe': return '🙏';
      case 'p2p_sale': return '🤝';
      case 'forge_creation': return '⚒️';
      case 'system_fee': return '🏛️';
      case 'reward': return '🎁';
      case 'raffle_entry': return '🎟️';
      default: return '🪙';
    }
  };

  const formatType = (type: string) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <div className="text-6xl mb-4 animate-bounce">🪙</div>
        <p className="font-retro text-yellow-500 animate-pulse text-xs tracking-[0.5em]">AUDITING LEDGER...</p>
      </div>
    );
  }

  const distributionData: ChartDataPoint[] = [
    { label: 'Liquid Wallets', value: stats?.liquid_supply || 1, color: '#3b82f6' },
    { label: 'Asset Value', value: stats?.asset_supply || 1, color: '#a855f7' },
    { label: 'Treasury Reserve', value: stats?.balance || 1, color: '#eab308' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] animate-fade-in custom-scroll">
      
      {/* HEADER */}
      <div className="w-full max-w-6xl mb-8 flex flex-col md:flex-row justify-between items-center gap-6 bg-black/60 backdrop-blur-md p-6 rounded-3xl border-b-4 border-yellow-600 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-8 opacity-5">
             <span className="text-9xl grayscale">🏛️</span>
         </div>
         
         <div className="flex items-center gap-6 relative z-10">
             <div className="w-20 h-20 bg-yellow-500 rounded-2xl flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(234,179,8,0.4)] border-4 border-white animate-float">
                 🏛️
             </div>
             <div>
                 <h1 className="text-3xl md:text-5xl font-retro text-white uppercase tracking-tighter drop-shadow-md">Divine Treasury</h1>
                 <p className="text-yellow-500 font-mono text-[10px] md:text-xs mt-1 uppercase tracking-[0.3em]">Central Bank of the Spirit Network</p>
             </div>
         </div>
         <Button onClick={onBack} variant="secondary" className="relative z-10 px-8">Exit Vault</Button>
      </div>

      {/* MACRO STATS - ENHANCED FOR LIQUID VS ASSETS */}
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* CARD 1: TREASURY RESERVE */}
          <div className="bg-gradient-to-br from-yellow-900/40 to-black p-6 rounded-[2.5rem] border border-yellow-600/30 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition-colors"></div>
              <h3 className="text-yellow-500 font-retro text-[10px] uppercase tracking-widest mb-2">Treasury Holdings</h3>
              <p className="text-4xl md:text-5xl font-mono text-white font-bold tracking-tight">{stats?.balance.toLocaleString()}</p>
              <p className="text-gray-500 text-[9px] mt-2 font-mono uppercase">Fees Collected (XP)</p>
          </div>

          {/* CARD 2: TOTAL VALUE LOCKED (TVL) */}
          <div className="bg-gradient-to-br from-purple-900/40 to-black p-6 rounded-[2.5rem] border border-purple-600/30 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors"></div>
              <h3 className="text-purple-400 font-retro text-[10px] uppercase tracking-widest mb-2">Ecosystem TVL</h3>
              <p className="text-4xl md:text-5xl font-mono text-white font-bold tracking-tight">{stats?.net_worth.toLocaleString()}</p>
              <div className="flex justify-between mt-2 text-[8px] md:text-[9px] font-mono text-gray-400 uppercase">
                  <span>💧 Liq: {((stats?.liquid_supply || 0) / (stats?.net_worth || 1) * 100).toFixed(0)}%</span>
                  <span>💎 Ast: {((stats?.asset_supply || 0) / (stats?.net_worth || 1) * 100).toFixed(0)}%</span>
              </div>
          </div>

          {/* CARD 3: MARKET VOLUME */}
          <div className="bg-gradient-to-br from-green-900/40 to-black p-6 rounded-[2.5rem] border border-green-600/30 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-colors"></div>
              <h3 className="text-green-400 font-retro text-[10px] uppercase tracking-widest mb-2">Total Volume</h3>
              <p className="text-4xl md:text-5xl font-mono text-white font-bold tracking-tight">{stats?.volume.toLocaleString()}</p>
              <p className="text-gray-500 text-[9px] mt-2 font-mono uppercase">Lifetime Activity</p>
          </div>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEDGER (Left Column - Wider) */}
          <div className="lg:col-span-2 bg-black/40 backdrop-blur-md rounded-[3rem] border border-white/10 p-6 md:p-8 shadow-2xl flex flex-col h-[600px]">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-retro text-gray-200 uppercase tracking-tight flex items-center gap-2">
                      <span>📜</span> Global Ledger
                  </h3>
                  <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full text-gray-400 font-mono">{stats?.tx_count} Transactions</span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scroll pr-2 space-y-3">
                  {stats?.transactions.length === 0 ? (
                      <div className="text-center py-20 opacity-30 text-gray-500">
                          <p className="font-mono text-xs">No records found in the scroll.</p>
                      </div>
                  ) : (
                      stats?.transactions.map((tx) => (
                          <div key={tx.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-yellow-500/30 transition-all flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-black border border-white/10 flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform">
                                      {getTransactionIcon(tx.type)}
                                  </div>
                                  <div>
                                      <p className="text-white text-xs font-bold font-serif mb-0.5">{formatType(tx.type)}</p>
                                      <p className="text-[10px] text-gray-500 font-mono">
                                          {tx.sender_name || 'System'} {tx.receiver_name ? `→ ${tx.receiver_name}` : ''}
                                      </p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="text-yellow-400 font-mono font-bold text-sm">+{tx.amount.toLocaleString()}</p>
                                  <p className="text-[9px] text-gray-600">{new Date(tx.created_at).toLocaleDateString()}</p>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* ANALYTICS (Right Column) */}
          <div className="space-y-8">
              {/* Distribution Chart */}
              <div className="bg-black/40 backdrop-blur-md rounded-[3rem] border border-white/10 p-8 shadow-2xl flex flex-col items-center">
                  <h4 className="text-gray-400 font-retro text-[10px] uppercase mb-6 tracking-widest">Economy Distribution</h4>
                  <div className="h-48 w-full">
                      <DonutChart data={distributionData} />
                  </div>
              </div>

              {/* Whale Watch - Top Stewards */}
              <div className="bg-black/40 backdrop-blur-md rounded-[3rem] border border-white/10 p-8 shadow-2xl flex-1">
                  <h4 className="text-purple-400 font-retro text-[10px] uppercase mb-6 tracking-widest border-b border-white/10 pb-2">Top Stewards (Net Worth)</h4>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scroll pr-2">
                      {stats?.holders.map((holder, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-white/5 pb-2 last:border-0">
                              <div className="flex items-center gap-3">
                                  <div className="relative">
                                      <img src={holder.avatar} className="w-8 h-8 rounded-lg border border-gray-600" />
                                      <div className="absolute -top-1 -left-1 bg-purple-600 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                                          {idx + 1}
                                      </div>
                                  </div>
                                  <div>
                                      <p className="text-gray-200 text-xs font-bold">{holder.username}</p>
                                      <div className="flex gap-2 text-[8px] font-mono">
                                          <span className="text-blue-400">💧 {holder.liquid.toLocaleString()}</span>
                                          <span className="text-purple-400">💎 {holder.assets.toLocaleString()}</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <span className="text-white font-mono text-xs font-bold block">{holder.net_worth.toLocaleString()}</span>
                                  <span className="text-[8px] text-gray-500 uppercase">Total Value</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

      </div>
    </div>
  );
};

export default TreasuryView;
