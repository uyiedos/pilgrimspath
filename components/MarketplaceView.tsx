
import React, { useState, useEffect, useMemo } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { MarketplaceListing, User } from '../types';
import { AudioSystem } from '../utils/audio';
import { BarChart, ChartDataPoint } from './Charts';

interface MarketplaceViewProps {
  user: User | null;
  onBack: () => void;
  spendPoints: (amount: number) => Promise<boolean>;
  onAddPoints: (amount: number) => void;
  onUnlockAchievement?: (id: string) => void;
}

type MarketplaceCategory = 'all' | 'identity' | 'sanctuary' | 'scripture';
type StyleFilter = 'all' | 'modern' | 'classic';
type SortOption = 'recent' | 'price-asc' | 'price-desc' | 'xp-desc';

interface MarketActivity {
    price: number;
    collection_name: string;
    buyer: string;
    created_at: string;
}

const MarketplaceView: React.FC<MarketplaceViewProps> = ({ user, onBack, spendPoints, onAddPoints, onUnlockAchievement }) => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<MarketplaceCategory>('all');
  const [styleFilter, setStyleFilter] = useState<StyleFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [isBurning, setIsBurning] = useState(false);
  
  // Stats & Chart Data
  const [stats, setStats] = useState({ 
      volume: 0, 
      count: 0, 
      holders: 0,
      chart: [] as ChartDataPoint[],
      activity: [] as MarketActivity[]
  });

  useEffect(() => {
    fetchListings();
    fetchStats();
  }, []);

  const fetchStats = async () => {
      const { data, error } = await supabase.rpc('get_marketplace_stats');
      if (data && !error) {
          setStats({
              volume: data.volume || 0,
              count: data.count || 0,
              holders: data.holders || 0,
              chart: (data.chart || []).map((d: any) => ({ 
                label: d.label, 
                value: d.value,
                color: '#eab308' // Gold theme for artifacts
              })),
              activity: data.activity || []
          });
      }
  };

  const fetchListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select(`
        *,
        users!seller_id (username, total_points, avatar),
        avatar_history!avatar_id (id, avatar_url, style_prompt, collection_name)
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
    
    if (!confirm(`Purchase this artifact for ${listing.price.toLocaleString()} Liquid XP?\n\n💎 ASSET VALUE: This item contains ${bonusXP.toLocaleString()} XP.\n\nThis value will be added to your Net Worth (Asset XP), increasing your rank.`)) return;

    setProcessingId(listing.id);

    try {
      const { data, error } = await supabase.rpc('buy_avatar', {
        p_listing_id: listing.id,
        p_buyer_id: user.id
      });

      if (error) throw error;

      AudioSystem.playLevelComplete();
      
      // Trigger new Achievement
      if(onUnlockAchievement) onUnlockAchievement('market_trader');
      if(onUnlockAchievement) onUnlockAchievement('collector'); // Generic collector achievement

      alert(`Acquisition Complete.\n\nYour Liquid XP: -${listing.price}\nYour Asset XP: +${bonusXP}\n\nNet Worth updated.`);
      
      onAddPoints(0); 
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

  const handleBurn = async (listing: MarketplaceListing) => {
    if (!user || !listing.avatar_history) return;
    const reclaim = Math.floor((listing.attached_xp || 0) * 0.5);
    if (!confirm(`SACRED DISSOLUTION:\n\nBurn this artifact to reclaim Spirit XP?\n\nYou will receive: +${reclaim.toLocaleString()} XP\nTithe to Treasury: ${reclaim.toLocaleString()} XP\n\nTHIS ACTION WILL DELETE THE ARTIFACT FOREVER.`)) return;

    setIsBurning(true);
    try {
        const { data, error } = await supabase.rpc('burn_artifact', {
            p_artifact_id: listing.avatar_history.id,
            p_user_id: user.id
        });

        if (error) throw error;

        AudioSystem.playAchievement();
        if(onUnlockAchievement) onUnlockAchievement('burn_novice');
        
        alert(`Artifact Dissolved.\n\nNet Wealth Update:\nReclaimed: +${data.reclaimed_xp} XP\nTithe: ${data.treasury_tithe} XP`);
        
        onAddPoints(0); 
        setListings(prev => prev.filter(l => l.id !== listing.id));
        setSelectedListing(null);
        fetchStats();
    } catch (e: any) {
        alert("Dissolution failed: " + e.message);
    } finally {
        setIsBurning(false);
    }
  };

  const filteredListings = useMemo(() => {
    let result = listings.filter(l => {
        const collection = (l.avatar_history?.collection_name || '').toLowerCase();
        const matchesCategory = categoryFilter === 'all' || collection.includes(categoryFilter);
        const matchesStyle = styleFilter === 'all' || collection.includes(styleFilter);
        return matchesCategory && matchesStyle;
    });

    return result.sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'xp-desc') return (b.attached_xp || 0) - (a.attached_xp || 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Default 'recent'
    });
  }, [listings, categoryFilter, styleFilter, sortBy]);

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('identity')) return '👤';
    if (c.includes('sanctuary')) return '🏞️';
    if (c.includes('scripture')) return '📜';
    return '💎';
  };

  return (
    <div className="min-h-screen p-2 pt-16 md:p-8 md:pt-24 flex flex-col items-center relative z-10 custom-scroll bg-gray-950">
        
        {/* Background FX */}
        <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/market%20bazaar%20holographic%20cyberpunk%20stalls%20night?width=1200&height=800&nologo=true')] bg-cover bg-center opacity-30 fixed pointer-events-none"></div>
        <div className="absolute inset-0 bg-black/80 fixed pointer-events-none"></div>

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
                        {user && (user.avatar === selectedListing.avatar_history?.avatar_url || user.sanctuaryBackground === selectedListing.avatar_history?.avatar_url) && (
                            <div className="absolute top-6 left-6 bg-yellow-600 text-black font-retro text-[10px] px-4 py-2 rounded-lg border-2 border-white shadow-xl uppercase animate-pulse z-10">
                                EQUIPPED
                            </div>
                        )}
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

                            {user && (user.avatar === selectedListing.avatar_history?.avatar_url || user.sanctuaryBackground === selectedListing.avatar_history?.avatar_url) && (
                                <div className="bg-red-900/20 border-2 border-red-600/50 p-4 rounded-2xl text-center">
                                    <p className="text-red-500 font-retro text-[10px] uppercase mb-1">Status: NOT FOR SALE</p>
                                    <p className="text-gray-400 text-xs italic">Equipped artifacts are restricted from trading.</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <p className="text-[10px] text-gray-500 font-retro uppercase tracking-widest border-b border-gray-800 pb-2">Manifestation Signature</p>
                                <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-gray-800 italic font-serif text-gray-300 leading-relaxed shadow-inner">
                                    "{selectedListing.avatar_history?.style_prompt}"
                                </div>
                            </div>

                            <div className="bg-green-900/20 p-4 rounded-xl text-center">
                                <p className="font-mono text-green-400">10% Transaction Fee</p>
                                <p className="text-[10px] text-gray-500">Goes to the Global Treasury.</p>
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
                            {user && user.id === selectedListing.seller_id ? (
                                <button 
                                    onClick={() => handleBurn(selectedListing)}
                                    disabled={isBurning || user.avatar === selectedListing.avatar_history?.avatar_url || user.sanctuaryBackground === selectedListing.avatar_history?.avatar_url}
                                    className="w-full bg-red-950/40 border-2 border-red-600 text-red-500 py-6 rounded-2xl font-retro text-xs hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest shadow-lg disabled:opacity-30 disabled:hover:bg-transparent"
                                >
                                    {isBurning ? 'DISSOLVING...' : `BURN FOR +${Math.floor(selectedListing.attached_xp * 0.5)} XP`}
                                </button>
                            ) : (
                                <Button 
                                    onClick={() => handleBuy(selectedListing)}
                                    disabled={processingId === selectedListing.id}
                                    className="w-full bg-green-600 border-green-400 hover:bg-green-500 py-6 text-xl shadow-[0_0_30px_rgba(34,197,94,0.3)] animate-glow"
                                >
                                    {processingId === selectedListing.id ? 'TRANSACTING...' : `ACQUIRE ARTIFACT`}
                                </Button>
                            )}
                            <Button variant="secondary" onClick={() => setSelectedListing(null)} className="w-full py-3 text-[10px] border-gray-800">
                                Abort Protocol
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="relative w-full max-w-7xl">
            {/* Dashboard Header */}
            <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Creation Pulse Bar Chart */}
                <div className="lg:col-span-2 bg-black/30 backdrop-blur-2xl p-6 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="text-4xl animate-float">📊</div>
                            <div>
                                <h1 className="text-2xl font-retro text-yellow-500 uppercase tracking-tighter drop-shadow-md">Creation Pulse</h1>
                                <div className="flex gap-4 mt-1 text-[9px] font-mono uppercase text-gray-400 tracking-widest">
                                    <span>Artifacts Manifested (14 Days)</span>
                                    <span>•</span>
                                    <span>Holders: {stats.holders}</span>
                                </div>
                            </div>
                        </div>
                        <Button onClick={onBack} variant="secondary" className="px-4 py-2 text-xs bg-white/5 border-white/10">Back</Button>
                    </div>

                    <div className="h-40 w-full bg-black/20 rounded-2xl border border-white/5 p-4">
                        <BarChart data={stats.chart.length > 0 ? stats.chart : [{label: 'Awaiting', value: 0}]} />
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="lg:col-span-1 bg-black/30 backdrop-blur-2xl p-6 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col">
                    <h3 className="text-white font-retro text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Market Pulse
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scroll space-y-3 max-h-[180px] pr-2">
                        {stats.activity.length === 0 ? (
                            <p className="text-gray-600 text-[10px] text-center italic py-4">Scanning for trade signatures...</p>
                        ) : (
                            stats.activity.map((act, i) => (
                                <div key={i} className="flex justify-between items-center text-[10px] border-b border-white/5 pb-2 last:border-0">
                                    <div>
                                        <span className="text-white font-bold">{act.buyer}</span>
                                        <span className="text-gray-500"> acquired </span>
                                        <span className="text-purple-400 truncate max-w-[80px] inline-block align-bottom">{act.collection_name.split(' ')[1]}</span>
                                    </div>
                                    <span className="text-yellow-500 font-mono">{act.price.toLocaleString()} XP</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
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

                <div className="flex flex-col md:flex-row gap-4 border-t border-white/10 pt-4">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <span className="text-[9px] font-retro text-gray-500 uppercase flex items-center mr-2 drop-shadow-md">Style:</span>
                        {(['all', 'modern', 'classic'] as StyleFilter[]).map(s => (
                            <button
                                key={s}
                                onClick={() => { AudioSystem.playVoxelTap(); setStyleFilter(s); }}
                                className={`px-4 py-2 rounded-2xl font-bold uppercase text-[8px] md:text-[10px] transition-all border ${styleFilter === s ? 'bg-blue-600 border-blue-400 text-white shadow-md' : 'bg-black/30 backdrop-blur-md border-white/5 text-gray-500 hover:text-white'}`}
                            >
                                {s === 'modern' ? '🧊 Modern' : s === 'classic' ? '👾 Classic' : 'All'}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-2 overflow-x-auto no-scrollbar md:border-l md:border-white/10 md:pl-4">
                        <span className="text-[9px] font-retro text-gray-500 uppercase flex items-center mr-2 drop-shadow-md">Sort:</span>
                        {(['recent', 'price-asc', 'price-desc', 'xp-desc'] as SortOption[]).map(s => (
                            <button
                                key={s}
                                onClick={() => { AudioSystem.playVoxelTap(); setSortBy(s); }}
                                className={`px-4 py-2 rounded-2xl font-bold uppercase text-[8px] md:text-[10px] transition-all border ${sortBy === s ? 'bg-yellow-600 border-yellow-400 text-black shadow-md' : 'bg-black/30 backdrop-blur-md border-white/5 text-gray-500 hover:text-white'}`}
                            >
                                {s === 'recent' ? '⏳ Recent' : s === 'price-asc' ? '📉 Low' : s === 'price-desc' ? '📈 High' : '⚡ XP'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Optimized Listings Grid (3 Column on Mobile) */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 md:gap-6 pb-20">
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
                        const isEquipped = user && (user.avatar === listing.avatar_history?.avatar_url || user.sanctuaryBackground === listing.avatar_history?.avatar_url);
                        
                        return (
                        <div 
                            key={listing.id} 
                            onClick={() => { AudioSystem.playVoxelTap(); setSelectedListing(listing); }}
                            className={`bg-black/30 backdrop-blur-xl rounded-xl md:rounded-[2.5rem] overflow-hidden border transition-all hover:scale-[1.02] group flex flex-col relative ${isEquipped ? 'border-yellow-600 shadow-[0_0_15px_rgba(202,138,4,0.3)]' : 'border-white/5 hover:border-green-500 cursor-pointer hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]'}`}
                        >
                            <div className="aspect-square bg-black relative border-b border-white/5 overflow-hidden">
                                <img src={listing.avatar_history?.avatar_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                                
                                {/* Status Tags (Reduced for mobile grid) */}
                                <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                                    <span className={`text-[5px] md:text-[8px] font-bold px-1 py-0.5 rounded-sm border backdrop-blur-md uppercase shadow-lg ${styleLabel === 'Modern' ? 'bg-blue-600/80 border-blue-400 text-white' : 'bg-purple-600/80 border-purple-400 text-white'}`}>
                                        {styleLabel}
                                    </span>
                                    {isEquipped && (
                                        <span className="text-[5px] md:text-[8px] font-bold px-1 py-0.5 rounded-sm border border-white bg-yellow-600/90 text-black uppercase animate-pulse">
                                            EQP
                                        </span>
                                    )}
                                </div>

                                <div className="absolute bottom-1 right-1">
                                    <p className="text-yellow-500 font-mono text-[6px] md:text-[10px] font-bold bg-black/60 px-1 py-0.5 rounded-sm backdrop-blur-md border border-yellow-500/30 shadow-lg">
                                        +{listing.attached_xp.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="p-1.5 md:p-4 flex-1 flex flex-col gap-1 md:gap-2">
                                <div className="min-w-0">
                                    <p className="text-[5px] md:text-[7px] text-gray-500 uppercase tracking-widest font-mono truncate">Signatory</p>
                                    <p className="text-white font-bold text-[7px] md:text-xs truncate font-cinzel drop-shadow-md">{listing.users?.username}</p>
                                </div>

                                <div className="mt-auto pt-1 md:pt-3 border-t border-white/5 flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <div className="text-[8px] md:text-sm font-retro text-green-400 drop-shadow-md">
                                            {listing.price.toLocaleString()} <span className="text-[6px] md:text-[10px]">XP</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleBuy(listing); }}
                                        disabled={processingId === listing.id || isEquipped || false}
                                        className={`w-full py-1 md:py-2.5 rounded-lg md:rounded-2xl text-[6px] md:text-[10px] font-bold uppercase transition-all shadow-lg ${processingId === listing.id ? 'bg-white/10 cursor-wait' : isEquipped ? 'bg-gray-800 text-gray-500 cursor-default' : 'bg-green-600 hover:bg-green-500 text-white border border-green-400 active:scale-95'}`}
                                    >
                                        {processingId === listing.id ? '...' : isEquipped ? 'EQP' : 'Buy'}
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
