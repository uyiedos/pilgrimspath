
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { User, AppView } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';

interface DonationViewProps {
  user: User | null;
  onBack: () => void;
  onNavigate: (view: AppView) => void;
  onUnlockAchievement?: (id: string) => void;
}

interface DonationFeedItem {
    name: string;
    amount: number;
    currency: string;
    created_at: string;
    reason?: string;
}

const WALLETS = [
    { symbol: 'SOL', name: 'Solana (SOL)', address: '9AozzrLpi9NNmZBKEsT2TfgFZxMUX442RQL4J5qSsBMF' },
    { symbol: 'EVM', name: 'ETH / Base / Polygon / Monad', address: '0x56A147e697ee011184B5D5Dd951F00C729441b5f' },
    { symbol: 'BTC', name: 'Bitcoin (BTC / Taproot)', address: 'bc1qdy0ut9yn77vxu0wg9an4vv4zsrjcktatp8z20w' }
];

const DonationView: React.FC<DonationViewProps> = ({ user, onBack, onNavigate, onUnlockAchievement }) => {
  const [activeTab, setActiveTab] = useState<'fiat' | 'crypto'>('crypto'); // Default to crypto now
  const [showBankDetails, setShowBankDetails] = useState(false);
  
  const [claimForm, setClaimForm] = useState({ 
      amount: '', 
      currency: 'USD', 
      txRef: '', 
      reason: '',
      donorName: '', // New Optional
      donorEmail: '' // New Optional
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feed State
  const [recentDonations, setRecentDonations] = useState<DonationFeedItem[]>([]);
  const [totalRaised, setTotalRaised] = useState(0);

  useEffect(() => {
      fetchDonationStats();
      const interval = setInterval(fetchDonationStats, 30000); // Live update
      return () => clearInterval(interval);
  }, []);

  const fetchDonationStats = async () => {
      const { data, error } = await supabase.rpc('get_public_donations');
      if (data && !error) {
          setTotalRaised(data.total_raised_usd || 0);
          setRecentDonations(data.recent || []);
      }
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      AudioSystem.playVoxelTap();
      alert("Address copied to clipboard!");
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return alert("Please sign in to confirm donation.");
      if (!claimForm.amount || !claimForm.txRef || !claimForm.reason) return alert("Please fill the required fields (Amount, Tx Ref, Reason).");

      setIsSubmitting(true);
      try {
          const { error } = await supabase.from('donation_claims').insert({
              user_id: user.id,
              email: user.email, // System email
              donor_name: claimForm.donorName || null, // Manual input
              donor_email: claimForm.donorEmail || null, // Manual input
              amount: parseFloat(claimForm.amount),
              currency: claimForm.currency,
              payment_method: activeTab,
              tx_reference: claimForm.txRef,
              reason: claimForm.reason,
              status: 'pending'
          });

          if (error) throw error;

          AudioSystem.playAchievement();
          if (onUnlockAchievement) onUnlockAchievement('generous_soul');
          
          alert("Donation Confirmed! Your offering is being verified.");
          setClaimForm({ 
              amount: '', currency: 'USD', txRef: '', reason: '', 
              donorName: '', donorEmail: '' 
          });
      } catch (err: any) {
          alert("Error submitting claim: " + err.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="h-full w-full bg-indigo-950 overflow-y-auto custom-scroll p-4 pt-20 md:p-8 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] animate-fade-in">
        
        {/* Header */}
        <div className="w-full max-w-4xl text-center mb-8 shrink-0">
            <div className="inline-block p-4 rounded-full bg-yellow-500/10 border-2 border-yellow-500 mb-4 animate-float">
                <span className="text-4xl">❤️</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-retro text-yellow-400 uppercase tracking-tighter drop-shadow-md">Kingdom Stewardship</h1>
            <p className="text-indigo-200 font-serif italic text-sm md:text-lg max-w-2xl mx-auto mt-2 mb-6">
                "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver." (2 Cor 9:7)
            </p>
            
            {/* Total Raised Banner */}
            <div className="bg-gradient-to-r from-yellow-900/40 to-indigo-900/40 border border-yellow-500/30 p-4 rounded-xl inline-block shadow-lg backdrop-blur-sm">
                <p className="text-[10px] text-yellow-200 font-retro uppercase tracking-widest mb-1">Total Contributions</p>
                <p className="text-3xl font-mono text-white font-bold">${totalRaised.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-gray-400 font-sans font-normal">(Approx)</span></p>
            </div>

            {/* Mission & Ecosystem Block */}
            <div className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 p-6 rounded-2xl border border-white/10 max-w-3xl mx-auto my-6 shadow-xl backdrop-blur-sm">
                <h3 className="text-white font-retro text-sm uppercase mb-3 flex items-center justify-center gap-2">
                    <span className="text-xl">🌱</span> Sowing into Good Ground
                </h3>
                <p className="text-gray-300 text-xs md:text-sm leading-relaxed mb-4">
                    Your donation directly supports The Journey ecosystem. We utilize transparent, verified non-profit platforms to ensure every seed sown funds <strong>strategic partnerships, community rewards, and missions</strong>.
                </p>
            </div>
        </div>

        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20 shrink-0">
            
            {/* Left Panel: Ways to Give */}
            <div className="bg-gray-900/80 border-4 border-yellow-600 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                    <span className="text-9xl grayscale">🕊️</span>
                </div>

                <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                    <button 
                        onClick={() => setActiveTab('crypto')} 
                        className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs transition-all shadow-lg ${activeTab === 'crypto' ? 'bg-blue-600 text-white border border-blue-400 shadow-blue-900/50' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        Crypto
                    </button>

                    <button 
                        onClick={() => setActiveTab('fiat')}
                        className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs transition-all shadow-lg ${activeTab === 'fiat' ? 'bg-gray-700 text-gray-300 border border-gray-500' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                    >
                        Card / Bank <span className="block text-[8px] opacity-70">(Coming Soon)</span>
                    </button>
                </div>

                {activeTab === 'fiat' && (
                    <div className="relative rounded-xl overflow-hidden">
                        {/* COMING SOON OVERLAY */}
                        <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-[3px] flex flex-col items-center justify-center text-center p-4 border-2 border-white/10 rounded-xl">
                             <div className="text-4xl mb-3 animate-bounce">🚧</div>
                             <h3 className="text-white font-retro text-lg uppercase mb-2 text-shadow">Gateway Closed</h3>
                             <p className="text-gray-300 text-xs font-serif italic max-w-xs">
                                Direct fiat integrations are currently being fortified. Please use Crypto or Manual Bank Transfer below if available.
                             </p>
                        </div>

                        {/* Blurred Content */}
                        <div className="space-y-4 animate-slide-up opacity-30 pointer-events-none select-none filter blur-[1px]">
                            <div className="bg-blue-900/20 border-l-4 border-blue-500 p-3 rounded-r-lg mb-2">
                                <p className="text-[10px] text-blue-200">
                                    <span className="font-bold">Transparent Giving:</span> Use our verified partner platforms for secure, receipted donations.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div className="bg-white hover:bg-gray-100 text-gray-900 p-4 rounded-xl border border-gray-300 transition-all group flex items-center justify-between shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">📦</span>
                                        <div className="text-left">
                                            <span className="font-bold text-sm uppercase block group-hover:text-blue-600">Donorbox</span>
                                            <span className="text-[10px] text-gray-500">Recurring & Int'l Cards</span>
                                        </div>
                                    </div>
                                    <span className="text-gray-400">↗</span>
                                </div>

                                <div className="bg-[#fbbf24] hover:bg-[#f59e0b] text-black p-4 rounded-xl border border-yellow-600 transition-all group flex items-center justify-between shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">🧈</span>
                                        <div className="text-left">
                                            <span className="font-bold text-sm uppercase block">Givebutter</span>
                                            <span className="text-[10px] opacity-80">Community Fundraising</span>
                                        </div>
                                    </div>
                                    <span className="opacity-60">↗</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'crypto' && (
                    <div className="space-y-4 animate-slide-up">
                        <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl mb-4">
                            <p className="text-blue-300 text-[10px] text-center">
                                ℹ️ Donations are processed manually. Please copy the Transaction Ref/Hash after sending and submit the form.
                            </p>
                        </div>
                        {WALLETS.map(w => (
                            <div key={w.symbol} className="bg-black/40 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group hover:border-blue-500/50 transition-colors">
                                <div className="min-w-0 flex-1">
                                    <p className="text-blue-400 text-xs font-bold uppercase mb-1">{w.name}</p>
                                    <p className="text-white font-mono text-[10px] break-all select-all">{w.address}</p>
                                </div>
                                <button onClick={() => handleCopy(w.address)} className="bg-white/5 hover:bg-white/10 p-2 rounded-lg text-gray-300 shrink-0 self-end md:self-center">
                                    📋 Copy
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Middle Panel: Claim Form */}
            <div className="bg-gray-800 p-6 rounded-3xl border-2 border-green-600/50 shadow-xl h-fit">
                <h3 className="text-green-400 font-retro text-sm uppercase mb-4 tracking-widest flex items-center gap-2">
                    <span>✅</span> Confirm Donation
                </h3>
                <p className="text-[10px] text-gray-400 mb-4 leading-tight">
                    After donating via Partner Platforms or Bank Transfer, fill this form to receive your <strong>Spirit XP</strong> reward.
                </p>
                <form onSubmit={handleSubmitClaim} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] text-gray-400 uppercase mb-1">Donor Name (Optional)</label>
                            <input 
                                type="text" 
                                className="w-full bg-black border border-gray-600 rounded-xl p-2 text-white outline-none focus:border-green-500" 
                                value={claimForm.donorName}
                                onChange={e => setClaimForm({...claimForm, donorName: e.target.value})}
                                placeholder="Your Name"
                            />
                        </div>
                        <div>
                            <label className="block text--[10px] text-gray-400 uppercase mb-1">Email (Optional)</label>
                            <input 
                                type="email" 
                                className="w-full bg-black border border-gray-600 rounded-xl p-2 text-white outline-none focus:border-green-500" 
                                value={claimForm.donorEmail}
                                onChange={e => setClaimForm({...claimForm, donorEmail: e.target.value})}
                                placeholder="For receipt"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] text-gray-400 uppercase mb-1">Amount Sent *</label>
                            <input 
                                type="number" 
                                min="0"
                                step="any"
                                className="w-full bg-black border border-gray-600 rounded-xl p-2 text-white outline-none focus:border-green-500" 
                                value={claimForm.amount}
                                onChange={e => setClaimForm({...claimForm, amount: e.target.value})}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-400 uppercase mb-1">Currency *</label>
                            <select 
                                className="w-full bg-black border border-gray-600 rounded-xl p-2 text-white outline-none"
                                value={claimForm.currency}
                                onChange={e => setClaimForm({...claimForm, currency: e.target.value})}
                            >
                                <option value="USD">USD ($)</option>
                                <option value="NGN">NGN (₦)</option>
                                <option value="SOL">SOL</option>
                                <option value="BTC">BTC</option>
                                <option value="ETH">ETH</option>
                                <option value="USDT">USDT</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-400 uppercase mb-1">Transaction Ref / Hash *</label>
                        <input 
                            type="text" 
                            className="w-full bg-black border border-gray-600 rounded-xl p-2 text-white outline-none focus:border-green-500 font-mono text-xs" 
                            value={claimForm.txRef}
                            onChange={e => setClaimForm({...claimForm, txRef: e.target.value})}
                            placeholder="e.g. Receipt # or Ref ID"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] text-gray-400 uppercase mb-1">Reason for Donation *</label>
                        <input 
                            type="text" 
                            className="w-full bg-black border border-gray-600 rounded-xl p-2 text-white outline-none focus:border-green-500 font-sans text-xs" 
                            value={claimForm.reason}
                            onChange={e => setClaimForm({...claimForm, reason: e.target.value})}
                            placeholder="e.g. Tithe, Support, Love Offering"
                            required
                        />
                    </div>
                    
                    <Button type="submit" disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-500 border-green-400 mt-4 py-4 text-sm shadow-lg">
                        {isSubmitting ? 'Verifying...' : 'Confirm Donation'}
                    </Button>
                </form>
            </div>

            {/* Right Panel: Recent Blessings Feed */}
            <div className="bg-black/40 backdrop-blur-md rounded-[2rem] border border-white/5 p-6 h-fit max-h-[500px] flex flex-col">
                <h3 className="text-yellow-500 font-retro text-sm uppercase mb-4 tracking-widest flex items-center gap-2 border-b border-white/10 pb-2">
                    <span>✨</span> Recent Blessings
                </h3>
                
                <div className="flex-1 overflow-y-auto custom-scroll space-y-3 pr-2">
                    {recentDonations.length === 0 ? (
                        <p className="text-gray-500 text-xs italic text-center py-8">Waiting for new seeds...</p>
                    ) : (
                        recentDonations.map((d, i) => (
                            <div key={i} className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center animate-slide-up">
                                <div>
                                    <p className="text-white font-bold text-xs">{d.name}</p>
                                    <p className="text-[9px] text-gray-400 font-mono">{d.reason || 'Donation'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-green-400 font-mono text-xs font-bold">+{d.amount.toLocaleString()} {d.currency}</p>
                                    <p className="text-[8px] text-gray-600">{new Date(d.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="text-center mt-4 pt-4 border-t border-white/5">
                    <Button onClick={onBack} variant="secondary" className="w-full text-xs">Back to Sanctuary</Button>
                </div>
            </div>

        </div>
    </div>
  );
};

export default DonationView;
