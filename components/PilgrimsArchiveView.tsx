
import React, { useEffect, useState, useMemo } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { BADGES } from '../constants';
import { AudioSystem } from '../utils/audio';

interface PilgrimsArchiveViewProps {
  onBack: () => void;
}

type ArtifactType = 'Identity' | 'Sanctuary' | 'Scripture' | 'All';

interface ArtifactData {
  id: string;
  user_id: string;
  avatar_url: string;
  style_prompt: string;
  collection_name: string;
  created_at: string;
  attached_xp?: number;
  users?: {
    username: string;
    avatar: string;
    total_points: number;
    archetype?: string;
  };
}

const PilgrimsArchiveView: React.FC<PilgrimsArchiveViewProps> = ({ onBack }) => {
  const [artifacts, setArtifacts] = useState<ArtifactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [activeCategory, setActiveCategory] = useState<ArtifactType>('All');
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactData | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  const PAGE_SIZE = 24;

  useEffect(() => {
    fetchArtifacts(0, activeCategory);
    fetchGlobalStats();
  }, [activeCategory]);

  const fetchGlobalStats = async () => {
      const { count } = await supabase.from('avatar_history').select('*', { count: 'exact', head: true });
      if (count) setTotalCount(count);
  };

  const fetchArtifacts = async (pageIndex: number, category: ArtifactType) => {
    setLoading(true);
    try {
      let query = supabase
        .from('avatar_history')
        .select('*, users:user_id(username, avatar, total_points, archetype)')
        .order('created_at', { ascending: false });

      if (category !== 'All') {
          query = query.ilike('collection_name', `%${category}%`);
      }

      const { data, error } = await query.range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      
      if (pageIndex === 0) {
        setArtifacts(data as ArtifactData[]);
      } else {
        setArtifacts(prev => [...prev, ...(data as ArtifactData[])]);
      }
    } catch (err) {
      console.error("Error loading artifacts:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArtifacts(nextPage, activeCategory);
  };

  const handleOpenDetail = (art: ArtifactData) => {
      AudioSystem.playVoxelTap();
      setSelectedArtifact(art);
  };

  const getRarity = (points: number) => {
      if (points > 50000) return 'Legendary';
      if (points > 10000) return 'Rare';
      return 'Common';
  };

  return (
    <div className="min-h-screen bg-gray-950 p-2 pt-16 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://image.pollinations.ai/prompt/digital%20art%20gallery%20futuristic%20holographic%20displays?width=1200&height=800&nologo=true')] bg-cover bg-center bg-fixed">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>
      
      {/* Artifact Detail Modal */}
      {selectedArtifact && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in bg-black/95 overflow-y-auto custom-scroll">
              <div className="absolute inset-0 bg-purple-900/10 blur-[150px] animate-pulse"></div>
              
              <div className="relative w-full max-w-5xl bg-gray-900 border-4 border-purple-600 rounded-3xl shadow-[0_0_80px_rgba(168,85,247,0.3)] overflow-hidden flex flex-col md:flex-row animate-slide-up">
                  {/* Left: Artifact Image */}
                  <div className="w-full md:w-1/2 aspect-square bg-black relative border-b-4 md:border-b-0 md:border-r-4 border-purple-600 overflow-hidden">
                      <img src={selectedArtifact.avatar_url} className="w-full h-full object-cover" alt="Artifact" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
                      <div className="absolute bottom-6 left-6 flex flex-col gap-2">
                           <div className="bg-purple-600 text-white font-retro text-[10px] px-3 py-1.5 rounded-lg inline-block border-2 border-purple-400 shadow-xl uppercase tracking-widest animate-pulse">
                              Manifested Artifact
                           </div>
                           <div className="bg-black/60 text-gray-300 font-mono text-[8px] px-2 py-1 rounded border border-white/10 uppercase">
                              ID: {selectedArtifact.id.substring(0, 16)}
                           </div>
                      </div>
                  </div>

                  {/* Right: Metadata Details */}
                  <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col justify-between bg-gradient-to-br from-gray-900 to-black">
                      <div className="space-y-8">
                          <div>
                              <div className="flex justify-between items-start mb-2">
                                  <h2 className="text-2xl md:text-4xl font-retro text-white leading-tight uppercase tracking-tighter">
                                    {selectedArtifact.collection_name.split(' ')[1] || 'Identity'} 
                                    <span className="block text-purple-400 text-sm mt-1">{selectedArtifact.collection_name.split(' ')[0]} Grade</span>
                                  </h2>
                                  <button onClick={() => setSelectedArtifact(null)} className="text-gray-500 hover:text-white transition-colors text-2xl p-2">✕</button>
                              </div>
                              <div className="bg-black/40 p-4 rounded-xl border border-gray-800 italic font-serif text-gray-300 leading-relaxed shadow-inner">
                                 "{selectedArtifact.style_prompt}"
                              </div>
                          </div>

                          <div className="bg-yellow-900/20 p-4 rounded-xl border border-yellow-700/50 flex items-center justify-between">
                              <span className="text-yellow-500 font-retro text-xs uppercase">Intrinsic Value</span>
                              <span className="text-white font-mono font-bold text-xl">⚡ {selectedArtifact.attached_xp || 0} XP</span>
                          </div>

                          <div className="space-y-4">
                              <h4 className="text-[10px] text-gray-500 uppercase font-retro tracking-widest border-b border-gray-800 pb-2">Artifact Provenance</h4>
                              <div className="flex items-center gap-4">
                                  <img src={selectedArtifact.users?.avatar} className="w-12 h-12 rounded-xl border-2 border-gray-700" />
                                  <div>
                                      <p className="text-[9px] text-gray-600 uppercase font-mono">Creator</p>
                                      <p className="text-white font-bold font-cinzel text-lg">{selectedArtifact.users?.username}</p>
                                      <p className="text-purple-400 text-[10px] font-retro">{selectedArtifact.users?.archetype || 'Wanderer'}</p>
                                  </div>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                                  <p className="text-[9px] text-gray-500 uppercase font-retro mb-1">Creation Date</p>
                                  <p className="text-xs font-mono text-white">{new Date(selectedArtifact.created_at).toLocaleDateString()}</p>
                              </div>
                              <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                                  <p className="text-[9px] text-gray-500 uppercase font-retro mb-1">Rarity</p>
                                  <p className={`text-xs font-bold uppercase ${getRarity(selectedArtifact.users?.total_points || 0) === 'Legendary' ? 'text-yellow-500' : 'text-blue-400'}`}>
                                    {getRarity(selectedArtifact.users?.total_points || 0)}
                                  </p>
                              </div>
                          </div>
                      </div>

                      <div className="mt-10 flex gap-3">
                          <Button onClick={() => setSelectedArtifact(null)} className="flex-1 bg-purple-600 border-purple-400 hover:bg-purple-500 py-4 text-[10px] font-retro">
                              CLOSE ARCHIVE
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      <div className="relative z-10 w-full max-w-7xl">
        
        {/* Header & Categories */}
        <div className="flex flex-col gap-6 mb-8 border-b-4 border-purple-800 pb-8 bg-black/40 p-6 rounded-t-3xl shadow-lg relative overflow-hidden backdrop-blur-md">
           <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="text-4xl md:text-6xl animate-float">🏛️</div>
                <div>
                  <h1 className="text-2xl md:text-5xl font-retro text-purple-400 drop-shadow-[4px_4px_0_rgba(0,0,0,1)] uppercase tracking-tighter">
                    Sacred Artifacts
                  </h1>
                  <p className="text-gray-400 font-mono text-[9px] md:text-sm mt-1 tracking-widest uppercase">
                    The Great Registry of Forged Souls and Sanctuaries
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-3">
                  <div className="bg-gray-900 border border-purple-500/50 px-4 py-1.5 rounded-full text-xs font-mono text-purple-300 shadow-inner">
                      ● Total Manifestations: {totalCount}
                  </div>
                  <Button onClick={onBack} variant="secondary" className="bg-gray-800 border-gray-600 hover:bg-gray-700 text-[10px] py-2 px-6">
                    🏠 Return Home
                  </Button>
              </div>
           </div>

           {/* Category Filters */}
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-4 border-t border-white/5">
              {(['All', 'Identity', 'Sanctuary', 'Scripture'] as ArtifactType[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setPage(0); AudioSystem.playVoxelTap(); }}
                  className={`px-6 py-2 rounded-full font-retro text-[9px] uppercase tracking-widest border-2 transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] scale-105' : 'bg-black/40 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'}`}
                >
                  {cat}
                </button>
              ))}
           </div>
        </div>

        {/* Artifacts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6 animate-fade-in pb-12">
           {artifacts.map((art) => {
             const rarity = getRarity(art.users?.total_points || 0);
             const type = art.collection_name.split(' ')[1] || 'Identity';
             
             return (
             <div 
               key={art.id} 
               onClick={() => handleOpenDetail(art)}
               className="bg-gray-900 rounded-2xl overflow-hidden border-2 border-gray-800 hover:border-purple-500 transition-all hover:translate-y-[-4px] hover:shadow-[0_15px_30px_rgba(168,85,247,0.2)] group flex flex-col cursor-pointer relative"
             >
                {/* Visual Area */}
                <div className="aspect-square bg-black relative overflow-hidden">
                   <img 
                     src={art.avatar_url} 
                     className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700 group-hover:scale-110"
                     loading="lazy"
                   />
                   
                   {/* Gradient Overlays */}
                   <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent opacity-80"></div>
                   
                   {/* Type Indicator */}
                   <div className="absolute top-2 left-2">
                       <span className={`text-[7px] font-bold px-2 py-0.5 rounded-full border shadow-lg backdrop-blur-md uppercase tracking-tighter ${type === 'Identity' ? 'bg-blue-600/80 border-blue-400' : type === 'Sanctuary' ? 'bg-cyan-600/80 border-cyan-400' : 'bg-amber-600/80 border-amber-400'}`}>
                           {type}
                       </span>
                   </div>

                   {/* Rarity Label */}
                   <div className="absolute bottom-2 right-2">
                       <div className={`w-2 h-2 rounded-full animate-pulse shadow-lg ${rarity === 'Legendary' ? 'bg-yellow-500 shadow-yellow-500/50' : rarity === 'Rare' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-gray-500 shadow-gray-500/50'}`}></div>
                   </div>
                </div>

                {/* Metadata Area */}
                <div className="p-3 md:p-4 flex-1 flex flex-col gap-2 font-mono text-[8px] bg-gradient-to-b from-gray-900 to-black border-t border-gray-800">
                   <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0">
                          <h3 className="text-white font-bold text-[10px] md:text-xs truncate font-sans tracking-tight group-hover:text-purple-400 transition-colors">
                            {art.users?.username}
                          </h3>
                          <span className="text-gray-600 text-[7px] uppercase tracking-tighter block truncate">Creator</span>
                      </div>
                   </div>
                   
                   <div className="flex justify-between items-center pt-2 border-t border-gray-800/50">
                       <span className="text-green-400 font-bold uppercase tracking-widest">+{art.attached_xp || 0} XP</span>
                       <span className="text-gray-500">{new Date(art.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                   </div>
                </div>
             </div>
           )})}

           {/* Empty State */}
           {artifacts.length === 0 && !loading && (
               <div className="col-span-full py-32 text-center border-4 border-dashed border-gray-800 rounded-3xl opacity-30">
                   <div className="text-8xl mb-4">🌫️</div>
                   <p className="font-retro text-sm uppercase">No results found in this sector</p>
               </div>
           )}
        </div>

        {/* Load More Controller */}
        <div className="text-center pb-32">
           {loading ? (
               <div className="flex flex-col items-center gap-4 animate-pulse">
                   <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                   <p className="font-retro text-[8px] text-purple-400 uppercase tracking-[0.3em]">Reading Ledger...</p>
               </div>
           ) : (
               <Button 
                 onClick={loadMore} 
                 className="bg-purple-900/20 border-purple-700 text-purple-100 hover:bg-purple-600 hover:text-white py-4 px-12 text-[10px] font-retro relative group overflow-hidden"
               >
                 <span className="relative z-10 uppercase tracking-widest">Load More Artifacts</span>
                 <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-600/20 to-purple-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
               </Button>
           )}
        </div>

      </div>
    </div>
  );
};

export default PilgrimsArchiveView;
