
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
  const [myCollection, setMyCollection] = useState<ForgedArtifact[]>([]);
  
  // Scripture Forge State
  const [verseInput, setVerseInput] = useState('');
  const [foundVerse, setFoundVerse] = useState<{ text: string, reference: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT[language][key] || UI_TEXT['en'][key];

  useEffect(() => {
    fetchCollection();
  }, [user]);

  const fetchCollection = async () => {
    if (!user || user.id.startsWith('offline-')) return;
    const { data } = await supabase
      .from('avatar_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
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
        alert("The sacred archives do not recognize this reference.");
      }
    } catch (err) {
      alert("Spiritual connection interrupted.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleForge = async () => {
    if (!user || user.id.startsWith('offline-')) {
      alert("Sync your soul to the Spirit Net for permanent forging.");
      return;
    }

    if (activeTab === 'scripture' && !foundVerse) {
        alert("Locate or scribe a sacred verse before igniting the forge.");
        return;
    }

    const protocol = FORGE_PROTOCOLS.find(p => p.quality === currentTier.quality) || FORGE_PROTOCOLS[0];
    
    // SPEND POINTS WITH TYPE
    const success = await spendPoints(protocol.cost, 'forge_cost');
    if (!success) return;

    setShowConfirm(false);
    setIsForging(true);
    setForgeStatus("Calibrating Manifestation Matrices...");
    AudioSystem.playVoxelTap();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let prompt = "";
      
      const modernStyle = `highly detailed 3D voxel art style, MagicaVoxel render, isometric view, soft ambient occlusion, global illumination, raytraced shadows, vibrant yet spiritual color palette, 8k resolution, clean sharp geometry, Unreal Engine 5 render quality`;
      const classicStyle = `high quality 16-bit pixel art, SNES RPG aesthetic, detailed shading, limited color palette, clean dithering, spiritual and mystical atmosphere, masterpiece, retro game asset style`;

      if (activeTab === 'identity') {
        const arch = user.archetype || 'Seeker';
        if (aesthetic === 'modern') {
            prompt = `${modernStyle}, ${protocol.adj} character portrait of a biblical ${arch}, wearing glowing holy armor with intricate gold details, divine aura radiating, standing on a small floating voxel island, holding a sacred relic, centered composition, white background for profile.`;
        } else {
            prompt = `${classicStyle}, ${protocol.adj} character sprite of a biblical ${arch}, wearing ancient robes and armor, heroic pose, halo effect, detailed face and equipment, fantasy rpg character portrait, solid background.`;
        }
      } else if (activeTab === 'sanctuary') {
        if (aesthetic === 'modern') {
            prompt = `${modernStyle}, ${protocol.adj} wide shot of a peaceful heavenly sanctuary landscape, floating islands with waterfalls, voxel trees with pink and gold leaves, soft volumetric sunlight, divine architecture with white marble and gold, tranquility, scenic view.`;
        } else {
            prompt = `${classicStyle}, ${protocol.adj} panoramic landscape of a holy garden, ancient temple ruins in background, rolling green hills, starlit sky with aurora, peaceful river, pixel art background masterpiece.`;
        }
      } else if (activeTab === 'scripture' && foundVerse) {
        if (aesthetic === 'modern') {
            prompt = `${modernStyle}, ${protocol.adj} 3D voxel diorama artifact. A floating ancient stone monolith. Engraved on the face is the text "${foundVerse.reference.toUpperCase()}". Surrounding it are voxel symbols representing "${foundVerse.text.substring(0, 50)}...". Glowing runes, magical energy particles, divine blue and gold lighting.`;
        } else {
            prompt = `${classicStyle}, ${protocol.adj} legendary rpg item icon, an ancient holy scroll opened revealing glowing scripture text, golden light emitting, magical sparkles, intricate border design, the text "${foundVerse.reference.toUpperCase()}" visible on a tag.`;
        }
      }

      setForgeStatus(`Scribing ${protocol.quality} Pattern...`);
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: prompt,
        config: {
          imageConfig: { aspectRatio: "1:1" }
        }
      });

      let base64Image = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (!base64Image) throw new Error("Manifestation failed.");

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

      await supabase.from('avatar_history').insert({
        user_id: user.id,
        avatar_url: publicUrl,
        style_prompt: activeTab === 'scripture' ? `Verse: ${foundVerse?.reference}` : (activeTab === 'sanctuary' ? 'Sanctuary of Peace' : `${aesthetic.toUpperCase()} ${user.archetype}`),
        collection_name: collectionName
      });

      setPreviewUrl(publicUrl);
      setForgeStatus("FORGE COMPLETE");
      AudioSystem.playLevelComplete();
      onUnlockAchievement('divine_architect');
      fetchCollection();
      
    } catch (err) {
      console.error(err);
      alert("The forge has cooled. Re-sync your Spirit connection.");
    } finally {
      setIsForging(false);
    }
  };

  const equipArtifact = () => {
    if (previewUrl && user) {
      if (activeTab === 'identity') {
        onUpdateUser({ ...user, avatar: previewUrl });
        alert(`IDENTITY UPDATED`);
      } else if (activeTab === 'sanctuary') {
        onUpdateUser({ ...user, sanctuaryBackground: previewUrl });
        alert(`SANCTUARY BACKGROUND SET SITEWIDE`);
      } else {
        alert(`ARTIFACT SAVED TO SCROLLS`);
      }
      onBack();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-20 p-4 relative z-10 custom-scroll">
      <div className="relative z-10 w-full max-w-6xl">
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 border-b-2 border-white/10 pb-6 gap-6 bg-black/30 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-2xl">
          <div className="text-center md:text-left w-full md:w-auto">
            <h1 className="text-3xl md:text-6xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-white to-yellow-600 drop-shadow-md tracking-tighter uppercase">Sacred Forge</h1>
            <p className="text-gray-400 font-mono text-[9px] uppercase tracking-[0.5em] mt-2">Manifestation Protocol v3.0 // Tier: <span className="text-yellow-500 font-bold">{currentTier.quality}</span></p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex gap-2 w-full md:w-auto bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md overflow-x-auto no-scrollbar">
              {(['identity', 'sanctuary', 'scripture'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => { AudioSystem.playVoxelTap(); setActiveTab(tab); setPreviewUrl(null); }}
                  className={`flex-1 md:flex-none px-4 md:px-6 py-2 font-retro text-[8px] md:text-[9px] border-2 transition-all rounded-xl whitespace-nowrap ${activeTab === tab ? 'bg-yellow-600 border-white text-black shadow-lg' : 'bg-black/40 text-gray-500 border-white/5 hover:text-white'}`}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>
            <Button onClick={onBack} variant="secondary" className="px-6 py-2 text-xs w-full md:w-auto flex items-center justify-center gap-2">
               🏠 Home
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start mb-16">
          <div className="space-y-6 w-full max-w-xl mx-auto lg:mx-0">
            <div className="bg-black/30 backdrop-blur-2xl border-4 border-white/10 p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
              <div className="mb-8 space-y-4">
                  <div className="flex justify-between items-center mb-4">
                      <label className="text-gray-400 text-[10px] font-retro uppercase tracking-widest drop-shadow-md">Select Style Protocol</label>
                      <span className="hidden sm:inline-block text-[8px] bg-yellow-900/40 text-yellow-500 px-2 py-0.5 rounded font-mono border border-yellow-700/30">STYLE_PROTOCOL_V3</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => { AudioSystem.playVoxelTap(); setAesthetic('modern'); }} 
                        className={`group relative overflow-hidden p-4 md:p-6 rounded-[2rem] border-2 transition-all backdrop-blur-md ${aesthetic === 'modern' ? 'bg-blue-600/60 border-white text-white scale-105 shadow-xl' : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/20'}`}
                      >
                          <div className="text-2xl md:text-3xl mb-1 group-hover:scale-110 transition-transform">🧊</div>
                          <div className="font-retro text-[8px] md:text-[9px] uppercase drop-shadow-md">Modern</div>
                          <div className="text-[7px] mt-1 opacity-60 font-mono">3D ISOMETRIC</div>
                          {aesthetic === 'modern' && <div className="absolute top-0 right-0 bg-white text-blue-600 px-2 py-0.5 text-[7px] font-bold rounded-bl-xl shadow-lg">ACTIVE</div>}
                      </button>
                      <button 
                        onClick={() => { AudioSystem.playVoxelTap(); setAesthetic('classic'); }} 
                        className={`group relative overflow-hidden p-4 md:p-6 rounded-[2rem] border-2 transition-all backdrop-blur-md ${aesthetic === 'classic' ? 'bg-purple-600/60 border-white text-white scale-105 shadow-xl' : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/20'}`}
                      >
                          <div className="text-2xl md:text-3xl mb-1 group-hover:scale-110 transition-transform">👾</div>
                          <div className="font-retro text-[8px] md:text-[9px] uppercase drop-shadow-md">Classic</div>
                          <div className="text-[7px] mt-1 opacity-60 font-mono">2D RETRO</div>
                          {aesthetic === 'classic' && <div className="absolute top-0 right-0 bg-white text-purple-600 px-2 py-0.5 text-[7px] font-bold rounded-bl-xl shadow-lg">ACTIVE</div>}
                      </button>
                  </div>
              </div>

              {activeTab === 'sanctuary' && (
                  <div className="mb-8 animate-fade-in text-center">
                      <div className="bg-cyan-900/20 backdrop-blur-md p-4 md:p-6 rounded-[2rem] border border-cyan-800/30 mb-6 shadow-inner">
                        <h4 className="text-cyan-400 font-retro text-[9px] md:text-[10px] uppercase mb-2">Sanctuary Definition</h4>
                        <p className="text-gray-200 text-xs md:text-sm font-serif italic leading-relaxed">"{t('sanctuary_def')}"</p>
                      </div>
                  </div>
              )}

              {activeTab === 'scripture' && (
                <div className="mb-8 animate-slide-up space-y-6">
                  <div className="relative group/input">
                    <label className="block text-gray-400 text-[10px] font-retro uppercase mb-3 ml-1 tracking-widest drop-shadow-md">Sacred Verse Search</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input 
                            type="text" 
                            value={verseInput}
                            onChange={(e) => setVerseInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && lookupVerse()}
                            placeholder="e.g. Psalm 23"
                            className="flex-1 bg-black/40 border-2 border-white/10 rounded-2xl p-3 md:p-4 text-white font-serif outline-none focus:border-yellow-500 transition-all shadow-inner text-sm md:text-base"
                        />
                        <button 
                            onClick={() => lookupVerse()}
                            disabled={isSearching}
                            className="bg-yellow-600 hover:bg-yellow-500 text-black px-6 py-3 sm:py-0 rounded-2xl font-retro text-[10px] shadow-lg active:scale-95 transition-all"
                        >
                            {isSearching ? '...' : '🔍'}
                        </button>
                    </div>
                  </div>

                  {foundVerse && (
                      <div className="bg-white/5 backdrop-blur-md p-4 md:p-6 rounded-[2rem] border-2 border-yellow-600/30 animate-fade-in shadow-inner relative overflow-hidden">
                          <p className="text-white font-serif italic text-base md:text-lg leading-relaxed drop-shadow-md">"{foundVerse.text}"</p>
                          <div className="text-right mt-4">
                              <span className="text-white font-mono text-[9px] font-bold bg-yellow-900/40 px-3 py-1 rounded-full border border-yellow-700/50 shadow-md">{foundVerse.reference}</span>
                          </div>
                      </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <label className="block text-gray-400 text-[10px] font-retro uppercase mb-2 ml-1 tracking-widest drop-shadow-md">Protocol Tier</label>
                <div className="grid grid-cols-1 gap-3">
                  {FORGE_PROTOCOLS.map((protocol) => {
                    const isUnlocked = totalPoints >= protocol.minXP;
                    const isActive = currentTier.id === protocol.id;
                    
                    return (
                      <div 
                        key={protocol.id} 
                        className={`p-3 md:p-4 rounded-2xl border transition-all relative overflow-hidden ${
                          isActive 
                            ? 'bg-yellow-900/20 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' 
                            : isUnlocked 
                              ? 'bg-black/40 border-white/10 opacity-60' 
                              : 'bg-black/20 border-white/5 opacity-30 grayscale'
                        }`}
                      >
                         <div className="flex justify-between items-center relative z-10">
                            <div className="flex flex-col">
                               <span className={`font-retro text-[8px] md:text-[9px] uppercase tracking-widest ${isActive ? 'text-yellow-400' : isUnlocked ? 'text-gray-300' : 'text-gray-600'}`}>
                                  {protocol.name}
                               </span>
                               <span className="text-[7px] md:text-[8px] font-mono text-gray-500 mt-0.5">
                                  {isUnlocked ? `${protocol.quality} Quality` : `Req: ${protocol.minXP.toLocaleString()} XP`}
                               </span>
                            </div>
                            <div className="text-right">
                               {isUnlocked ? (
                                  <span className={`font-mono text-[9px] md:text-[10px] font-bold ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                     {protocol.cost} XP
                                  </span>
                               ) : (
                                  <span className="text-lg">🔒</span>
                               )}
                            </div>
                         </div>
                         {isActive && <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent pointer-events-none" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 md:mt-12">
                <Button 
                  onClick={() => setShowConfirm(true)} 
                  disabled={isForging || (activeTab === 'scripture' && !foundVerse)}
                  className={`w-full py-5 md:py-6 text-lg md:text-xl shadow-2xl rounded-[2rem] ${isForging || (activeTab === 'scripture' && !foundVerse) ? 'opacity-50 grayscale cursor-not-allowed' : 'animate-glow'}`}
                >
                  <span className="font-retro">
                    {isForging ? 'IGNITING...' : (activeTab === 'scripture' && !foundVerse) ? 'SELECT RECORD' : `IGNITE THE FORGE`}
                  </span>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center w-full">
            <div className={`w-full aspect-square max-w-[480px] bg-black/60 backdrop-blur-xl border-4 rounded-[3rem] md:rounded-[4rem] relative overflow-hidden flex items-center justify-center transition-all duration-700 ${isForging ? 'border-yellow-500 shadow-[0_0_80px_rgba(234,179,8,0.3)] scale-105' : 'border-white/10 shadow-2xl shadow-black'}`}>
              {isForging ? (
                <div className="text-center space-y-6 md:space-y-8 animate-pulse z-20">
                  <div className="text-7xl md:text-9xl animate-spin-slow opacity-60 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]">{aesthetic === 'modern' ? '🧊' : '🎨'}</div>
                  <p className="text-yellow-500 font-retro text-[9px] md:text-[10px] tracking-[0.4em] uppercase drop-shadow-md">{forgeStatus}</p>
                </div>
              ) : previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover animate-fade-in z-20" alt="Artifact" />
              ) : (
                <div className="text-center p-8 md:p-12 opacity-30 group-hover:opacity-50 transition-opacity z-20">
                  <div className="text-[80px] md:text-[120px] mb-6 md:mb-8 grayscale animate-float drop-shadow-2xl">
                      {activeTab === 'identity' ? (aesthetic === 'modern' ? '👤' : '🖼️') : activeTab === 'sanctuary' ? '🏞️' : '📜'}
                  </div>
                  <p className="text-white font-serif italic text-lg md:text-xl">"Manifest your spirit, pilgrim."</p>
                </div>
              )}
            </div>

            {previewUrl && !isForging && (
              <div className="mt-8 md:mt-10 w-full max-w-[480px] flex flex-col sm:flex-row gap-4 animate-slide-up">
                <Button onClick={equipArtifact} className="flex-1 bg-green-600/80 backdrop-blur-md border-green-400 py-4 md:py-5 font-retro text-[9px] md:text-[10px] shadow-2xl rounded-3xl">
                  EQUIP ARTIFACT
                </Button>
                <Button onClick={() => setPreviewUrl(null)} variant="secondary" className="flex-1 py-4 md:py-5 font-retro text-[9px] md:text-[10px] border-white/10 bg-black/40 backdrop-blur-md rounded-3xl">
                  DISCARD
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl animate-fade-in">
          <div className="bg-black/80 border-4 border-red-600/50 p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] max-w-lg text-center shadow-[0_0_100px_rgba(220,38,38,0.4)] animate-slide-up relative overflow-hidden backdrop-blur-3xl">
            <div className="text-5xl md:text-6xl mb-6 md:mb-8 relative z-10 animate-bounce">⚠️</div>
            <h2 className="text-3xl md:text-4xl font-retro text-red-500 mb-6 uppercase tracking-tighter drop-shadow-md">XP SACRIFICE</h2>
            <p className="text-gray-300 font-serif mb-8 md:mb-12 text-lg md:text-xl leading-relaxed">
              Manifesting this {aesthetic} artifact requires a spiritual sacrifice of <span className="text-white font-bold drop-shadow-md">{currentTier.cost} Spirit XP</span>. 
            </p>
            <div className="flex flex-col gap-4">
              <Button onClick={handleForge} className="bg-red-600 border-red-400 py-5 md:py-6 font-retro text-xs shadow-2xl rounded-3xl">IGNITE THE FLAME</Button>
              <Button onClick={() => setShowConfirm(false)} variant="secondary" className="py-4 md:py-5 font-retro text-[10px] border-white/10 bg-white/5 rounded-3xl">ABORT PROTOCOL</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgeView;
