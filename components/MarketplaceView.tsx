
import React, { useState, useEffect, useMemo } from 'react';
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

type MarketplaceCategory = 'all' | 'identity' | 'sanctuary' | 'scripture';
type StyleFilter = 'all' | 'modern' | 'classic';

const MarketplaceView: React.FC<MarketplaceViewProps> = ({ user, onBack, spendPoints, onAddPoints }) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<MarketplaceCategory>('all');
  const [styleFilter, setStyleFilter] = useState<StyleFilter>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  
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
        users!seller_id (username, total_points, avatar),
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
    
    if (!confirm(`Purchase this artifact for ${listing.price} XP?\n\n⚡ POWER TRANSFER: You will absorb +${bonusXP.toLocaleString()} XP immediately!`)) return;

    setProcessingId(listing.id);

    try {
      const { data, error } = await supabase.rpc('buy_avatar', {
        p_listing_id: listing.id,
        p_buyer_id: user.id
      });

      if (error) throw error;

      AudioSystem.playLevelComplete();
      alert(`Purchase Successful!\n\nArtifact Transferred to Vault.\n+${bonusXP.toLocaleString()} Spirit XP Absorbed!`);
      
      onAddPoints(bonusXP); 
      setListings(prev => prev.filter(l => l.id !== listing.id));
      setSelectedListing(null);
      fetchStats(); 
      
    } catch (e: any) {
      console.error("Purchase failed:", e);
      alert("Transaction Failed: " + (e.message || "Insufficient funds or item sold."));
    } finally {
      setProcessingId(null);
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
        const collection = (l.avatar_history?.collection_name || '').toLowerCase();
        const matchesCategory = categoryFilter === 'all' || collection.includes(categoryFilter);
        const matchesStyle = styleFilter === 'all' || collection.includes(styleFilter);
        return matchesCategory && matchesStyle;
    });
  }, [listings, categoryFilter, styleFilter]);

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('identity')) return '👤';
    if (c.includes('sanctuary')) return '🏞️';
    if (c.includes('scripture')) return '📜';
    return '💎';
  };

  return (
    <div className="min-h-screen p-2 pt-16 md:p-8 md:pt-24 flex flex-col items-center relative z-10 custom-scroll">
        {/* Detail Modal */}
        {selectedListing && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 md:p-8 backdrop-blur-md animate-fade-in overflow-y-auto custom-scroll">
                <div className="absolute inset-0 bg-green-900/10 blur-[120px] animate-pulse"></div>
                
                <div className="relative w-full max-w-5xl bg-gray-900/90 backdrop-blur-2xl border-4 border-green-600 rounded-[3rem] shadow-[0_0_100px_rgba(34,197,94,0.3)] overflow-hidden flex flex-col md:flex-row animate-slide-up">
                    <div className="w-full md:w-1/2 aspect-square bg-black relative border-b-4 md:border-b-0 md:border-r-4 border-green-600">
                        <img src={selectedListing.avatar_history?.avatar_url} className="w-full h-full object-cover" alt="Artifact Preview" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        <div className="absolute bottom-6 left-6 flex flex-col gap-2">
                             <div className="bg-green-600 text-black font-retro text-[10px] px-4 py-2 rounded-lg inline-block border-2 border-green-400 shadow-xl uppercase font-bold tracking-widest animate-pulse">
                                {selectedListing.avatar_history?.collection_name?.split(' ')[0]} Manifestation
                             </div>
                             <div className="bg-black/60 text-gray-400 font-mono text-[8px] px-2 py-1 rounded border border-white/10 uppercase">
                                SERIAL: {selectedListing.id.substring(0, 12)}
                             </div>
                        </div>
                    </div>

                    <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-between bg-gradient-to-br from-gray-900 to-black">
                        <div className="space-y-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl md:text-5xl font-retro text-white uppercase tracking-tighter leading-none mb-2">
                                        {selectedListing.avatar_history?.collection_name?.split(' ')[1] || 'Identity'}
                                    </h2>
                                    <p className="text-green-500 font-retro text-xs uppercase tracking-[0.2em]">
                                        {selectedListing.avatar_history?.collection_name?.split(' ')[0]} Grade Pattern
                                    </p>
                                </div>
                                <button onClick={() => setSelectedListing(null)} className="text-gray-600 hover:text-white transition-colors text-2xl p-2">✕</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/50 p-4 rounded-2xl border border-gray-800 shadow-inner">
                                    <p className="text-[9px] text-gray-500 font-retro uppercase mb-2">Asking Price</p>
                                    <p className="text-3xl font-mono text-white font-bold">{selectedListing.price.toLocaleString()} <span className="text-xs text-gray-600">XP</span></p>
                                </div>
                                <div className="bg-green-900/20 p-4 rounded-2xl border border-green-800/50 shadow-inner">
                                    <p className="text-[9px] text-green-600 font-retro uppercase mb-2">Inscribed XP</p>
                                    <p className="text-3xl font-mono text-green-400 font-bold">+{selectedListing.attached_xp.toLocaleString()} <span className="text-xs text-green-700">XP</span></p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] text-gray-500 font-retro uppercase tracking-widest border-b border-gray-800 pb-2">Manifestation Signature</p>
                                <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-gray-800 italic font-serif text-gray-300 leading-relaxed shadow-inner">
                                    "{selectedListing.avatar_history?.style_prompt}"
                                </div>
                            </div>

                            <div className="flex items-center gap-4 pt-4">
                                <img src={selectedListing.users?.avatar} className="w-12 h-12 rounded-xl border-2 border-gray-700 shadow-xl" alt="Seller" />
                                <div>
                                    <p className="text-[8px] text-gray-600 uppercase font-mono tracking-widest">Signatory / Seller</p>
                                    <p className="text-white font-bold font-cinzel text-lg leading-tight">{selectedListing.users?.username}</p>
                                    <p className="text-blue-500 font-mono text-[9px] uppercase">{selectedListing.users?.total_points.toLocaleString()} Standing</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 flex flex-col gap-3">
                            <Button 
                                onClick={() => handleBuy(selectedListing)}
                                disabled={processingId === selectedListing.id}
                                className="w-full bg-green-600 border-green-400 hover:bg-green-500 py-6 text-xl shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-glow"
                            >
                                {processingId === selectedListing.id ? 'TRANSACTING...' : `ACQUIRE ARTIFACT`}
                            </Button>
                            <Button variant="secondary" onClick={() => setSelectedListing(null)} className="w-full py-3 text-[10px] border-gray-800">
                                Abort Protocol
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="relative w-full max-w-7xl">
            <div className="mb-4 md:mb-8 bg-black/30 backdrop-blur-2xl p-4 md:p-6 rounded-[2.5rem] shadow-2xl border border-white/10">
                <div className="flex flex-col md:flex-row justify-between items-center mb-4 md:mb-6 gap-4">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="text-3xl md:text-5xl animate-float">🛒</div>
                        <div>
                            <h1 className="text-xl md:text-5xl font-retro text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)] uppercase tracking-tighter leading-none">
                                MARKETPLACE
                            </h1>
                            <p className="text-gray-400 font-mono text-[8px] md:text-sm mt-1 uppercase tracking-widest drop-shadow-md">
                                Global Artifact Registry • Trade Souls & Spaces
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <Button onClick={onBack} variant="secondary" className="px-3 py-1.5 md:px-6 md:py-3 text-[10px] md:text-sm backdrop-blur-md bg-white/5 border-white/10">
                            🏠 Home
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 md:gap-4 border-t border-white/10 pt-4">
                    <div className="text-center">
                        <p className="text-[7px] md:text-[10px] text-gray-500 uppercase tracking-widest font-retro">Total Volume</p>
                        <p className="text-xs md:text-xl font-mono text-white drop-shadow-md">{stats.volume.toLocaleString()} XP</p>
                    </div>
                    <div className="text-center border-l border-white/10">
                        <p className="text-[7px] md:text-[10px] text-gray-500 uppercase tracking-widest font-retro">Active</p>
                        <p className="text-xs md:text-xl font-mono text-yellow-400 drop-shadow-md">{stats.count}</p>
                    </div>
                    <div className="text-center border-l border-white/10">
                        <p className="text-[7px] md:text-[10px] text-gray-500 uppercase tracking-widest font-retro">Holders</p>
                        <p className="text-xs md:text-xl font-mono text-blue-400 drop-shadow-md">{stats.holders}</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4 mb-8">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {(['all', 'identity', 'sanctuary', 'scripture'] as MarketplaceCategory[]).map(f => (
                        <button
                            key={f}
                            onClick={() => { AudioSystem.playVoxelTap(); setCategoryFilter(f); }}
                            className={`px-5 py-2.5 rounded-full font-bold uppercase text-[9px] md:text-xs transition-all border flex items-center gap-2 whitespace-nowrap ${categoryFilter === f ? 'bg-green-600 border-green-400 text-white shadow-lg' : 'bg-black/30 backdrop-blur-md border-white/5 text-gray-400 hover:bg-white/10'}`}
                        >
                            <span>{getCategoryIcon(f)}</span>
                            {f}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar border-t border-white/10 pt-4">
                    <span className="text-[9px] font-retro text-gray-500 uppercase flex items-center mr-2 drop-shadow-md">Style Filter:</span>
                    {(['all', 'modern', 'classic'] as StyleFilter[]).map(s => (
                        <button
                            key={s}
                            onClick={() => { AudioSystem.playVoxelTap(); setStyleFilter(s); }}
                            className={`px-4 py-2 rounded-2xl font-bold uppercase text-[8px] md:text-[10px] transition-all border ${styleFilter === s ? 'bg-blue-600 border-blue-400 text-white shadow-md' : 'bg-black/30 backdrop-blur-md border-white/5 text-gray-500 hover:text-white'}`}
                        >
                            {s === 'modern' ? '🧊 Modern' : s === 'classic' ? '👾 Classic' : 'All Styles'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6 pb-20">
                {loading ? (
                    <div className="col-span-full text-center py-20 text-yellow-500 font-retro animate-pulse text-xs uppercase tracking-widest">
                        Syncing the Ledger...
                    </div>
                ) : filteredListings.length === 0 ? (
                    <div className="col-span-full text-center py-20 border-4 border-dashed border-white/10 rounded-[3rem] bg-black/20 backdrop-blur-md">
                        <div className="text-5xl mb-4">🔍</div>
                        <p className="text-gray-400 font-serif italic text-xl">No artifacts found in this sector.</p>
                    </div>
                ) : (
                    filteredListings.map(listing => {
                        const colName = listing.avatar_history?.collection_name || 'Genesis Identity';
                        const styleLabel = colName.split(' ')[0];
                        return (
                        <div 
                            key={listing.id} 
                            onClick={() => { AudioSystem.playVoxelTap(); setSelectedListing(listing); }}
                            className="bg-black/30 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border-2 border-white/5 hover:border-green-500 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] group flex flex-col relative"
                        >
                            <div className="aspect-square bg-black relative border-b border-white/5 overflow-hidden">
                                <img src={listing.avatar_history?.avatar_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    <span className={`text-[6px] md:text-[8px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-md uppercase tracking-tighter shadow-lg ${styleLabel === 'Modern' ? 'bg-blue-600/80 border-blue-400 text-white' : 'bg-purple-600/80 border-purple-400 text-white'}`}>
                                        {styleLabel}
                                    </span>
                                </div>
                                <div className="absolute bottom-2 right-2">
                                    <p className="text-yellow-500 font-mono text-[8px] md:text-[10px] font-bold bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md border border-yellow-500/30 shadow-lg">
                                        +{listing.attached_xp.toLocaleString()} XP
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0">
                                        <p className="text-[7px] text-gray-500 uppercase tracking-widest font-mono">Signatory</p>
                                        <p className="text-white font-bold text-xs truncate font-cinzel drop-shadow-md">{listing.users?.username}</p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-3 border-t border-white/5 flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <div className="text-xs md:text-sm font-retro text-green-400 drop-shadow-md">
                                            {listing.price.toLocaleString()} <span className="text-[8px] md:text-[10px]">XP</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleBuy(listing); }}
                                        disabled={processingId === listing.id}
                                        className={`w-full py-2.5 rounded-2xl text-[8px] md:text-[10px] font-bold uppercase transition-all shadow-lg ${processingId === listing.id ? 'bg-white/10 cursor-wait' : 'bg-green-600 hover:bg-green-500 text-white border border-green-400 active:scale-95'}`}
                                    >
                                        {processingId === listing.id ? '...' : 'Acquire'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )})
                )}
            </div>
        </div>
    </div>
  );
};

export default MarketplaceView;
