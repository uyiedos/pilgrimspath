
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { MarketplaceListing, User } from '../types';
import { AudioSystem } from '../utils/audio';

interface MarketplaceViewProps {
  user: User | null;
  onBack: () => void;
  spendPoints: (amount: number) => Promise<boolean>;
  onAddPoints: (amount: number) => void;
}

const MarketplaceView: React.FC<MarketplaceViewProps> = ({ user, onBack, spendPoints, onAddPoints }) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'genesis' | 'forged'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Stats
  const [stats, setStats] = useState({ volume: 0, count: 0, holders: 0 });

  useEffect(() => {
    fetchListings();
    fetchStats();
  }, []);

  const fetchStats = async () => {
      const { data, error } = await supabase.rpc('get_marketplace_stats');
      if (data && !error) {
          setStats(data);
      }
  };

  const fetchListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(`
        *,
        users!seller_id (username, total_points),
        avatar_history!avatar_id (avatar_url, style_prompt, collection_name)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching listings:', error);
    } else {
      setListings(data || []);
    }
    setLoading(false);
  };

  const handleBuy = async (listing: MarketplaceListing) => {
    if (!user) return alert("Login to purchase avatars.");
    if (user.id === listing.seller_id) return alert("You cannot buy your own listing.");
    if (user.id.startsWith('offline-')) return alert("Marketplace unavailable in offline mode.");

    const bonusXP = listing.attached_xp || 0;
    
    if (!confirm(`Purchase this avatar for ${listing.price} XP?\n\n⚡ POWER TRANSFER: You will absorb +${bonusXP.toLocaleString()} XP immediately!`)) return;

    setProcessingId(listing.id);

    try {
      // Client-side balance check (server does double check)
      if (user.dailyPointsEarned + user.lastDailyClaim < 0) { 
          // Just a dummy check, real check is in RPC
      }

      const { data, error } = await supabase.rpc('buy_avatar', {
        p_listing_id: listing.id,
        p_buyer_id: user.id
      });

      if (error) throw error;

      AudioSystem.playLevelComplete();
      alert(`Purchase Successful!\n\nAvatar Transferred to Vault.\n+${bonusXP.toLocaleString()} Spirit XP Absorbed!`);
      
      // Update local state implicitly via parent refresh or just optimistic
      onAddPoints(bonusXP); 
      
      // Refresh listings
      setListings(prev => prev.filter(l => l.id !== listing.id));
      fetchStats(); // Update stats
      
    } catch (e: any) {
      console.error("Purchase failed:", e);
      alert("Transaction Failed: " + (e.message || "Insufficient funds or item sold."));
    } finally {
      setProcessingId(null);
    }
  };

  const filteredListings = listings.filter(l => {
      if (filter === 'all') return true;
      const collection = l.avatar_history?.collection_name?.toLowerCase() || '';
      return collection.includes(filter);
  });

  return (
    <div className="min-h-screen bg-gray-900 p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://image.pollinations.ai/prompt/cyberpunk%20bazaar%20neon%20stalls%20pixel%20art?width=1200&height=800&nologo=true')] bg-cover bg-center bg-fixed">
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm"></div>

        <div className="relative z-10 w-full max-w-6xl">
            {/* Header with Stats */}
            <div className="mb-8 bg-black/60 p-6 rounded-xl shadow-lg border border-white/10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="text-5xl animate-pulse">🛒</div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-retro text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]">
                                MARKETPLACE
                            </h1>
                            <p className="text-gray-400 font-mono text-xs md:text-sm mt-1 uppercase tracking-widest">
                                Trade Identities • Inherit Power
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 mt-4 md:mt-0">
                        <Button onClick={onBack} variant="secondary" className="h-full">
                            🏠 Home
                        </Button>
                    </div>
                </div>

                {/* Metrics Bar */}
                <div className="grid grid-cols-3 gap-4 border-t border-gray-700 pt-4">
                    <div className="text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total Volume</p>
                        <p className="text-xl font-mono text-white">{stats.volume.toLocaleString()} XP</p>
                    </div>
                    <div className="text-center border-l border-gray-700">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active Listings</p>
                        <p className="text-xl font-mono text-yellow-400">{stats.count}</p>
                    </div>
                    <div className="text-center border-l border-gray-700">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Unique Holders</p>
                        <p className="text-xl font-mono text-blue-400">{stats.holders}</p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
                {['all', 'genesis', 'forged'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as any)}
                        className={`px-4 py-2 rounded font-bold uppercase text-xs transition-all border ${filter === f ? 'bg-green-600 border-green-400 text-white shadow-lg' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-12">
                {loading ? (
                    <div className="col-span-full text-center py-20 text-gray-500 font-retro animate-pulse">
                        Scanning the Ledger...
                    </div>
                ) : filteredListings.length === 0 ? (
                    <div className="col-span-full text-center py-20 border-4 border-dashed border-gray-800 rounded-xl bg-black/40">
                        <div className="text-4xl mb-4">🕸️</div>
                        <p className="text-gray-400 font-serif">The market is quiet. Be the first to list an avatar!</p>
                    </div>
                ) : (
                    filteredListings.map(listing => (
                        <div key={listing.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 hover:border-green-500 transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,197,94,0.2)] group flex flex-col relative">
                            {/* Avatar Image */}
                            <div className="aspect-square bg-black relative border-b border-gray-800">
                                <img 
                                    src={listing.avatar_history?.avatar_url} 
                                    className="w-full h-full object-cover" 
                                    loading="lazy"
                                />
                                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20 uppercase">
                                    {listing.avatar_history?.collection_name || 'Unknown'}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-4 flex-1 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Seller</p>
                                        <p className="text-white font-bold text-sm truncate w-24">{listing.users?.username}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Power (XP)</p>
                                        <p className="text-yellow-500 font-mono text-xs font-bold bg-yellow-900/30 px-1 rounded animate-pulse">
                                            +{listing.attached_xp.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-black/40 p-2 rounded border border-gray-800 text-[10px] text-gray-400 italic line-clamp-2">
                                    "{listing.avatar_history?.style_prompt}"
                                </div>

                                <div className="mt-auto pt-2 border-t border-gray-800 flex justify-between items-center">
                                    <div className="text-lg font-retro text-green-400">
                                        {listing.price.toLocaleString()} XP
                                    </div>
                                    <button 
                                        onClick={() => handleBuy(listing)}
                                        disabled={processingId === listing.id}
                                        className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors ${processingId === listing.id ? 'bg-gray-600 cursor-wait' : 'bg-green-600 hover:bg-green-500 text-white shadow-md'}`}
                                    >
                                        {processingId === listing.id ? 'Buying...' : 'Buy Now'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

export default MarketplaceView;
