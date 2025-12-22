
import React, { useState, useMemo, useEffect } from 'react';
import Button from './Button';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { findBiblicalVerse } from '../services/geminiService';
import { LanguageCode, UI_TEXT } from '../translations';
import { GoogleGenAI } from "@google/genai";
import { PLAYER_LEVELS } from '../constants';

interface ForgeViewProps {
  user: User | null;
  totalPoints: number;
  onBack: () => void;
  onUpdateUser: (user: User) => void;
  spendPoints: (amount: number, type?: string) => Promise<boolean>;
  onUnlockAchievement: (id: string) => void;
  collectedVerses?: string[];
  language: LanguageCode;
  initialArtifactId?: string | null;
  onAddPoints?: (amount: number) => void;
}

type ForgeTab = 'identity' | 'sanctuary' | 'scripture';
type AestheticMode = 'modern' | 'classic';

interface ForgedArtifact {
  id: string;
  avatar_url: string;
  style_prompt: string;
  collection_name: string;
  created_at: string;
  user_id: string;
  attached_xp?: number;
  users?: {
    username: string;
    avatar: string;
    total_points?: number;
  };
}

const FORGE_PROTOCOLS = [
  { id: 'common', name: "Scribe Protocol", minXP: 0, cost: 500, quality: 'Common', adj: 'refined' },
  { id: 'rare', name: "Warrior Protocol", minXP: 5000, cost: 1500, quality: 'Rare', adj: 'intricate' },
  { id: 'legendary', name: "Angelic Protocol", minXP: 25000, cost: 5000, quality: 'Legendary', adj: 'masterpiece' },
  { id: 'mythic', name: "Seraphic Protocol", minXP: 75000, cost: 15000, quality: 'Mythic', adj: 'divine' }
];

