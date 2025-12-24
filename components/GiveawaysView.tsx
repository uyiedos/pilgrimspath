
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { User, Giveaway } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { getGeminiClient } from '../services/geminiService';
import TicketPurchaseModal from './TicketPurchaseModal';

interface GiveawaysViewProps {
  user: User | null;
  onBack: () => void;
  onAddPoints: (amount: number) => void;
  onSync?: () => void;
}

const GiveawaysView: React.FC<GiveawaysViewProps> = ({ user, onBack, onAddPoints, onSync }) => {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  
  // Purchase Modal State
  const [selectedGiveaway, setSelectedGiveaway] = useState<Giveaway | null>(null);
  
  // Track my participation
  const [myEntries, setMyEntries] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [entryFee, setEntryFee] = useState(100);
  const [winnersCount, setWinnersCount] = useState(1);
  const [duration, setDuration] = useState(24);
  const [giveawayType, setGiveawayType] = useState<'standard' | 'crypto' | 'nft' | 'avatar'>('standard');
  const [isVested, setIsVested] = useState(false);
  const [socialLink, setSocialLink] = useState('');
  
  const [customImageUrl, setCustomImageUrl] = useState('');
  
  // Avatar Selection State
  const [myArtifacts, setMyArtifacts] = useState<any[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string>('');
  const [selectedArtifactImage, setSelectedArtifactImage] = useState<string>('');

  useEffect(() => {
    fetchGiveaways();
    if (user) {
        fetchUserParticipation();
        fetchMyArtifacts();
    }
  }, [user]);

  const fetchGiveaways = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('giveaways')
      .select('*, users:poster_id(username, avatar)')
      .order('created_at', { ascending: false });
    
    if (data && !error) setGiveaways(data);
    setLoading(false);
  };

  const fetchUserParticipation = async () => {
    if (!user) return;
    const { data } = await supabase
        .from('giveaway_participants')
        .select('giveaway_id, entry_count')
        .eq('user_id', user.id);
    
    if (data) {
        const entryMap: Record<string, number> = {};
        data.forEach((row: any) => {
            entryMap[row.giveaway_id] = row.entry_count || 1;
        });
        setMyEntries(entryMap);
    }
  };

  const fetchMyArtifacts = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('avatar_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setMyArtifacts(data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (user.id.startsWith('offline-')) { alert("Login to host giveaways."); return; }
    
    if (giveawayType === 'avatar' && !selectedArtifactId) {
        alert("Please select an artifact to give away.");
        return;
    }

    setIsProcessing(true);
    try {
        const endDateTime = new Date(Date.now() + duration * 60 * 60 * 1000).toISOString();
        
        let imageUrl = '';
        if (giveawayType === 'avatar') {
            imageUrl = selectedArtifactImage;
        } else if (customImageUrl) {
            imageUrl = customImageUrl;
        } else {
            const imagePrompt = `high quality pixel art spiritual treasure chest, glowing holy light, golden ornate details`;
            imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=400&height=300&nologo=true`;
        }

        const { error } = await supabase.rpc('create_giveaway', {
            p_title: title,
            p_desc: desc,
            p_image: imageUrl,
            p_fee: entryFee,
            p_winners: winnersCount,
            p_end: endDateTime,
            p_poster_id: user.id,
            p_type: giveawayType,
            p_is_vested: isVested,
            p_prize_asset_id: selectedArtifactId || null,
            p_social_link: socialLink || null
        });

        if (error) throw error;
        
        AudioSystem.playAchievement();
        alert("Giveaway Live!");
        if (onSync) onSync();
        setShowCreate(false);
        fetchGiveaways();
    } catch (err: any) {
        alert(err.message || "Failed to create giveaway.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handlePurchaseTickets = async (quantity: number) => {
    if (!user || !selectedGiveaway) return;
    
    setIsProcessing(true);
    try {
        const { error } = await supabase.rpc('enter_giveaway', {
            p_giveaway_id: selectedGiveaway.id,
            p_user_id: user.id,
            p_quantity: quantity
        });

        if (error) throw error;

        // Update local state immediately
        const newCount = (myEntries[selectedGiveaway.id] || 0) + quantity;
        setMyEntries(prev => ({
            ...prev,
            [selectedGiveaway.id]: newCount
        }));

        if (onSync) onSync();
        AudioSystem.playVoxelTap();
        alert(`Success! ${quantity} Ticket(s) Secured!`);
        fetchGiveaways();
        setSelectedGiveaway(null);
    } catch (err: any) {
        alert(err.message || "Entry failed. Check your XP balance.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleOpenPurchase = (giveaway: Giveaway) => {
      if (!user) return alert("Login to enter giveaways.");
      if (user.id === giveaway.poster_id) return alert("You cannot enter your own giveaway.");
      AudioSystem.playVoxelTap();
      setSelectedGiveaway(giveaway);
  };

  const handleAIDraw = async (giveaway: Giveaway) => {
    if (giveaway.status === 'drawn') return;
    setIsProcessing(true);
    try {
        const { data: drawResult, error } = await supabase.rpc('draw_giveaway_winner', {
            p_giveaway_id: giveaway.id
        });

        if (error) throw error;
        if (!drawResult.success) throw new Error(drawResult.message);

        const winnerName = drawResult.winner_name || "a faithful pilgrim";
        const ai = getGeminiClient();
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [{ parts: [{ text: `The giveaway "${giveaway.title}" has ended. Winner: ${winnerName}. Write a short 1 sentence blessing.` }] }]
        });

        await supabase.from('chat_messages').insert({
            user_id: user?.id || giveaway.poster_id,
            username: 'SYSTEM_PRIEST',
            message: `✨ RAFFLE RESULT: ${aiResponse.text || "Blessings to the winner."}`,
            type: 'milestone'
        });

        AudioSystem.playLevelComplete();
        alert(`Winner: ${winnerName}`);
        fetchGiveaways();
    } catch (e: any) {
        alert("Draw failed: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] animate-fade-in custom-scroll">
      
      {/* MODAL IS HERE */}
      {selectedGiveaway && user && (
          <TicketPurchaseModal 
            title={selectedGiveaway.title}
            pricePerTicket={selectedGiveaway.entry_fee}
            userBalance={user.totalPoints || 0}
            onConfirm={handlePurchaseTickets}
            onClose={() => setSelectedGiveaway(null)}
            isProcessing={isProcessing}
          />
      )}

      <div className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6 mb-12 bg-gray-900/90 p-8 rounded-3xl border-b-4 border-yellow-500 shadow-2xl relative">
          <div className="flex items-center gap-6">
              <div className="text-6xl animate-float">🎁</div>
              <div>
                  <h1 className="text-3xl md:text-5xl font-retro text-yellow-500 uppercase tracking-tighter">Sanctuary Raffles</h1>
                  <p className="text-gray-400 font-mono text-xs md:text-sm mt-2 uppercase tracking-[0.2em]">Weighted Giveaways & Gifts</p>
              </div>
          </div>
          <div className="flex gap-3">
              <Button onClick={() => setShowCreate(true)} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold border-yellow-400">
                + Host Giveaway
              </Button>
              <Button onClick={onBack} variant="secondary">🏠 Home</Button>
          </div>
      </div>

      {showCreate && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-md">
              <div className="bg-gray-900 border-4 border-yellow-600 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative overflow-y-auto max-h-[90vh]">
                  <button onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button>
                  <h2 className="text-3xl font-retro text-white mb-6 uppercase">Host a Giveaway</h2>
                  <form onSubmit={handleCreate} className="space-y-4">
                      {/* Simplified form */}
                      <div>
                          <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Title</label>
                          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none" required />
                      </div>
                      <div>
                          <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Description</label>
                          <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none h-20" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Fee (XP)</label>
                              <input type="number" min={10} value={entryFee} onChange={e => setEntryFee(parseInt(e.target.value))} className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white" />
                          </div>
                          <div>
                              <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Winners</label>
                              <input type="number" min={1} value={winnersCount} onChange={e => setWinnersCount(parseInt(e.target.value))} className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white" />
                          </div>
                      </div>
                      <Button type="submit" disabled={isProcessing} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold shadow-xl">
                          {isProcessing ? 'CREATING...' : 'POST GIVEAWAY'}
                      </Button>
                  </form>
              </div>
          </div>
      )}

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {loading ? (
              <div className="col-span-full py-32 text-center text-yellow-500 font-retro animate-pulse">Scribing Raffles...</div>
          ) : giveaways.length === 0 ? (
              <div className="col-span-full py-32 text-center text-gray-600 bg-gray-900/30 rounded-3xl border-4 border-dashed border-gray-800">
                  <p className="font-serif italic text-xl">The registry of gifts is currently empty.</p>
              </div>
          ) : (
              giveaways.map(ga => {
                  const isExpired = ga.status === 'active' && new Date(ga.end_time) < new Date();
                  const isPoster = user?.id === ga.poster_id;
                  const myTicketCount = myEntries[ga.id] || 0;
                  const hasJoined = myTicketCount > 0;
                  const totalInvested = myTicketCount * ga.entry_fee;
                  
                  return (
                      <div key={ga.id} className={`bg-gray-900/60 rounded-3xl overflow-hidden border-2 transition-all flex flex-col h-full backdrop-blur-md relative ${ga.status === 'drawn' ? 'border-gray-800 opacity-60' : 'border-gray-800 hover:border-yellow-600 hover:translate-y-[-5px]'}`}>
                          <div className="h-44 bg-black relative">
                              <img src={ga.image || 'https://image.pollinations.ai/prompt/pixel%20art%20treasure%20chest?width=400&height=200&nologo=true'} className="w-full h-full object-cover opacity-60" />
                              <div className="absolute top-4 right-4 flex gap-2">
                                  <span className={`text-[9px] px-3 py-1 rounded-full font-bold uppercase border shadow-lg ${ga.status === 'active' ? 'bg-green-600/80 border-green-400 text-white' : 'bg-gray-700/80 border-gray-500 text-gray-300'}`}>
                                      {ga.status === 'active' ? 'ACTIVE' : 'FINISHED'}
                                  </span>
                              </div>
                          </div>
                          
                          <div className="p-6 flex-1 flex flex-col">
                              <h3 className="text-white font-retro text-lg mb-2 truncate uppercase">{ga.title}</h3>
                              <p className="text-gray-500 text-sm italic font-serif leading-relaxed line-clamp-3 mb-6">"{ga.description}"</p>
                              
                              <div className="grid grid-cols-2 gap-3 mb-6">
                                  <div className="bg-black/40 p-2 rounded-xl border border-gray-800 text-center">
                                      <p className="text-[8px] text-gray-500 uppercase mb-1">Fee</p>
                                      <p className="text-sm font-retro text-yellow-500">{ga.entry_fee} XP</p>
                                  </div>
                                  <div className="bg-black/40 p-2 rounded-xl border border-gray-800 text-center">
                                      <p className="text-[8px] text-gray-500 uppercase mb-1">Entries</p>
                                      <p className="text-sm font-retro text-blue-400">{ga.participants_count}</p>
                                  </div>
                              </div>

                              <div className="mt-auto pt-6 border-t border-gray-800">
                                  {ga.status === 'active' ? (
                                      isPoster ? (
                                          isExpired ? (
                                            <Button onClick={() => handleAIDraw(ga)} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg border-blue-400">
                                                DRAW WINNERS (AI)
                                            </Button>
                                          ) : (
                                            <div className="w-full text-center py-2 bg-gray-800 text-gray-500 rounded-xl text-xs uppercase font-retro tracking-widest border border-gray-700">YOUR GIVEAWAY</div>
                                          )
                                      ) : (
                                          <div className="space-y-3">
                                              {hasJoined && (
                                                  <div className="bg-green-900/20 py-2 px-3 rounded border border-green-800/50 mb-3 flex flex-col items-center animate-fade-in">
                                                      <span className="text-[10px] text-green-400 font-bold uppercase tracking-wide">
                                                          🎟️ You hold {myTicketCount} Ticket{myTicketCount > 1 ? 's' : ''}
                                                      </span>
                                                      <span className="text-[9px] text-green-600/80 font-mono mt-1">
                                                          Committed: {totalInvested.toLocaleString()} XP
                                                      </span>
                                                  </div>
                                              )}
                                              <Button 
                                                onClick={() => handleOpenPurchase(ga)} 
                                                disabled={isProcessing}
                                                className={`w-full py-3 shadow-lg ${hasJoined ? 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white' : 'bg-green-700 hover:bg-green-600 border-green-400 animate-glow'}`}
                                              >
                                                  {hasJoined ? 'BUY MORE TICKETS' : 'ENTER GIVEAWAY'}
                                              </Button>
                                          </div>
                                      )
                                  ) : (
                                      <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                                          <p className="text-[9px] text-gray-500 uppercase mb-2 text-center">Chosen Souls</p>
                                          <div className="flex flex-wrap gap-2 justify-center">
                                              {(ga.winner_ids?.length || 0) > 0 ? (
                                                  ga.winner_ids?.map((wid, idx) => (
                                                      <span key={idx} className="text-[10px] text-yellow-500 font-bold bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-700">WINNER #{idx + 1}</span>
                                                  ))
                                              ) : (
                                                  <span className="text-[10px] text-gray-500">Processing...</span>
                                              )}
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  );
              })
          )}
      </div>
    </div>
  );
};

export default GiveawaysView;
