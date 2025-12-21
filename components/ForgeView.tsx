
import React, { useState, useMemo, useEffect } from 'react';
import Button from './Button';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { findBiblicalVerse } from '../services/geminiService';
import { LanguageCode, UI_TEXT } from '../translations';
import { GoogleGenAI } from "@google/genai";

interface ForgeViewProps {
  user: User | null;
  totalPoints: number;
  onBack: () => void;
  onUpdateUser: (user: User) => void;
  spendPoints: (amount: number, type?: string) => Promise<boolean>;
  onUnlockAchievement: (id: string) => void;
  collectedVerses?: string[];
  language: LanguageCode;
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
  };
}

const FORGE_PROTOCOLS = [
  { id: 'common', name: "Scribe Protocol", minXP: 0, cost: 500, quality: 'Common', adj: 'refined' },
  { id: 'rare', name: "Warrior Protocol", minXP: 5000, cost: 1500, quality: 'Rare', adj: 'intricate' },
  { id: 'legendary', name: "Angelic Protocol", minXP: 25000, cost: 5000, quality: 'Legendary', adj: 'masterpiece' },
  { id: 'mythic', name: "Seraphic Protocol", minXP: 75000, cost: 15000, quality: 'Mythic', adj: 'divine' }
];

const ForgeView: React.FC<ForgeViewProps> = ({ user, totalPoints, onBack, onUpdateUser, spendPoints, onUnlockAchievement, collectedVerses = [], language }) => {
  const [activeTab, setActiveTab] = useState<ForgeTab>('identity');
  const [aesthetic, setAesthetic] = useState<AestheticMode>('modern');
  const [isForging, setIsForging] = useState(false);
  const [forgeStatus, setForgeStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Gallery State
  const [myCollection, setMyCollection] = useState<ForgedArtifact[]>([]);
  const [communityCollection, setCommunityCollection] = useState<ForgedArtifact[]>([]);
  const [galleryMode, setGalleryMode] = useState<'mine' | 'community'>('community');
  const [viewingArtifact, setViewingArtifact] = useState<ForgedArtifact | null>(null);
  
  // Scripture Forge State
  const [verseInput, setVerseInput] = useState('');
  const [foundVerse, setFoundVerse] = useState<{ text: string, reference: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT.en[key];

  useEffect(() => {
    if (user) {
      fetchCollection();
    }
    fetchCommunityGallery();
  }, [user]);

  const fetchCollection = async () => {
    if (!user || user.id.startsWith('offline-')) return;
    const { data } = await supabase
      .from('avatar_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setMyCollection(data);
  };

  const fetchCommunityGallery = async () => {
    const { data } = await supabase
      .from('avatar_history')
      .select('*, users:user_id(username, avatar)')
      .order('created_at', { ascending: false })
      .limit(24);
    if (data) setCommunityCollection(data);
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
    
    // NEW: Use specific forge payment RPC that burns tokens into the artifact
    // Instead of spendPoints (which goes to treasury)
    const { error: payError } = await supabase.rpc('pay_forge_cost', {
        p_user_id: user.id,
        p_amount: protocol.cost
    });

    if (payError) {
        alert("Insufficient Spirit XP to ignite the forge.");
        return;
    }

    // Update local state to reflect spend immediately
    onUpdateUser({ ...user, totalPoints: (user.totalPoints || 0) - protocol.cost });

    setShowConfirm(false);
    setIsForging(true);
    setForgeStatus("Communing with the Forge...");

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
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
        config: {
          imageConfig: { aspectRatio: "1:1" }
        }
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

      setForgeStatus("Archiving Artifact...");
      const binaryString = atob(base64Image);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/png' });

      const folder = activeTab === 'identity' ? 'avatars' : activeTab === 'sanctuary' ? 'backgrounds' : 'verses';
      const fileName = `${folder}/${user.id}/forge_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('journey_assets').upload(fileName, blob, { contentType: 'image/png' });
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage.from('journey_assets').getPublicUrl(fileName);
      const collectionName = `${aesthetic === 'modern' ? 'Modern' : 'Classic'} ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`;

      // INSERT with attached_xp
      await supabase.from('avatar_history').insert({
        user_id: user.id,
        avatar_url: publicUrl,
        style_prompt: activeTab === 'scripture' ? `Verse: ${foundVerse?.reference}` : `Forged ${activeTab}`,
        collection_name: collectionName,
        attached_xp: protocol.cost // VALUE RETENTION
      });

      setPreviewUrl(publicUrl);
      setForgeStatus("MANIFESTED");
      AudioSystem.playLevelComplete();
      onUnlockAchievement('divine_architect');
      
      // Refresh collections
      fetchCollection();
      fetchCommunityGallery();
      
    } catch (err) {
      console.error(err);
      alert("Forge cooled unexpectedly.");
    } finally {
      setIsForging(false);
    }
  };

  const equipArtifact = (url: string) => {
    if (url && user) {
      if (activeTab === 'identity') onUpdateUser({ ...user, avatar: url });
      else if (activeTab === 'sanctuary') onUpdateUser({ ...user, sanctuaryBackground: url });
      alert("Artifact Equipped!");
    }
  };

  const activeGallery = galleryMode === 'mine' ? myCollection : communityCollection;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center pt-20 p-4 relative z-10 custom-scroll">
      
      {/* Viewing Modal */}
      {viewingArtifact && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-md">
           <div className="relative bg-gray-900 border-4 border-yellow-600 rounded-3xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl">
              <button onClick={() => setViewingArtifact(null)} className="absolute top-4 right-4 z-10 text-white text-2xl bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 transition-colors">✕</button>
              
              <div className="w-full md:w-1/2 aspect-square bg-black">
                 <img src={viewingArtifact.avatar_url} className="w-full h-full object-cover" />
              </div>
              
              <div className="p-8 flex flex-col justify-between flex-1">
                 <div>
                    <h3 className="text-2xl font-retro text-yellow-500 mb-2 uppercase">{viewingArtifact.collection_name}</h3>
                    
                    <div className="flex items-center gap-2 mb-6">
                        <span className="bg-yellow-900/40 text-yellow-300 border border-yellow-700 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-inner">
                            ⚡ {viewingArtifact.attached_xp || 0} XP
                        </span>
                        <span className="text-gray-500 font-mono text-xs">Stored Value</span>
                    </div>
                    
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10 mb-6">
                       <p className="text-gray-500 text-[10px] uppercase font-bold mb-2">Prompt DNA</p>
                       <p className="text-gray-300 italic font-serif text-sm">"{viewingArtifact.style_prompt}"</p>
                    </div>

                    {viewingArtifact.users && (
                       <div className="flex items-center gap-3">
                          <img src={viewingArtifact.users.avatar} className="w-8 h-8 rounded-full border border-gray-600" />
                          <p className="text-white font-bold text-sm">Created by {viewingArtifact.users.username}</p>
                       </div>
                    )}
                 </div>

                 {user && user.id === viewingArtifact.user_id && (
                    <Button onClick={() => { equipArtifact(viewingArtifact.avatar_url); setViewingArtifact(null); }} className="mt-4 w-full bg-green-600 border-green-400">
                       EQUIP ARTIFACT
                    </Button>
                 )}
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
                <button 
                  key={tab}
                  onClick={() => { AudioSystem.playVoxelTap(); setActiveTab(tab); setPreviewUrl(null); }}
                  className={`px-4 py-2 font-retro text-[8px] border-2 transition-all rounded-xl ${activeTab === tab ? 'bg-yellow-600 border-white text-black shadow-lg' : 'bg-black/40 text-gray-500 border-white/5 hover:text-white'}`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
            <Button onClick={onBack} variant="secondary">🏠 Home</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-16">
          <div className="space-y-6">
            <div className="bg-black/30 backdrop-blur-2xl border-4 border-white/10 p-6 rounded-[2.5rem] shadow-2xl">
              <div className="mb-8 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setAesthetic('modern')} className={`p-4 rounded-[2rem] border-2 ${aesthetic === 'modern' ? 'bg-blue-600/60 border-white text-white' : 'bg-black/40 border-white/5 text-gray-500'}`}>
                          <div className="text-3xl mb-1">🧊</div>
                          <div className="font-retro text-[9px] uppercase">Modern</div>
                      </button>
                      <button onClick={() => setAesthetic('classic')} className={`p-4 rounded-[2rem] border-2 ${aesthetic === 'classic' ? 'bg-purple-600/60 border-white text-white' : 'bg-black/40 border-white/5 text-gray-500'}`}>
                          <div className="text-3xl mb-1">👾</div>
                          <div className="font-retro text-[9px] uppercase">Classic</div>
                      </button>
                  </div>
              </div>

              {activeTab === 'scripture' && (
                <div className="mb-8 space-y-4">
                    <div className="flex gap-2">
                        <input type="text" value={verseInput} onChange={(e) => setVerseInput(e.target.value)} placeholder="e.g. John 3:16" className="flex-1 bg-black/40 border-2 border-white/10 rounded-2xl p-4 text-white font-serif outline-none" />
                        <button onClick={() => lookupVerse()} className="bg-yellow-600 px-6 rounded-2xl">🔍</button>
                    </div>
                    {foundVerse && (
                        <div className="bg-white/5 p-4 rounded-[2rem] border border-yellow-600/30 animate-fade-in text-center">
                            <p className="text-white font-serif italic">"{foundVerse.text}"</p>
                        </div>
                    )}
                </div>
              )}

              <div className="space-y-4">
                {FORGE_PROTOCOLS.map((protocol) => {
                  const isUnlocked = totalPoints >= protocol.minXP;
                  return (
                    <div key={protocol.id} className={`p-4 rounded-2xl border ${currentTier.id === protocol.id ? 'bg-yellow-900/20 border-yellow-500 shadow-lg' : isUnlocked ? 'bg-black/40 border-white/10 opacity-60' : 'bg-black/20 border-white/5 opacity-30 grayscale'}`}>
                       <div className="flex justify-between items-center">
                          <div>
                              <span className="font-retro text-[9px] uppercase block">{protocol.name}</span>
                              <span className="text-[8px] text-gray-400">Transforms {protocol.cost} XP into Artifact</span>
                          </div>
                          <span className="font-mono text-[10px] font-bold">{isUnlocked ? `${protocol.cost} XP` : '🔒'}</span>
                       </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8">
                <Button onClick={() => setShowConfirm(true)} disabled={isForging || (activeTab === 'scripture' && !foundVerse)} className="w-full py-6 text-xl rounded-[2rem] animate-glow">
                  {isForging ? 'SCRIBING...' : 'IGNITE THE FORGE'}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className={`w-full aspect-square max-w-[480px] bg-black/60 backdrop-blur-xl border-4 rounded-[3rem] relative overflow-hidden flex items-center justify-center ${isForging ? 'border-yellow-500 shadow-2xl' : 'border-white/10'}`}>
              {isForging ? (
                <div className="text-center space-y-4">
                  <div className="text-8xl animate-spin-slow opacity-60">⚒️</div>
                  <p className="text-yellow-500 font-retro text-[9px] uppercase tracking-widest">{forgeStatus}</p>
                </div>
              ) : previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover animate-fade-in" alt="Artifact" />
              ) : (
                <div className="text-center opacity-30">
                  <div className="text-8xl mb-8 grayscale">{activeTab === 'identity' ? '👤' : activeTab === 'sanctuary' ? '🏞️' : '📜'}</div>
                  <p className="text-white font-serif italic">"Ready to manifest..."</p>
                </div>
              )}
            </div>

            {previewUrl && !isForging && (
              <div className="mt-8 w-full max-w-[480px] flex gap-4">
                <Button onClick={() => equipArtifact(previewUrl)} className="flex-1 bg-green-600 border-green-400 rounded-3xl">EQUIP</Button>
                <Button onClick={() => setPreviewUrl(null)} variant="secondary" className="flex-1 rounded-3xl">DISCARD</Button>
              </div>
            )}
          </div>
        </div>

        {/* --- GALLERY SECTION --- */}
        <div className="w-full bg-black/40 border-t-4 border-white/10 pt-10 pb-20">
            <div className="flex justify-between items-center mb-8 px-4">
                <h2 className="text-2xl font-retro text-white flex items-center gap-3">
                    <span>🏛️</span> Artifact Gallery
                </h2>
                <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
                    <button 
                        onClick={() => setGalleryMode('community')} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${galleryMode === 'community' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Community
                    </button>
                    <button 
                        onClick={() => setGalleryMode('mine')} 
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${galleryMode === 'mine' ? 'bg-yellow-600 text-black shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        My Vault
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4">
                {activeGallery.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-600 font-mono text-sm border-2 border-dashed border-gray-800 rounded-2xl">
                        Vault is empty. Ignite the forge to populate.
                    </div>
                ) : (
                    activeGallery.map((item) => (
                        <div 
                            key={item.id} 
                            onClick={() => setViewingArtifact(item)}
                            className="aspect-square bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-yellow-500 hover:scale-105 transition-all cursor-pointer relative group"
                        >
                            <img src={item.avatar_url} className="w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                <span className="text-yellow-500 font-retro text-[8px] uppercase">{item.collection_name.split(' ')[0]}</span>
                                {item.users && (
                                    <span className="text-white font-bold text-[10px] truncate">{item.users.username}</span>
                                )}
                                <span className="text-green-400 font-mono text-[8px] mt-1">+{item.attached_xp || 0} XP</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl">
          <div className="bg-black/80 border-4 border-red-600/50 p-12 rounded-[4rem] text-center max-w-lg shadow-2xl">
            <div className="text-6xl mb-8 animate-bounce">⚠️</div>
            <h2 className="text-3xl font-retro text-red-500 mb-6 uppercase">XP SACRIFICE</h2>
            <p className="text-gray-300 font-serif mb-12 text-xl">
                Sacrifice {currentTier.cost} Spirit XP?<br/>
                <span className="text-yellow-500 text-sm">The XP will be imbued into the artifact as intrinsic value.</span>
            </p>
            <div className="flex flex-col gap-4">
              <Button onClick={handleForge} className="bg-red-600 border-red-400 py-6 rounded-3xl">IGNITE THE FLAME</Button>
              <Button onClick={() => setShowConfirm(false)} variant="secondary" className="py-5 rounded-3xl">ABORT</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeView;