const ForgeView: React.FC<ForgeViewProps> = ({ user, totalPoints, onBack, onUpdateUser, spendPoints, onUnlockAchievement, collectedVerses = [], language, initialArtifactId, onAddPoints }) => {
  const [activeTab, setActiveTab] = useState<ForgeTab>('identity');
  const [aesthetic, setAesthetic] = useState<AestheticMode>('modern');
  const [isForging, setIsForging] = useState(false);
  const [forgeStatus, setForgeStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [listPrice, setListPrice] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Gallery State
  const [myCollection, setMyCollection] = useState<ForgedArtifact[]>([]);
  const [viewingArtifact, setViewingArtifact] = useState<ForgedArtifact | null>(null);
  const [isBurning, setIsBurning] = useState(false);
  const [isEquipping, setIsEquipping] = useState(false);
  
  // Scripture Forge State
  const [verseInput, setVerseInput] = useState('');
  const [foundVerse, setFoundVerse] = useState<{ text: string, reference: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT[language][key] || UI_TEXT['en'][key];

  useEffect(() => {
    if (user) {
      fetchCollection();
    }
    if (initialArtifactId) fetchSpecificArtifact(initialArtifactId);
  }, [user, initialArtifactId]);

  const fetchSpecificArtifact = async (id: string) => {
    const { data } = await supabase
        .from('avatar_history')
        .select('*, users:user_id(username, avatar, total_points)')
        .eq('id', id)
        .single();
    if (data) setViewingArtifact(data);
  };

  const fetchCollection = async () => {
    if (!user || user.id.startsWith('offline-')) return;
    const { data } = await supabase
      .from('avatar_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMyCollection(data);
  };

  const currentTier = useMemo(() => {
    const xp = totalPoints || 0; 
    if (xp >= 75000) return FORGE_PROTOCOLS[3];
    if (xp >= 25000) return FORGE_PROTOCOLS[2];
    if (xp >= 5000) return FORGE_PROTOCOLS[1];
    return FORGE_PROTOCOLS[0];
  }, [totalPoints]);

  const lookupVerse = async (query?: string) => {
    const q = query || verseInput.trim();
    if (!q) return;
    setIsSearching(true);
    setFoundVerse(null);
    AudioSystem.playVoxelTap();
    try {
      const data = await findBiblicalVerse(q, language);
      if (data && data.text) {
        setFoundVerse(data);
        setVerseInput(data.reference);
        AudioSystem.playMessage();
      } else {
        alert("Archives empty for this ref.");
      }
    } catch (err) {
      alert("Archives inaccessible.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleForge = async () => {
    if (!user || user.id.startsWith('offline-')) {
      alert("Sign in to forge.");
      return;
    }
    const protocol = currentTier;
    if ((user.totalPoints || 0) < protocol.cost) {
        alert("Insufficient Spirit XP to ignite the forge.");
        return;
    }
    setShowConfirm(false);
    setIsForging(true);
    setForgeStatus("Communing with the Forge...");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let prompt = "";
      const modernStyle = `isometric 3D voxel art, high detail, spiritual glow, white background`;
      const classicStyle = `16-bit pixel art, detailed retro game style, spiritual atmosphere`;

      if (activeTab === 'identity') {
        prompt = `${aesthetic === 'modern' ? modernStyle : classicStyle}, ${protocol.adj} biblical character portrait for ${user.archetype || 'Seeker'}, divine aura.`;
      } else if (activeTab === 'sanctuary') {
        prompt = `${aesthetic === 'modern' ? modernStyle : classicStyle}, ${protocol.adj} wide shot of a peaceful heavenly sanctuary landscape.`;
      } else if (activeTab === 'scripture' && foundVerse) {
        prompt = `${aesthetic === 'modern' ? modernStyle : classicStyle}, ${protocol.adj} sacred artifact diorama representing the verse: ${foundVerse.text}.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ text: prompt }],
        config: { imageConfig: { aspectRatio: "1:1" } }
      });

      let base64Image = "";
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            base64Image = part.inlineData.data;
            break;
          }
        }
      }
      if (!base64Image) throw new Error("Forge failed to manifest.");

      setForgeStatus("Archiving & Listing...");
      const binaryString = atob(base64Image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'image/png' });
      const folder = activeTab === 'identity' ? 'avatars' : activeTab === 'sanctuary' ? 'backgrounds' : 'verses';
      const fileName = `${folder}/${user.id}/forge_${Date.now()}.png`;
      const { error: uploadError = null } = await supabase.storage.from('journey_assets').upload(fileName, blob, { contentType: 'image/png' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('journey_assets').getPublicUrl(fileName);
      const collectionName = `${aesthetic === 'modern' ? 'Modern' : 'Classic'} ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`;

      const { data: rpcData, error: rpcError } = await supabase.rpc('forge_and_list_artifact', {
          p_user_id: user.id, p_image_url: publicUrl,
          p_style_prompt: activeTab === 'scripture' ? `Verse: ${foundVerse?.reference}` : `Forged ${activeTab}`,
          p_collection_name: collectionName, p_cost: protocol.cost
      });
      if (rpcError) throw rpcError;
      setPreviewUrl(publicUrl);
      setListPrice(rpcData.list_price);
      setForgeStatus("MANIFESTED & LISTED");
      AudioSystem.playLevelComplete();
      onUnlockAchievement('divine_architect');
      onUpdateUser({ ...user, totalPoints: (user.totalPoints || 0) - protocol.cost });
      fetchCollection();
    } catch (err: any) {
      alert("Forge cooled unexpectedly: " + err.message);
    } finally {
      setIsForging(false);
    }
  };

  const handleShareArtifact = async (art: ForgedArtifact) => {
      AudioSystem.playVoxelTap();
      const deepLink = `${window.location.origin}${window.location.pathname}?artifact_id=${art.id}`;
      const shareText = `🕊️ Behold this artifact of the Spirit: "${art.collection_name}" manifested on The Journey.`;
      
      let shared = false;
      if (navigator.share) {
          try {
            await navigator.share({ title: 'Sacred Artifact', text: shareText, url: deepLink });
            shared = true;
          } catch (e) {}
      } 
      
      if (!shared) {
          try {
            await navigator.clipboard.writeText(`${shareText}\n${deepLink}`);
            alert("Artifact link copied!");
            shared = true;
          } catch(e) {}
      }

      if (shared) {
          if (onAddPoints) onAddPoints(20);
          onUnlockAchievement('evangelist');
          AudioSystem.playAchievement();
          alert("+20 XP: Evangelist Bonus");
      }
  };

  const handleBurn = async (artifact: ForgedArtifact) => {
    if (!user) return;
    const reclaim = Math.floor((artifact.attached_xp || 0) * 0.5);
    if (!confirm(`SACRED DISSOLUTION:\n\nAre you sure?\n\nReclaim ${reclaim.toLocaleString()} XP (50%).\n50% tithed to Global Treasury.`)) return;
    setIsBurning(true);
    try {
        const { data, error } = await supabase.rpc('burn_artifact', { p_artifact_id: artifact.id, p_user_id: user.id });
        if (error) throw error;
        AudioSystem.playAchievement();
        alert(`Dissolved.\n\nReclaimed: +${data.reclaimed_xp}\nTithe: ${data.treasury_tithe}`);
        onUpdateUser({ ...user, totalPoints: user.totalPoints + data.reclaimed_xp });
        onUnlockAchievement('burn_novice');
        setViewingArtifact(null);
        fetchCollection();
    } catch (e: any) {
        alert("Failed: " + e.message);
    } finally {
        setIsBurning(false);
    }
  };

  const handleEquip = async (artifact: ForgedArtifact) => {
    if (!user) return;
    setIsEquipping(true);
    try {
        const type = artifact.collection_name.toLowerCase().includes('identity') ? 'avatar' : 'sanctuary';
        const { error } = await supabase.rpc('equip_artifact', { p_user_id: user.id, p_artifact_url: artifact.avatar_url, p_type: type });
        if (error) throw error;
        AudioSystem.playAchievement();
        if (type === 'avatar') onUpdateUser({ ...user, avatar: artifact.avatar_url });
        else onUpdateUser({ ...user, sanctuaryBackground: artifact.avatar_url });
        setViewingArtifact(null);
        fetchCollection();
    } catch (e: any) {
        alert("Equip failed: " + e.message);
    } finally {
        setIsEquipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center pt-20 p-4 relative z-10 custom-scroll">
      {viewingArtifact && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-md">
           <div className="relative bg-gray-900 border-4 border-yellow-600 rounded-3xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl">
              <button onClick={() => setViewingArtifact(null)} className="absolute top-4 right-4 z-10 text-white text-2xl bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-colors">✕</button>
              <div className="w-full md:w-1/2 aspect-square bg-black relative">
                 <img src={viewingArtifact.avatar_url} className="w-full h-full object-cover" />
                 {user && (user.avatar === viewingArtifact.avatar_url || user.sanctuaryBackground === viewingArtifact.avatar_url) && (
                    <div className="absolute top-6 left-6 bg-yellow-600 text-black font-retro text-[10px] px-4 py-2 rounded-lg border-2 border-white shadow-xl uppercase animate-pulse">EQUIPPED</div>
                 )}
              </div>
              <div className="p-8 flex flex-col justify-between flex-1">
                 <div>
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-retro text-yellow-500 uppercase">{viewingArtifact.collection_name}</h3>
                        <button onClick={() => handleShareArtifact(viewingArtifact)} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all">↗️</button>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="bg-yellow-900/40 text-yellow-300 border border-yellow-700 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-inner">⚡ {viewingArtifact.attached_xp || 0} XP</span>
                        <span className="text-gray-500 font-mono text-xs">Intrinsic Value</span>
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10 mb-6">
                       <p className="text-gray-500 text-[10px] uppercase font-bold mb-2">Prompt DNA</p>
                       <p className="text-gray-300 italic font-serif text-sm">"{viewingArtifact.style_prompt}"</p>
                    </div>
                    {viewingArtifact.users && (
                       <div className="flex items-center gap-3">
                          <img src={viewingArtifact.users.avatar} className="w-8 h-8 rounded-full border border-gray-600" />
                          <div>
                              <p className="text-white font-bold text-sm">Created by {viewingArtifact.users.username}</p>
                              <p className="text-yellow-500 text-[8px] font-mono uppercase">Level {PLAYER_LEVELS.filter(l => l.xp <= (viewingArtifact.users?.total_points || 0)).pop()?.level || 1} Steward</p>
                          </div>
                       </div>
                    )}
                 </div>
                 <div className="space-y-3 mt-4">
                    {user && user.id === viewingArtifact.user_id && (
                        <>
                            {!(user.avatar === viewingArtifact.avatar_url || user.sanctuaryBackground === viewingArtifact.avatar_url) ? (
                                <Button onClick={() => handleEquip(viewingArtifact)} disabled={isEquipping} className="w-full bg-green-600 border-green-400">{isEquipping ? 'EQUIPPING...' : 'EQUIP ARTIFACT'}</Button>
                            ) : (
                                <div className="w-full py-3 rounded-xl bg-gray-800 text-gray-500 font-retro text-[10px] text-center uppercase tracking-widest border border-gray-700">Currently Active</div>
                            )}
                            <button onClick={() => handleBurn(viewingArtifact)} disabled={isBurning || user.avatar === viewingArtifact.avatar_url || user.sanctuaryBackground === viewingArtifact.avatar_url} className="w-full py-3 rounded-xl border-2 border-red-900 bg-red-950/30 text-red-500 font-retro text-[10px] hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest disabled:opacity-30">
                                {isBurning ? 'DISSOLVING...' : `SACRED DISSOLUTION (+${Math.floor((viewingArtifact.attached_xp || 0) * 0.5)} XP)`}
                            </button>
                        </>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-6xl">
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b-2 border-white/10 pb-6 gap-6 bg-black/30 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-6xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-yellow-600 drop-shadow-md tracking-tighter uppercase">Sacred Forge</h1>
            <p className="text-gray-400 font-mono text-[9px] uppercase tracking-[0.5em] mt-2">Manifestation Tier: <span className="text-yellow-500 font-bold">{currentTier.quality}</span></p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
              {(['identity', 'sanctuary', 'scripture'] as const).map(tab => (
                <button key={tab} onClick={() => { AudioSystem.playVoxelTap(); setActiveTab(tab); setPreviewUrl(null); }} className={`px-4 py-2 font-retro text-[8px] border-2 transition-all rounded-xl ${activeTab === tab ? 'bg-yellow-600 border-white text-black shadow-lg' : 'bg-black/40 text-gray-500 border-white/5 hover:text-white'}`}>{tab.toUpperCase()}</button>
              ))}
            </div>
            <Button onClick={onBack} variant="secondary">🏠 Home</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-16">
          <div className="space-y-6">
            <div className="bg-black/30 backdrop-blur-2xl border-4 border-white/10 p-6 rounded-[2.5rem] shadow-2xl">
              <div className="grid grid-cols-2 gap-4 mb-8">
                  <button onClick={() => setAesthetic('modern')} className={`p-4 rounded-[2rem] border-2 ${aesthetic === 'modern' ? 'bg-blue-600/60 border-white text-white' : 'bg-black/40 border-white/5 text-gray-500'}`}>
                      <div className="text-3xl mb-1">🧊</div>
                      <div className="font-retro text-[9px] uppercase">Modern</div>
                  </button>
                  <button onClick={() => setAesthetic('classic')} className={`p-4 rounded-[2rem] border-2 ${aesthetic === 'classic' ? 'bg-purple-600/60 border-white text-white' : 'bg-black/40 border-white/5 text-gray-500'}`}>
                      <div className="text-3xl mb-1">👾</div>
                      <div className="font-retro text-[9px] uppercase">Classic</div>
                  </button>
              </div>

              {activeTab === 'scripture' && (
                <div className="mb-8 space-y-4">
                    <div className="flex gap-2">
                        <input type="text" value={verseInput} onChange={(e) => setVerseInput(e.target.value)} placeholder="e.g. John 3:16" className="flex-1 bg-black/40 border-2 border-white/10 rounded-2xl p-4 text-white font-serif outline-none" />
                        <button onClick={() => lookupVerse()} className="bg-yellow-600 px-6 rounded-2xl">🔍</button>
                    </div>
                    {foundVerse && (
                        <div className="bg-white/5 p-4 rounded-[2rem] border border-yellow-600/30 animate-fade-in text-center"><p className="text-white font-serif italic">"{foundVerse.text}"</p></div>
                    )}
                </div>
              )}

              <div className="space-y-4">
                {FORGE_PROTOCOLS.map((protocol) => {
                  const isUnlocked = totalPoints >= protocol.minXP;
                  return (
                    <div key={protocol.id} className={`p-4 rounded-2xl border ${currentTier.id === protocol.id ? 'bg-yellow-900/20 border-yellow-500 shadow-lg' : isUnlocked ? 'bg-black/40 border-white/10 opacity-60' : 'bg-black/20 border-white/5 opacity-30 grayscale'}`}>
                       <div className="flex justify-between items-center">
                          <div><span className="font-retro text-[9px] uppercase block">{protocol.name}</span><span className="text-[8px] text-gray-400">Forges Artifact + Auto-Lists to Market</span></div>
                          <span className="font-mono text-[10px] font-bold">{isUnlocked ? `${protocol.cost} XP` : '🔒'}</span>
                       </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8"><Button onClick={() => setShowConfirm(true)} disabled={isForging || (activeTab === 'scripture' && !foundVerse)} className="w-full py-6 text-xl rounded-[2rem] animate-glow">{isForging ? 'FORGING...' : 'IGNITE THE FORGE'}</Button></div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className={`w-full aspect-square max-w-[480px] bg-black/60 backdrop-blur-xl border-4 rounded-[3rem] relative overflow-hidden flex items-center justify-center ${isForging ? 'border-yellow-500 shadow-2xl' : 'border-white/10'}`}>
              {isForging ? (
                <div className="text-center space-y-4"><div className="text-8xl animate-spin-slow opacity-60">⚒️</div><p className="text-yellow-500 font-retro text-[9px] uppercase tracking-widest">{forgeStatus}</p></div>
              ) : previewUrl ? (
                <>
                    <img src={previewUrl} className="w-full h-full object-cover animate-fade-in opacity-50" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-6 text-center">
                        <div className="text-6xl mb-4">🛒</div>
                        <h3 className="text-2xl font-retro text-white uppercase mb-2">Listed on Market</h3>
                        <p className="text-green-400 font-mono text-lg font-bold mb-4">{listPrice.toLocaleString()} XP</p>
                        <p className="text-gray-400 text-xs max-w-xs">Your artifact has been forged and automatically listed. Upon sale, you will receive the full XP cost back.</p>
                    </div>
                </>
              ) : (
                <div className="text-center opacity-30"><div className="text-8xl mb-8 grayscale">{activeTab === 'identity' ? '👤' : activeTab === 'sanctuary' ? '🏞️' : '📜'}</div><p className="text-white font-serif italic">"Ready to manifest..."</p></div>
              )}
            </div>
            {previewUrl && !isForging && <div className="mt-8 w-full max-w-[480px] flex gap-4"><Button onClick={() => setPreviewUrl(null)} className="w-full bg-blue-600 border-blue-400 rounded-3xl">CREATE ANOTHER</Button></div>}
          </div>
        </div>

        {/* Gallery Section */}
        <div className="w-full bg-black/40 border-t-4 border-white/10 pt-10 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 px-4 gap-4">
                <h2 className="text-2xl font-retro text-white flex items-center gap-3"><span>🏛️</span> Artifact Gallery</h2>
                <div className="bg-yellow-900/30 px-4 py-2 rounded-xl border border-yellow-500/30">
                    <span className="text-yellow-500 font-retro text-xs uppercase tracking-wider">My Personal Vault</span>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1.5 md:gap-4 px-2 md:px-4">
                {myCollection.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-600 font-mono text-sm border-2 border-dashed border-gray-800 rounded-2xl">Vault is empty. Ignite the forge to populate.</div>
                ) : (
                    myCollection.map((item) => {
                        const isEquipped = user && (user.avatar === item.avatar_url || user.sanctuaryBackground === item.avatar_url);
                        return (
                        <div key={item.id} onClick={() => setViewingArtifact(item)} className={`aspect-square bg-gray-900 rounded-lg md:rounded-xl overflow-hidden border md:border-2 transition-all cursor-pointer relative group ${isEquipped ? 'border-yellow-500 shadow-lg scale-105' : 'border-gray-800 hover:border-yellow-500 hover:scale-105'}`}>
                            <img src={item.avatar_url} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                                {isEquipped && <div className="bg-yellow-600 text-black font-bold text-[5px] md:text-[6px] px-1 md:px-1.5 py-0.5 rounded border border-white uppercase animate-pulse">Active</div>}
                            </div>
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1 md:p-2 backdrop-blur-[1px]">
                                <span className="text-yellow-500 font-retro text-[5px] md:text-[8px] uppercase leading-tight">{item.collection_name.split(' ')[0]}</span>
                                {item.users && <span className="text-white font-bold text-[6px] md:text-[10px] truncate">{item.users.username}</span>}
                                <span className="text-green-400 font-mono text-[5px] md:text-[8px] mt-0.5">+{item.attached_xp || 0} XP</span>
                            </div>
                        </div>
                    )})
                )}
            </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl">
          <div className="bg-black/80 border-4 border-red-600/50 p-12 rounded-[4rem] text-center max-w-lg shadow-2xl">
            <div className="text-6xl mb-8 animate-bounce">⚠️</div>
            <h2 className="text-3xl font-retro text-red-500 mb-6 uppercase">XP SACRIFICE</h2>
            <p className="text-gray-300 font-serif mb-6 text-xl">Sacrifice {currentTier.cost} Spirit XP?</p>
            <div className="bg-yellow-900/20 p-4 rounded-2xl border border-yellow-700/50 mb-8 text-left space-y-2">
                <p className="text-[10px] text-yellow-500 font-retro uppercase tracking-widest">Protocol Breakdown</p>
                <ul className="text-xs text-gray-300 space-y-1 list-disc pl-4">
                    <li>Artifact created with <strong>{currentTier.cost} XP</strong> value.</li>
                    <li>Automatically listed on Marketplace for <strong>{Math.floor(currentTier.cost * 1.1)} XP</strong>.</li>
                    <li>If sold: You get {currentTier.cost} XP back. Treasury gets 10% fee.</li>
                </ul>
            </div>
            <div className="flex flex-col gap-4">
              <Button onClick={handleForge} className="bg-red-600 border-red-400 py-6 rounded-3xl">IGNITE & LIST</Button>
              <Button onClick={() => setShowConfirm(false)} variant="secondary" className="py-5 rounded-3xl">ABORT</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeView;
