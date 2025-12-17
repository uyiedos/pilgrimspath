
import React, { useEffect, useState } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';

interface PilgrimsArchiveViewProps {
  onBack: () => void;
}

interface PilgrimData {
  id: string;
  username: string;
  avatar: string;
  joined_date: string;
  badges: string[];
  total_points: number;
  archetype?: string;
  collection_name?: string; // New field derived or joined
}

const PilgrimsArchiveView: React.FC<PilgrimsArchiveViewProps> = ({ onBack }) => {
  const [pilgrims, setPilgrims] = useState<PilgrimData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalHolders, setTotalHolders] = useState(0);
  const PAGE_SIZE = 24;

  useEffect(() => {
    fetchPilgrims(0);
    fetchStats();
  }, []);

  const fetchStats = async () => {
      // Get global unique holders count
      const { data } = await supabase.rpc('get_global_stats');
      if (data && data.users) {
          setTotalHolders(data.users);
      }
  };

  const fetchPilgrims = async (pageIndex: number) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar, joined_date, badges, total_points, archetype')
        .order('joined_date', { ascending: false })
        .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      
      if (pageIndex === 0) {
        setPilgrims(data as PilgrimData[]);
      } else {
        setPilgrims(prev => [...prev, ...(data as PilgrimData[])]);
      }
    } catch (err) {
      console.error("Error loading pilgrims:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPilgrims(nextPage);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://image.pollinations.ai/prompt/digital%20art%20gallery%20futuristic%20holographic%20displays?width=1200&height=800&nologo=true')] bg-cover bg-center bg-fixed">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-7xl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b-4 border-purple-800 pb-6 bg-black/40 p-6 rounded-t-xl shadow-lg relative overflow-hidden">
           <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-4 py-1 transform rotate-45 translate-x-4 translate-y-2 shadow-lg">
               LIVE
           </div>
           
           <div className="flex items-center gap-4">
              <div className="text-5xl animate-float">💠</div>
              <div>
                <h1 className="text-3xl md:text-5xl font-retro text-purple-400 drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">
                  AVATAR GALLERY
                </h1>
                <p className="text-gray-400 font-mono text-xs md:text-sm mt-2 tracking-widest uppercase">
                  Digital Souls • Minted on Faith
                </p>
              </div>
           </div>
           
           <div className="mt-4 md:mt-0 flex flex-col items-end">
               <div className="flex items-center gap-2 mb-2">
                   <div className="bg-gray-900 border border-blue-500/50 px-3 py-1 rounded text-xs font-mono text-blue-300">
                       👥 Unique Holders: {totalHolders}
                   </div>
               </div>
               <Button onClick={onBack} variant="secondary" className="bg-gray-900 border-gray-600 hover:bg-gray-800 text-xs">
                 🏠 Return Home
               </Button>
           </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in pb-12">
           {pilgrims.map((pilgrim) => {
             // Mock Collection Logic based on XP/Badges for display
             const isForged = pilgrim.badges.includes('creator') || pilgrim.total_points > 10000;
             const collectionName = isForged ? 'Forged Collection' : 'Genesis Collection';
             const rarity = pilgrim.total_points > 50000 ? 'Legendary' : pilgrim.total_points > 10000 ? 'Rare' : 'Common';
             
             return (
             <div 
               key={pilgrim.id} 
               className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 hover:border-purple-500 transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] group flex flex-col relative"
             >
                {/* Image Container */}
                <div className="aspect-square bg-black relative border-b border-gray-800">
                   <img 
                     src={pilgrim.avatar} 
                     alt={pilgrim.username} 
                     className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                     loading="lazy"
                   />
                   
                   {/* Rarity Tag */}
                   <div className="absolute top-2 right-2">
                       <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase shadow-sm ${rarity === 'Legendary' ? 'bg-yellow-600 text-white border-yellow-400' : rarity === 'Rare' ? 'bg-blue-600 text-white border-blue-400' : 'bg-gray-700 text-gray-300 border-gray-500'}`}>
                           {rarity}
                       </span>
                   </div>

                   {/* Archetype Overlay */}
                   {pilgrim.archetype && (
                       <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[9px] font-bold px-2 py-0.5 rounded border border-white/20 uppercase tracking-wide">
                           {pilgrim.archetype}
                       </div>
                   )}
                </div>

                {/* Metadata Section */}
                <div className="p-4 flex-1 flex flex-col gap-2 font-mono text-xs">
                   
                   <div className="flex justify-between items-start">
                      <div>
                          <span className="text-gray-500 text-[8px] uppercase tracking-widest block mb-0.5">{collectionName}</span>
                          <h3 className="text-white font-bold text-base truncate font-sans">{pilgrim.username}</h3>
                      </div>
                      <div className="text-right">
                          <span className="text-gray-500 text-[8px] uppercase block mb-0.5">Spirit XP</span>
                          <span className="text-purple-400 font-bold">{pilgrim.total_points.toLocaleString()}</span>
                      </div>
                   </div>

                   <div className="mt-2 bg-black/30 p-2 rounded border border-gray-800 flex justify-between items-center">
                      <span className="text-gray-500 text-[9px]">Mint #</span>
                      <span className="text-gray-300">{pilgrim.id.substring(0, 6).toUpperCase()}</span>
                   </div>
                   
                   <div className="mt-auto pt-2 flex gap-1 justify-end">
                       <button className="text-[10px] text-gray-500 hover:text-white transition-colors">Details</button>
                   </div>
                </div>
             </div>
           )})}
        </div>

        {/* Load More */}
        <div className="text-center pb-12">
           <Button 
             onClick={loadMore} 
             disabled={loading}
             className="bg-purple-900/30 border-purple-800 text-purple-200 hover:bg-purple-900"
           >
             {loading ? 'Scanning Blockchain...' : 'Load More Assets'}
           </Button>
        </div>

      </div>
    </div>
  );
};

export default PilgrimsArchiveView;
