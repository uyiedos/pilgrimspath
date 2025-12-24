
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { User, Stake } from '../types';
import { AudioSystem } from '../utils/audio';

interface StakingViewProps {
  user: User | null;
  onBack: () => void;
  onAddPoints: (amount: number) => void;
  onUnlockAchievement: (id: string) => void;
}

const STAKING_TIERS = [
  { id: 'daily', label: 'Daily Flex', apy: 5, lockText: 'No Lock', desc: 'Flexible earnings, claim anytime.' },
  { id: 'weekly', label: 'Weekly Covenant', apy: 15, lockText: '7 Days', desc: 'Short-term commitment.' },
  { id: 'monthly', label: 'Monthly Vow', apy: 40, lockText: '30 Days', desc: 'High yield for the faithful.' },
  { id: 'yearly', label: 'Eternal Oath', apy: 100, lockText: '365 Days', desc: 'Maximum spiritual compounding.' },
];

const StakingView: React.FC<StakingViewProps> = ({ user, onBack, onAddPoints, onUnlockAchievement }) => {
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [amount, setAmount] = useState<number>(1000);
  const [selectedTier, setSelectedTier] = useState<string>('weekly');
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchStakes();
  }, [user]);

  const fetchStakes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('stakes')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (data) setStakes(data as Stake[]);
  };

  const handleStake = async () => {
    if (!user) return;
    if (user.id.startsWith('offline-')) return alert("Staking requires a cloud-synced account.");
    
    const fee = 100;
    if (user.totalPoints && user.totalPoints < (amount + fee)) {
        return alert(`Insufficient Funds. You need ${amount + fee} XP (Principal + Fee).`);
    }

    setLoading(true);
    try {
        const { data, error } = await supabase.rpc('stake_xp', {
            p_user_id: user.id,
            p_amount: amount,
            p_tier: selectedTier
        });

        if (error) throw error;

        AudioSystem.playLevelComplete();
        
        // Optimistic UI Feedback
        if (data.is_first_stake) {
            onUnlockAchievement('vault_novice');
        }
        if (data.is_tycoon) {
            onUnlockAchievement('vault_tycoon');
        }

        alert("Deposit Successful. Your XP is now growing in the Vault.");
        onAddPoints(0); // Refresh global state
        fetchStakes();
        setAmount(1000);
    } catch (e: any) {
        alert("Staking failed: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleClaim = async (stake: Stake) => {
      setClaimingId(stake.id);
      try {
          const { data: result, error } = await supabase.rpc('claim_stake_rewards', {
              p_stake_id: stake.id,
              p_user_id: user?.id
          });

          if (error) throw error;

          // RPC returns object now: { reward: int, is_first_claim: boolean }
          const reward = result.reward || 0;

          if (reward > 0) {
              AudioSystem.playAchievement();
              if (result.is_first_claim) {
                  onUnlockAchievement('vault_harvester');
              }
              alert(`Harvested ${reward} XP!`);
              onAddPoints(0);
              fetchStakes();
          } else {
              alert("No significant rewards accrued yet. Wait longer.");
          }
      } catch (e: any) {
          alert("Claim failed: " + e.message);
      } finally {
          setClaimingId(null);
      }
  };

  const handleUnstake = async (stake: Stake) => {
      const lockedUntil = new Date(stake.lock_end_time);
      if (new Date() < lockedUntil && stake.tier !== 'daily') {
          return alert(`Stake is locked until ${lockedUntil.toLocaleDateString()}`);
      }

      if(!confirm("Withdraw principal and remaining rewards? This stops future earning for this deposit.")) return;

      setClaimingId(stake.id);
      try {
          const { data, error } = await supabase.rpc('unstake_xp', {
              p_stake_id: stake.id,
              p_user_id: user?.id
          });

          if (error) throw error;

          AudioSystem.playLevelComplete();
          alert(`Withdrawn ${data} XP (Principal + Rewards).`);
          onAddPoints(0);
          fetchStakes();
      } catch (e: any) {
          alert("Withdrawal failed: " + e.message);
      } finally {
          setClaimingId(null);
      }
  };

  // Stats
  const totalStaked = stakes.reduce((acc, s) => acc + s.amount, 0);
  const totalEarned = stakes.reduce((acc, s) => acc + s.total_earned, 0);

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 flex flex-col items-center bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20bank%20vault%20gold%20bars%20futuristic?width=1200&height=800&nologo=true')] bg-cover bg-center bg-fixed animate-fade-in custom-scroll">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>

        <div className="relative z-10 w-full max-w-5xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 bg-gray-900/80 p-8 rounded-[2.5rem] border-b-4 border-yellow-600 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="text-6xl animate-float">🏦</div>
                    <div>
                        <h1 className="text-3xl md:text-5xl font-retro text-yellow-500 uppercase tracking-tighter">Celestial Vault</h1>
                        <p className="text-gray-400 font-mono text-xs md:text-sm mt-2 uppercase tracking-[0.2em]">High-Yield Spirit Staking</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Staked Wealth</p>
                    <p className="text-4xl font-mono text-white font-bold">{totalStaked.toLocaleString()} <span className="text-yellow-600 text-lg">XP</span></p>
                    <p className="text-green-500 text-xs font-mono mt-1">+ {totalEarned.toLocaleString()} Earned Lifetime</p>
                </div>
                <Button onClick={onBack} variant="secondary">Exit Vault</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
                
                {/* Deposit Form */}
                <div className="lg:col-span-1 bg-black/60 backdrop-blur-xl border-2 border-yellow-600/30 p-6 rounded-[2rem] h-fit">
                    <h3 className="text-white font-retro text-sm uppercase mb-6 tracking-widest border-b border-white/10 pb-2">New Deposit</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold ml-2">Amount (XP)</label>
                            <input 
                                type="number" 
                                value={amount} 
                                onChange={e => setAmount(parseInt(e.target.value))}
                                className="w-full bg-black border-2 border-gray-700 p-4 rounded-2xl text-white text-xl font-mono outline-none focus:border-yellow-500 transition-all"
                            />
                            <p className="text-[9px] text-gray-500 text-right mt-1">Available: {user?.totalPoints?.toLocaleString() || 0} XP</p>
                        </div>

                        <div>
                            <label className="text-[10px] text-gray-400 uppercase font-bold ml-2">Select Tier</label>
                            <div className="grid grid-cols-1 gap-2 mt-1">
                                {STAKING_TIERS.map(tier => (
                                    <button
                                        key={tier.id}
                                        onClick={() => { AudioSystem.playVoxelTap(); setSelectedTier(tier.id); }}
                                        className={`p-3 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${selectedTier === tier.id ? 'bg-yellow-900/40 border-yellow-500' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
                                    >
                                        <div className="flex justify-between items-center relative z-10">
                                            <span className={`font-retro text-xs uppercase ${selectedTier === tier.id ? 'text-white' : 'text-gray-400'}`}>{tier.label}</span>
                                            <span className="text-green-400 font-bold font-mono">{tier.apy}% APY</span>
                                        </div>
                                        <div className="text-[9px] text-gray-500 mt-1 relative z-10">{tier.lockText} • {tier.desc}</div>
                                        {selectedTier === tier.id && <div className="absolute inset-0 bg-yellow-500/5 z-0"></div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-yellow-900/20 p-4 rounded-xl border border-yellow-700/50 text-center">
                            <p className="text-[10px] text-yellow-200 uppercase mb-1">Estimated Yearly Return</p>
                            <p className="text-2xl font-mono text-yellow-400">+{Math.floor(amount * (STAKING_TIERS.find(t => t.id === selectedTier)?.apy || 0) / 100).toLocaleString()} XP</p>
                            <p className="text-[8px] text-gray-500 mt-2">Fee: 100 XP paid to Treasury</p>
                        </div>

                        <Button onClick={handleStake} disabled={loading} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold shadow-lg animate-glow">
                            {loading ? 'SECURING...' : 'DEPOSIT TO VAULT'}
                        </Button>
                    </div>
                </div>

                {/* Active Stakes List */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-white font-retro text-sm uppercase mb-2 tracking-widest pl-2">Active Holdings</h3>
                    
                    {stakes.length === 0 ? (
                        <div className="text-center py-20 bg-gray-900/50 border-4 border-dashed border-gray-800 rounded-[2rem]">
                            <div className="text-6xl mb-4 opacity-30">🕸️</div>
                            <p className="text-gray-500 font-serif italic">Your vault is empty.</p>
                        </div>
                    ) : (
                        stakes.map(stake => {
                            const tierInfo = STAKING_TIERS.find(t => t.id === stake.tier);
                            const lockedUntil = new Date(stake.lock_end_time);
                            const isLocked = new Date() < lockedUntil && stake.tier !== 'daily';
                            const progress = stake.tier === 'daily' ? 100 : Math.min(100, ((Date.now() - new Date(stake.start_time).getTime()) / (lockedUntil.getTime() - new Date(stake.start_time).getTime())) * 100);

                            return (
                                <div key={stake.id} className="bg-gray-900 border border-gray-700 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg hover:border-yellow-600/50 transition-colors">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="w-14 h-14 rounded-2xl bg-black border border-gray-600 flex items-center justify-center text-2xl shadow-inner">
                                            {stake.tier === 'daily' ? '📅' : stake.tier === 'yearly' ? '👑' : '⏳'}
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold font-retro text-sm uppercase">{tierInfo?.label}</h4>
                                            <p className="text-yellow-500 font-mono text-lg">{stake.amount.toLocaleString()} XP</p>
                                            <p className="text-gray-500 text-[10px] uppercase font-mono">
                                                {isLocked ? `Locked until ${lockedUntil.toLocaleDateString()}` : 'Unlocked'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Progress Bar for Locked Stakes */}
                                    {stake.tier !== 'daily' && (
                                        <div className="w-full md:w-32 h-2 bg-black rounded-full overflow-hidden border border-gray-800">
                                            <div className="h-full bg-blue-500" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 w-full md:w-auto">
                                        <button 
                                            onClick={() => handleClaim(stake)}
                                            disabled={claimingId === stake.id}
                                            className="flex-1 md:flex-none px-4 py-2 bg-green-900/30 text-green-400 border border-green-700 rounded-xl text-xs font-bold hover:bg-green-900/50 transition-colors"
                                        >
                                            HARVEST
                                        </button>
                                        <button 
                                            onClick={() => handleUnstake(stake)}
                                            disabled={isLocked || claimingId === stake.id}
                                            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${isLocked ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed' : 'bg-red-900/30 text-red-400 border-red-700 hover:bg-red-900/50'}`}
                                        >
                                            {isLocked ? 'LOCKED' : 'WITHDRAW'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

            </div>
        </div>
    </div>
  );
};

export default StakingView;
