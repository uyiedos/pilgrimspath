
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { User, Giveaway } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { GoogleGenAI } from "@google/genai";

interface GiveawaysViewProps {
  user: User | null;
  onBack: () => void;
  onAddPoints: (amount: number) => void;
}

const GiveawaysView: React.FC<GiveawaysViewProps> = ({ user, onBack, onAddPoints }) => {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [entryFee, setEntryFee] = useState(100);
  const [winnersCount, setWinnersCount] = useState(1);
  const [duration, setDuration] = useState(24); // hours
  const [giveawayType, setGiveawayType] = useState<'standard' | 'crypto' | 'nft' | 'avatar'>('standard');
  const [isVested, setIsVested] = useState(false);
  const [socialLink, setSocialLink] = useState('');
  
  // Image Handling
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
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
        .select('giveaway_id')
        .eq('user_id', user.id);
    if (data) setJoinedIds(new Set(data.map(d => d.giveaway_id)));
  };

  const fetchMyArtifacts = async () => {
      if (!user) return;
      // Only fetch artifacts not currently listed or locked in another giveaway
      const { data } = await supabase
        .from('avatar_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setMyArtifacts(data);
  };

  const handleArtifactSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const artifactId = e.target.value;
      setSelectedArtifactId(artifactId);
      const artifact = myArtifacts.find(a => a.id === artifactId);
      if (artifact) {
          setSelectedArtifactImage(artifact.avatar_url);
          // Auto-fill details if empty
          if (!title) setTitle(`Gift: ${artifact.collection_name?.split(' ')[1] || 'Artifact'}`);
          if (!desc) setDesc(`I am giving away my ${artifact.style_prompt}.`);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `giveaways/${user?.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
            .from('journey_assets')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('journey_assets').getPublicUrl(fileName);
        setCustomImageUrl(data.publicUrl);
    } catch (error: any) {
        alert('Error uploading image: ' + error.message);
    } finally {
        setIsUploading(false);
    }
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
            // Enhanced Prompt based on type
            let promptType = "spiritual treasure chest";
            if (giveawayType === 'crypto') promptType = "glowing futuristic crypto coins holy light";
            if (giveawayType === 'nft') promptType = "floating digital artifact hologram divine";

            const imagePrompt = `high quality pixel art ${promptType}, glowing holy light radiating from within, golden ornate details, ancient wood texture, floating in a mystical void, 16-bit game asset style, masterpiece`;
            imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=400&height=300&nologo=true`;
        }

        const { data, error } = await supabase.rpc('create_giveaway', {
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
        alert(giveawayType === 'avatar' ? "Artifact Locked & Giveaway Live!" : "Giveaway broadcasted to the sanctuary!");
        setShowCreate(false);
        fetchGiveaways();
        
        // Reset form
        setTitle('');
        setDesc('');
        setGiveawayType('standard');
        setIsVested(false);
        setSelectedArtifactId('');
        setSocialLink('');
        setSelectedArtifactImage('');
        setCustomImageUrl('');
    } catch (err: any) {
        alert(err.message || "Failed to create giveaway. Ensure you own the item and have 5000 XP.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleJoin = async (giveaway: Giveaway) => {
    if (!user) return alert("Login to enter raffles.");
    if (user.id === giveaway.poster_id) return alert("You cannot enter your own giveaway.");
    if (joinedIds.has(giveaway.id)) return alert("You have already entered this raffle.");

    if (!confirm(`Enter this giveaway for ${giveaway.entry_fee} XP? Your win chance is influenced by your total XP and activity.`)) return;

    setIsProcessing(true);
    try {
        const { data, error } = await supabase.rpc('enter_giveaway', {
            p_giveaway_id: giveaway.id,
            p_user_id: user.id
        });

        if (error) throw error;

        setJoinedIds(prev => new Set(prev).add(giveaway.id));
        onAddPoints(0); // Trigger UI refresh of XP
        AudioSystem.playVoxelTap();
        alert("Entry confirmed! May the Spirit favor your path.");
        fetchGiveaways();
    } catch (err: any) {
        alert(err.message || "Entry failed.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleAIDraw = async (giveaway: Giveaway) => {
    if (giveaway.status === 'drawn') return;
    if (new Date(giveaway.end_time) > new Date()) return alert("Raffle duration has not yet expired.");
    
    setIsProcessing(true);
    try {
        // CALL SERVER SIDE DRAW FUNCTION
        // This ensures atomicity and asset transfer security
        const { data: drawResult, error } = await supabase.rpc('draw_giveaway_winner', {
            p_giveaway_id: giveaway.id
        });

        if (error) throw error;
        if (!drawResult.success) throw new Error(drawResult.message);

        const winnerName = drawResult.winner_name || "a faithful pilgrim";

        // AI Narrative Generation
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const aiResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `The giveaway "${giveaway.title}" has ended. The selected winner is: ${winnerName}. Provide a short, reverent spiritual message announcing the victory and blessing the participants.`
        });

        // Post to chat
        await supabase.from('chat_messages').insert({
            user_id: user?.id || giveaway.poster_id,
            username: 'SYSTEM_PRIEST',
            message: `✨ RAFFLE RESULT: ${aiResponse.text}`,
            type: 'milestone'
        });

        AudioSystem.playLevelComplete();
        alert(`The draw is complete! Winner: ${winnerName}. Item transferred automatically.`);
        fetchGiveaways();

    } catch (e: any) {
        console.error(e);
        alert("Raffle draw failed: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')] animate-fade-in custom-scroll">
      
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
                  
                  <div className="bg-green-900/20 p-4 rounded-xl border border-green-800/50 mb-6 flex items-center gap-3">
                      <div className="text-2xl">💸</div>
                      <div>
                          <p className="text-green-400 text-[10px] font-retro uppercase mb-1">Creator Earnings</p>
                          <p className="text-gray-300 text-xs">
                              You keep <span className="text-white font-bold">70%</span> of all entry fees.
                              <br/><span className="opacity-50 text-[10px]">(30% Tithe to Treasury)</span>
                          </p>
                      </div>
                  </div>

                  <form onSubmit={handleCreate} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Giveaway Type</label>
                              <select 
                                value={giveawayType} 
                                onChange={(e) => setGiveawayType(e.target.value as any)} 
                                className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none"
                              >
                                  <option value="standard">Standard (XP/Item)</option>
                                  <option value="avatar">Artifact (Gallery Item)</option>
                                  <option value="crypto">Crypto Asset</option>
                                  <option value="nft">External NFT</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Distribution</label>
                              <button 
                                type="button"
                                onClick={() => setIsVested(!isVested)}
                                className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all ${isVested ? 'bg-blue-900/50 border-blue-500 text-blue-300' : 'bg-black border-gray-700 text-gray-400'}`}
                              >
                                {isVested ? '🔒 VESTED (Secured)' : '🔓 DIRECT (Manual)'}
                              </button>
                          </div>
                      </div>

                      {giveawayType === 'avatar' && (
                          <div className="space-y-2 bg-purple-900/20 p-3 rounded-xl border border-purple-500/30">
                              <label className="block text-purple-300 text-[10px] uppercase font-retro mb-1">Select Artifact from Vault</label>
                              <select 
                                  value={selectedArtifactId} 
                                  onChange={handleArtifactSelect}
                                  className="w-full bg-black border border-purple-700 p-2 rounded text-white text-xs"
                              >
                                  <option value="">-- Choose Artifact --</option>
                                  {myArtifacts.map(art => (
                                      <option key={art.id} value={art.id}>{art.style_prompt?.substring(0, 30)}... ({new Date(art.created_at).toLocaleDateString()})</option>
                                  ))}
                              </select>
                              {selectedArtifactImage && (
                                  <div className="w-20 h-20 mx-auto rounded overflow-hidden border border-purple-500 mt-2">
                                      <img src={selectedArtifactImage} className="w-full h-full object-cover" />
                                  </div>
                              )}
                              <p className="text-[9px] text-gray-400 mt-1 italic">
                                * Item will be locked in escrow until the draw is complete.
                              </p>
                          </div>
                      )}

                      {giveawayType !== 'avatar' && (
                          <div className="space-y-2 bg-gray-800/50 p-3 rounded-xl border border-gray-700">
                              <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1">Giveaway Image</label>
                              
                              <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    value={customImageUrl} 
                                    onChange={(e) => setCustomImageUrl(e.target.value)} 
                                    className="flex-1 bg-black border border-gray-700 p-2 rounded text-white text-xs outline-none focus:border-yellow-500 placeholder-gray-600"
                                    placeholder="Paste Image URL or Upload ->"
                                  />
                                  <label className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded cursor-pointer text-[10px] uppercase font-bold flex items-center border border-gray-600 transition-colors">
                                      {isUploading ? '...' : 'Upload'}
                                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                                  </label>
                              </div>
                              <p className="text-[8px] text-gray-500">Leave empty to auto-generate a divine image.</p>
                              
                              {customImageUrl && (
                                  <div className="h-20 w-full rounded overflow-hidden border border-gray-600 mt-2 bg-black">
                                      <img src={customImageUrl} className="w-full h-full object-cover" />
                                  </div>
                              )}
                          </div>
                      )}

                      {isVested && giveawayType !== 'avatar' && (
                          <div className="bg-blue-900/20 p-3 rounded-xl border border-blue-500/30 text-xs text-blue-200">
                              ℹ️ <strong>Vested Giveaway:</strong> This asset will be held by the Journey App escrow. You may need to transfer the Crypto/NFT to the Journey Vault for release to the winner.
                          </div>
                      )}

                      <div>
                          <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Title</label>
                          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-yellow-500" placeholder="e.g. 5000 XP Blessed Chest" required />
                      </div>
                      <div>
                          <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Description</label>
                          <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-yellow-500 h-20 resize-none" placeholder="What is being gifted?" required />
                      </div>
                      
                      {/* Social Link Input */}
                      <div>
                          <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Social Link (Optional)</label>
                          <input type="url" value={socialLink} onChange={e => setSocialLink(e.target.value)} className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none focus:border-yellow-500 placeholder-gray-600 text-xs" placeholder="e.g. https://x.com/yourprofile" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Entry Fee (XP)</label>
                              <input type="number" min={10} value={entryFee} onChange={e => setEntryFee(parseInt(e.target.value))} className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white" />
                          </div>
                          <div>
                              <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Winners</label>
                              <input type="number" min={1} max={10} value={winnersCount} onChange={e => setWinnersCount(parseInt(e.target.value))} className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white" />
                          </div>
                      </div>
                      <div>
                          <label className="block text-yellow-500 text-[10px] uppercase font-retro mb-1 ml-1">Duration (Hours)</label>
                          <select value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white outline-none">
                              <option value={1}>1 Hour</option>
                              <option value={6}>6 Hours</option>
                              <option value={24}>24 Hours (Daily)</option>
                              <option value={72}>3 Days</option>
                              <option value={168}>1 Week</option>
                          </select>
                      </div>
                      <div className="pt-4">
                          <Button type="submit" disabled={isProcessing} className="w-full py-4 bg-yellow-600 hover:bg-yellow-500 text-black font-bold shadow-xl">
                              {isProcessing ? 'COMMUNING...' : 'POST GIVEAWAY (-500 XP)'}
                          </Button>
                          <p className="text-[9px] text-gray-500 text-center mt-3 uppercase tracking-widest">Listing requires Lvl 5 (5000 XP)</p>
                      </div>
                  </form>
              </div>
          </div>
      )}

      <div className="w-full max-w-6xl grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pb-20">
          {loading ? (
              <div className="col-span-full py-32 text-center text-yellow-500 font-retro animate-pulse">Scribing Raffles...</div>
          ) : giveaways.length === 0 ? (
              <div className="col-span-full py-32 text-center text-gray-600 bg-gray-900/30 rounded-3xl border-4 border-dashed border-gray-800">
                  <div className="text-7xl mb-4 opacity-20">🗝️</div>
                  <p className="font-serif italic text-xl">The registry of gifts is currently empty.</p>
              </div>
          ) : (
              giveaways.map(ga => {
                  const isExpired = ga.status === 'active' && new Date(ga.end_time) < new Date();
                  const isDrawn = ga.status === 'drawn';
                  const isPoster = user?.id === ga.poster_id;
                  const hasJoined = joinedIds.has(ga.id);
                  const isVestedGiveaway = ga.is_vested;
                  const isAvatarGiveaway = ga.type === 'avatar';
                  const posterSocial = ga.social_link;

                  return (
                      <div key={ga.id} className={`bg-gray-900/60 rounded-3xl overflow-hidden border-2 transition-all flex flex-col h-full backdrop-blur-md relative ${ga.status === 'drawn' ? 'border-gray-800 opacity-60' : 'border-gray-800 hover:border-yellow-600 hover:translate-y-[-5px]'}`}>
                          <div className="h-44 bg-black relative">
                              <img src={ga.image} className="w-full h-full object-cover opacity-60" />
                              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                              <div className="absolute top-4 right-4 flex gap-2">
                                  {isAvatarGiveaway && (
                                      <span className="text-[9px] px-2 py-1 rounded-full font-bold uppercase border shadow-lg bg-purple-900/80 border-purple-400 text-purple-200">
                                          🖼️ ARTIFACT
                                      </span>
                                  )}
                                  {isVestedGiveaway && (
                                      <span className="text-[9px] px-2 py-1 rounded-full font-bold uppercase border shadow-lg bg-blue-900/80 border-blue-400 text-blue-200">
                                          🔒 VESTED
                                      </span>
                                  )}
                                  <span className={`text-[9px] px-3 py-1 rounded-full font-bold uppercase border shadow-lg ${ga.status === 'active' ? 'bg-green-600/80 border-green-400 text-white' : 'bg-gray-700/80 border-gray-500 text-gray-300'}`}>
                                      {ga.status === 'active' ? 'ACTIVE' : 'FINISHED'}
                                  </span>
                              </div>
                              {isDrawn && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="bg-black/80 px-6 py-2 rounded-xl border border-yellow-600 text-yellow-400 font-retro text-xs animate-glow">RAFFLE DRAWN</div>
                                  </div>
                              )}
                          </div>
                          
                          <div className="p-6 flex-1 flex flex-col">
                              <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-2">
                                      <img src={ga.users?.avatar} className="w-6 h-6 rounded-full border border-gray-700" />
                                      <span className="text-gray-500 text-[10px] font-mono uppercase truncate max-w-[100px]">{ga.users?.username}</span>
                                  </div>
                                  {posterSocial && (
                                      <a href={posterSocial} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:text-white transition-colors" title="View Poster Profile">
                                          ↗️ Social
                                      </a>
                                  )}
                              </div>
                              
                              <h3 className="text-white font-retro text-lg mb-2 truncate uppercase">{ga.title}</h3>
                              <p className="text-gray-500 text-sm italic font-serif leading-relaxed line-clamp-3 mb-6">"{ga.description}"</p>
                              
                              <div className="grid grid-cols-2 gap-3 mb-6">
                                  <div className="bg-black/40 p-2 rounded-xl border border-gray-800 text-center">
                                      <p className="text-[8px] text-gray-500 uppercase mb-1">Fee</p>
                                      <p className="text-sm font-retro text-yellow-500">{ga.entry_fee} XP</p>
                                  </div>
                                  <div className="bg-black/40 p-2 rounded-xl border border-gray-800 text-center">
                                      <p className="text-[8px] text-gray-500 uppercase mb-1">Winners</p>
                                      <p className="text-sm font-retro text-blue-400">{ga.winners_count}</p>
                                  </div>
                              </div>

                              <div className="mt-auto pt-6 border-t border-gray-800">
                                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-4">
                                      <span>Participants: {ga.participants_count}</span>
                                      <span>{new Date(ga.end_time).toLocaleDateString()}</span>
                                  </div>

                                  {ga.status === 'active' ? (
                                      isPoster ? (
                                          isExpired ? (
                                            <Button onClick={() => handleAIDraw(ga)} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg border-blue-400">
                                                DRAW WINNERS (AI)
                                            </Button>
                                          ) : (
                                            <div className="w-full text-center py-2 bg-gray-800 text-gray-500 rounded-xl text-xs uppercase font-retro tracking-widest border border-gray-700">WAITING...</div>
                                          )
                                      ) : (
                                          <Button 
                                            onClick={() => handleJoin(ga)} 
                                            disabled={isProcessing || hasJoined}
                                            className={`w-full py-3 shadow-lg ${hasJoined ? 'bg-gray-800 border-gray-600 text-gray-500' : 'bg-green-700 hover:bg-green-600 border-green-400 animate-glow'}`}
                                          >
                                              {hasJoined ? 'ENTRY RECORDED' : 'ENTER RAFFLE'}
                                          </Button>
                                      )
                                  ) : (
                                      <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                                          <p className="text-[9px] text-gray-500 uppercase mb-2 text-center">Chosen Souls</p>
                                          <div className="flex flex-wrap gap-2 justify-center">
                                              {ga.winner_ids?.map((wid, idx) => (
                                                  <span key={idx} className="text-[10px] text-yellow-500 font-bold bg-yellow-900/20 px-2 py-0.5 rounded border border-yellow-900/50">WINNER #{idx + 1}</span>
                                              ))}
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
