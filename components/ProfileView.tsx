
import React, { useState, useEffect, useMemo } from 'react';
import Button from './Button';
import { PLAYER_LEVELS, BADGES, ARCHETYPES } from '../constants';
import { User } from '../types';
import { LanguageCode, UI_TEXT } from '../translations';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { findBiblicalVerse } from '../services/geminiService';
import { GoogleGenAI } from "@google/genai";

interface ProfileViewProps {
  user: User | null;
  totalPoints: number;
  unlockedAchievements: string[];
  collectedVerses: string[];
  onBack: () => void;
  onUpdateUser: (updatedUser: User) => void;
  language: LanguageCode;
  onUnlockAchievement?: (id: string) => void;
  onAwardBadge?: (id: string) => void;
  onConvertGuest?: () => void; 
  onConvertGuestAction?: (email: string, password: string, username: string) => Promise<void>;
  spendPoints?: (amount: number, type?: string) => Promise<boolean>;
  onAddPoints?: (amount: number) => void;
  onGoToAdmin?: () => void;
}

interface ArchiveImage {
    id: string;
    name: string;
    url: string;
    type: 'Identity' | 'Sanctuary' | 'Scripture';
    style: 'Modern' | 'Classic';
    createdAt: string;
    collection?: string;
    is_listed?: boolean;
}

const ProfileView: React.FC<ProfileViewProps> = ({ 
  user, totalPoints, unlockedAchievements, collectedVerses, onBack, onUpdateUser, language, 
  onUnlockAchievement, onAwardBadge, onConvertGuest, onConvertGuestAction, 
  spendPoints, onAddPoints, onGoToAdmin 
}) => {
  const [activeTab, setActiveTab] = useState<'passport' | 'archetype' | 'studio'>('passport');
  const [studioSubTab, setStudioSubTab] = useState<'identity' | 'sanctuary' | 'scripture'>('identity');
  const [aesthetic, setAesthetic] = useState<'modern' | 'classic'>('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMsg, setGenerationMsg] = useState('');
  const [showForgeWarning, setShowForgeWarning] = useState(false);
  const [archiveImages, setArchiveImages] = useState<ArchiveImage[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);

  // Verse Forge Specific State
  const [verseInput, setVerseInput] = useState('');
  const [foundVerse, setFoundVerse] = useState<{ text: string, reference: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Listing State
  const [showListingModal, setShowListingModal] = useState(false);
  const [listingPrice, setListingPrice] = useState(1000);
  const [infusedXp, setInfusedXp] = useState(100);
  const [isListing, setIsListing] = useState(false);

  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT[language][key] || UI_TEXT['en'][key];
  const isGuest = user?.id.startsWith('offline-');

  useEffect(() => {
      if (activeTab === 'studio' && user && !isGuest) {
          fetchArchive();
      }
      if (user) {
        if (studioSubTab === 'identity') setSelectedPreview(user.avatar);
        else if (studioSubTab === 'sanctuary') setSelectedPreview(user.sanctuaryBackground || null);
        else setSelectedPreview(null);
      }
  }, [activeTab, studioSubTab, user]);

  const fetchArchive = async () => {
    if (!user) return;
    setLoadingArchive(true);
    try {
        const { data: history } = await supabase.from('avatar_history').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        const { data: listings } = await supabase.from('marketplace_listings').select('avatar_id').eq('seller_id', user.id).eq('status', 'active');
        const activeListingIds = new Set(listings?.map(l => l.avatar_id) || []);

        if (history) {
            setArchiveImages(history.map((h: any) => {
              let type: 'Identity' | 'Sanctuary' | 'Scripture' = 'Identity';
              const coll = (h.collection_name || '').toUpperCase();
              if (coll.includes('SANCTUARY')) type = 'Sanctuary';
              else if (coll.includes('SCRIPTURE')) type = 'Scripture';
              
              const style: 'Modern' | 'Classic' = coll.includes('MODERN') ? 'Modern' : 'Classic';
              
              return {
                id: h.id, 
                name: h.style_prompt || 'Artifact', 
                url: h.avatar_url, 
                type,
                style,
                createdAt: h.created_at, 
                collection: h.collection_name,
                is_listed: activeListingIds.has(h.id)
              };
            }));
        }
    } catch (e) { console.error(e); }
    setLoadingArchive(false);
  };

  const filteredArchive = useMemo(() => {
    return archiveImages.filter(img => {
      if (studioSubTab === 'identity') return img.type === 'Identity';
      if (studioSubTab === 'sanctuary') return img.type === 'Sanctuary';
      if (studioSubTab === 'scripture') return img.type === 'Scripture';
      return true;
    });
  }, [archiveImages, studioSubTab]);

  const lookupVerse = async () => {
    if (!verseInput.trim()) return;
    setIsSearching(true);
    setFoundVerse(null);
    AudioSystem.playVoxelTap();
    
    try {
      const data = await findBiblicalVerse(verseInput, language);
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

  const generateNewArtifact = async () => {
    if (isGuest || !user) return;
    if (studioSubTab === 'scripture' && !foundVerse) {
        alert("Locate a holy verse before igniting the forge.");
        return;
    }

    if (spendPoints) {
        const success = await spendPoints(1000, 'forge_cost');
        if (!success) return;
    }
    
    setShowForgeWarning(false);
    setIsGenerating(true);
    setGenerationMsg(`Manifesting ${aesthetic} ${studioSubTab}...`);
    
    const archeytpeClass = user.archetype || 'Wanderer';
    let prompt = "";
    
    const modernStyle = `highly detailed 3D voxel art style, Minecraft blocky geometry, isometric perspective, soft volumetric lighting, clean sharp edges, masterpiece quality, 8k resolution`;
    const classicStyle = `high quality detailed pixel art style, 16-bit retro game aesthetic, vibrant colors, clean linework, spiritual atmosphere, masterpiece`;

    if (aesthetic === 'modern') {
        if (studioSubTab === 'identity') {
            prompt = `${modernStyle}, character portrait of a biblical ${archeytpeClass}, glowing holy armor, white background`;
        } else if (studioSubTab === 'sanctuary') {
            prompt = `${modernStyle}, wide shot of a peaceful and serene heavenly sanctuary landscape, divine nature, soft sunlight, flowing waters of life, tranquility, no characters`;
        } else if (studioSubTab === 'scripture') {
            prompt = `${modernStyle}, 3D voxel diorama. Floating cubic monolith. On the center face, the text "${foundVerse?.reference.toUpperCase()}" is engraved. Voxel symbols representing: "${foundVerse?.text}". Divine blue and gold lighting.`;
        }
    } else {
        if (studioSubTab === 'identity') {
            prompt = `${classicStyle}, portrait of a biblical ${archeytpeClass}, glowing holy aura, clean sprite art, white background`;
        } else if (studioSubTab === 'sanctuary') {
            prompt = `${classicStyle}, wide shot of a holy sanctuary garden, divine peaceful environment, vibrant colors, no characters`;
        } else if (studioSubTab === 'scripture') {
            prompt = `${classicStyle}, ornate ancient scripture scroll or stone tablet, glowing divine light, magical sparkles, mystical atmosphere, the text "${foundVerse?.reference.toUpperCase()}" visible.`;
        }
    }
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: prompt,
            config: { imageConfig: { aspectRatio: "1:1" } }
        });

        let base64Image = "";
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                base64Image = part.inlineData.data;
                break;
            }
        }

        if (!base64Image) throw new Error("Manifestation failed.");

        const binaryString = atob(base64Image);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/png' });

        const uniqueId = Date.now().toString(36);
        const folder = studioSubTab === 'identity' ? 'avatars' : studioSubTab === 'sanctuary' ? 'backgrounds' : 'verses';
        const fileName = `${folder}/${user.id}/${uniqueId}.png`;
        
        await supabase.storage.from('journey_assets').upload(fileName, blob, { contentType: 'image/png' });
        const { data: urlData } = supabase.storage.from('journey_assets').getPublicUrl(fileName);
        const permanentUrl = urlData.publicUrl;
        
        const collectionName = `${aesthetic.charAt(0).toUpperCase() + aesthetic.slice(1)} ${studioSubTab.charAt(0).toUpperCase() + studioSubTab.slice(1)}`;

        await supabase.from('avatar_history').insert({ 
            user_id: user.id, 
            avatar_url: permanentUrl, 
            style_prompt: studioSubTab === 'scripture' ? `Verse: ${foundVerse?.reference}` : (studioSubTab === 'identity' ? `Forged ${aesthetic} ${archeytpeClass} Identity` : `Forged ${aesthetic} Sanctuary of Peace`), 
            collection_name: collectionName
        });
        
        setSelectedPreview(permanentUrl);
        fetchArchive();
        if (onUnlockAchievement) onUnlockAchievement('divine_architect');
    } catch (error) { 
        console.error(error); 
        alert("The forge has cooled. Spirit connection lost.");
    } finally { 
        setIsGenerating(false); 
    }
  };

  const handleApplyIdentity = () => {
    if (user && selectedPreview) {
        if (studioSubTab === 'identity') {
          onUpdateUser({ ...user, avatar: selectedPreview });
          alert("SPIRIT IDENTITY UPDATED");
        } else if (studioSubTab === 'sanctuary') {
          onUpdateUser({ ...user, sanctuaryBackground: selectedPreview });
          alert("SANCTUARY ESTABLISHED SITEWIDE");
        } else {
          alert("SCRIPTURE ARTIFACT SAVED TO COLLECTION");
        }
        AudioSystem.playLevelComplete();
    }
  };

  const handleListForSale = async () => {
      if (!user || !selectedArtifactId) return;
      if (infusedXp > totalPoints) return alert("You cannot infuse more XP than you possess.");
      
      setIsListing(true);
      try {
          const { data, error } = await supabase.rpc('list_avatar', {
              p_avatar_id: selectedArtifactId,
              p_seller_id: user.id,
              p_price: listingPrice,
              p_attached_xp: infusedXp
          });

          if (error) throw error;

          AudioSystem.playAchievement();
          alert("Artifact Transferred to Marketplace!");
          setShowListingModal(false);
          fetchArchive();
          if (onAddPoints) onAddPoints(0); 
      } catch (e: any) {
          alert("Failed to list: " + e.message);
      } finally {
          setIsListing(false);
      }
  };

  const handleSelectArchetype = (archName: string) => {
    if (!user) return;
    AudioSystem.playAchievement();
    onUpdateUser({ ...user, archetype: archName });
    alert(`Spirit Path Vowed: ${archName.toUpperCase()}`);
  };

  const isCurrentSelectionListed = useMemo(() => {
    return archiveImages.find(img => img.id === selectedArtifactId)?.is_listed;
  }, [selectedArtifactId, archiveImages]);

  if (!user) return null;
  const currentLevel = PLAYER_LEVELS.filter(l => l.xp <= totalPoints).pop() || PLAYER_LEVELS[0];
  const nextLevel = PLAYER_LEVELS.find(l => l.level === currentLevel.level + 1);
  const progressPercent = nextLevel ? Math.min(100, ((totalPoints - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100) : 100;
  const currentArchInfo = ARCHETYPES.find(a => a.name === user.archetype);

  // Check if user is admin or explicitly "Rei" (Robust check)
  const isAdmin = user.role === 'admin' || user.username?.trim().toLowerCase() === 'rei' || user.email === 'uyiedos@gmail.com';

  return (
    <div className="min-h-screen flex flex-col items-center pt-20 relative">
      <div className="relative z-10 w-full max-w-5xl p-4 md:p-8">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-black/40 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl">
           <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="relative group">
                <img src={user.avatar} className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-yellow-500 object-cover bg-black shadow-xl transition-transform group-hover:scale-105" />
                <div className="absolute -bottom-2 -right-2 bg-yellow-600 text-black font-bold text-xs px-3 py-1 rounded-full border-2 border-white shadow-xl">Lvl {currentLevel.level}</div>
              </div>
              <div>
                 <h1 className="text-3xl md:text-5xl font-retro text-white uppercase tracking-tighter drop-shadow-md">{user.username}</h1>
                 <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-2">
                    <span className="text-xs bg-blue-900/60 backdrop-blur-md text-blue-300 px-3 py-1 rounded-full border border-blue-500/50 uppercase font-retro inline-block w-fit mx-auto md:mx-0">{user.archetype || 'Wanderer'}</span>
                    <span className="text-gray-400 font-mono text-[10px] uppercase tracking-widest drop-shadow-md">Network Pilgrim</span>
                 </div>
              </div>
           </div>
           <div className="flex gap-2 flex-wrap justify-center bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
             <Button onClick={() => setActiveTab('passport')} variant={activeTab === 'passport' ? 'primary' : 'secondary'} className="text-[10px] px-4 md:px-6 py-2">Passport</Button>
             <Button onClick={() => setActiveTab('archetype')} variant={activeTab === 'archetype' ? 'primary' : 'secondary'} className="text-[10px] px-4 md:px-6 py-2">Archetype</Button>
             <Button onClick={() => setActiveTab('studio')} variant={activeTab === 'studio' ? 'primary' : 'secondary'} className="text-[10px] px-4 md:px-6 py-2">Studio</Button>
             {isAdmin && onGoToAdmin && (
                 <Button onClick={onGoToAdmin} className="text-[10px] px-4 md:px-6 py-2 bg-red-900/80 border-red-600 hover:bg-red-800 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse">ADMIN</Button>
             )}
             <Button onClick={onBack} variant="secondary" className="text-[10px] ml-2 px-3 py-2">✕</Button>
           </div>
        </div>

        <div className="bg-black/30 backdrop-blur-2xl border-4 border-white/10 rounded-[2rem] md:rounded-[3rem] p-4 md:p-10 min-h-[600px] flex flex-col relative overflow-hidden shadow-2xl">
          {activeTab === 'passport' && (
            <div className="space-y-10 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-black/40 backdrop-blur-md p-8 rounded-[2rem] border border-white/10 shadow-inner">
                    <h3 className="text-yellow-500 font-retro text-[10px] uppercase mb-8 border-b border-white/10 pb-3 tracking-widest text-center md:text-left">Network Telemetry</h3>
                    <div className="grid grid-cols-2 gap-8 text-center md:text-left">
                       <div className="group">
                          <span className="block text-gray-500 text-[9px] font-mono uppercase mb-1">Total Spirit XP</span>
                          <span className="text-3xl md:text-4xl text-white font-mono font-bold leading-none">{totalPoints.toLocaleString()}</span>
                       </div>
                       <div className="group">
                          <span className="block text-gray-500 text-[9px] font-mono uppercase mb-1">Vowed Rank</span>
                          <span className="text-xl md:text-2xl text-yellow-400 font-serif font-bold italic block">{currentLevel.title}</span>
                       </div>
                    </div>
                    <div className="mt-10">
                       <div className="flex justify-between text-[10px] text-gray-400 mb-3 uppercase font-retro tracking-tighter">
                          <span>Progress to Next Light</span>
                          <span className="text-yellow-500 animate-pulse">{Math.floor(progressPercent)}%</span>
                       </div>
                       <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden border border-white/5 p-1">
                          <div className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-yellow-500 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                       </div>
                    </div>
                 </div>

                 {currentArchInfo && (
                    <div className="bg-blue-900/10 backdrop-blur-md p-8 rounded-[2rem] border border-blue-900/30 flex flex-col justify-between group hover:bg-blue-900/20 transition-all shadow-xl items-center md:items-start text-center md:text-left">
                       <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                          <div className="text-6xl bg-blue-900/30 w-24 h-24 rounded-3xl flex items-center justify-center border border-blue-500/50 shadow-2xl group-hover:scale-105 transition-transform">{currentArchInfo.icon}</div>
                          <div>
                             <h4 className="text-blue-400 font-retro text-[10px] uppercase mb-1 tracking-widest">Primary Attribute</h4>
                             <p className="text-3xl text-white font-serif font-bold tracking-tight">{currentArchInfo.stat}</p>
                          </div>
                       </div>
                       <p className="text-gray-300 text-sm mt-6 italic font-serif leading-relaxed border-l-2 border-blue-500/40 pl-4 py-1">
                          "{currentArchInfo.desc}"
                       </p>
                    </div>
                 )}
              </div>
              
              <div>
                <h3 className="text-purple-400 font-retro text-[10px] uppercase mb-8 tracking-widest ml-1 flex items-center justify-center md:justify-start gap-3">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Sacred Merit Registry
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 md:gap-5">
                  {BADGES.map(badge => {
                    const unlocked = user.badges.includes(badge.id);
                    return (
                      <div key={badge.id} className={`group relative p-3 md:p-4 rounded-3xl border transition-all duration-500 ${unlocked ? 'bg-white/10 backdrop-blur-md border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105 cursor-help' : 'bg-black/20 border-white/5 opacity-20 grayscale'}`}>
                        <div className="text-3xl md:text-4xl mb-2 text-center group-hover:animate-bounce">{badge.icon}</div>
                        <div className="text-[6px] md:text-[7px] font-bold text-white uppercase text-center truncate tracking-tighter">{badge.name}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'archetype' && (
            <div className="animate-fade-in">
                <div className="mb-12 text-center">
                    <h2 className="text-3xl md:text-4xl font-retro text-blue-400 mb-3 uppercase tracking-tighter">Vow Your Path</h2>
                    <p className="text-gray-400 font-serif italic text-sm md:text-base">Selecting an Archetype defines your role and influences forge manifestations.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                    {ARCHETYPES.map(arch => (
                        <div key={arch.name} onClick={() => handleSelectArchetype(arch.name)} className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all hover:-translate-y-2 group flex flex-col justify-between backdrop-blur-md ${user.archetype === arch.name ? 'bg-blue-900/30 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'bg-black/40 border-white/10 hover:border-blue-700/50'}`}>
                            <div className="flex justify-between items-start mb-6">
                                <span className="text-5xl group-hover:scale-110 transition-transform">{arch.icon}</span>
                                <span className="text-[10px] font-retro text-blue-500 uppercase tracking-widest">{arch.role}</span>
                            </div>
                            <div>
                                <h3 className="text-white font-retro text-sm mb-3 uppercase">{arch.name}</h3>
                                <p className="text-gray-300 text-xs font-serif leading-relaxed mb-6 italic">"{arch.desc}"</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="animate-fade-in flex flex-col gap-6 md:gap-10">
               <div className="flex justify-center flex-wrap border-b border-white/10 pb-4 mb-2 md:mb-4 gap-4 md:gap-8">
                  <button onClick={() => setStudioSubTab('identity')} className={`text-[10px] md:text-sm font-retro uppercase pb-2 transition-all whitespace-nowrap ${studioSubTab === 'identity' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}>Identity</button>
                  <button onClick={() => setStudioSubTab('sanctuary')} className={`text-[10px] md:text-sm font-retro uppercase pb-2 transition-all whitespace-nowrap ${studioSubTab === 'sanctuary' ? 'text-cyan-500 border-b-2 border-cyan-500' : 'text-gray-500 hover:text-gray-300'}`}>Sanctuary</button>
                  <button onClick={() => setStudioSubTab('scripture')} className={`text-[10px] md:text-sm font-retro uppercase pb-2 transition-all whitespace-nowrap ${studioSubTab === 'scripture' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-gray-500 hover:text-gray-300'}`}>Verse Forge</button>
               </div>

               <div className="flex justify-center gap-3 mb-4 md:mb-6">
                  <button onClick={() => setAesthetic('modern')} className={`px-4 py-2 rounded-full text-[8px] md:text-[9px] font-retro uppercase border-2 transition-all ${aesthetic === 'modern' ? 'bg-blue-600 border-white text-white' : 'bg-black/40 border-white/10 text-gray-500'}`}>Modern</button>
                  <button onClick={() => setAesthetic('classic')} className={`px-4 py-2 rounded-full text-[8px] md:text-[9px] font-retro uppercase border-2 transition-all ${aesthetic === 'classic' ? 'bg-purple-600 border-white text-white' : 'bg-black/40 border-white/10 text-gray-500'}`}>Classic</button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="flex flex-col items-center">
                      <div className="text-center mb-6 md:mb-8">
                        <h2 className={`text-3xl md:text-4xl font-retro mb-2 uppercase tracking-tighter ${studioSubTab === 'identity' ? 'text-yellow-400' : studioSubTab === 'sanctuary' ? 'text-cyan-400' : 'text-amber-400'}`}>
                            {studioSubTab === 'identity' ? 'Avatar Forge' : studioSubTab === 'sanctuary' ? 'Sanctuary Forge' : 'Verse Forge'}
                        </h2>
                        <p className="text-gray-400 font-serif italic text-xs md:text-sm drop-shadow-md">
                            {studioSubTab === 'identity' ? 'Forge your profile identity.' : studioSubTab === 'sanctuary' ? t('sanctuary_def') : 'Forging scriptures into artifacts.'}
                        </p>
                      </div>

                      {studioSubTab === 'scripture' && (
                        <div className="w-full max-w-sm mb-6 space-y-4">
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={verseInput}
                                    onChange={(e) => setVerseInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && lookupVerse()}
                                    placeholder="e.g. Genesis 1:1"
                                    className="flex-1 bg-black/40 border-2 border-white/10 rounded-2xl p-3 text-white font-serif outline-none focus:border-amber-500 transition-all shadow-inner text-sm"
                                />
                                <button 
                                    onClick={lookupVerse}
                                    disabled={isSearching}
                                    className="bg-amber-600 hover:bg-amber-500 text-black px-4 rounded-2xl font-retro text-[10px] shadow-lg active:scale-95 transition-all"
                                >
                                    {isSearching ? '...' : '🔍'}
                                </button>
                            </div>
                            {foundVerse && (
                                <div className="bg-amber-900/20 backdrop-blur-md p-4 rounded-2xl border-2 border-amber-600/40 animate-fade-in shadow-inner">
                                    <p className="text-gray-100 font-serif italic text-sm leading-relaxed line-clamp-2">"{foundVerse.text}"</p>
                                    <p className="text-right text-amber-500 font-mono text-[9px] font-bold mt-1">{foundVerse.reference}</p>
                                </div>
                            )}
                        </div>
                      )}

                      <div className="w-full max-w-sm bg-black/30 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-white/10 shadow-2xl relative group mb-8">
                        <div className="relative z-10">
                            <div className="w-full aspect-square mx-auto mb-6 md:mb-8 rounded-[2rem] border-4 border-white/10 flex items-center justify-center bg-black/60 overflow-hidden shadow-inner relative">
                                {isGenerating ? (
                                    <div className="flex flex-col items-center gap-6"><div className="text-6xl animate-spin">⚙️</div><p className="text-[10px] text-yellow-500 font-retro animate-pulse uppercase tracking-widest text-center">{generationMsg}</p></div>
                                ) : (
                                    <>
                                        <img src={selectedPreview || (studioSubTab === 'identity' ? user.avatar : (studioSubTab === 'sanctuary' ? (user.sanctuaryBackground || '') : ''))} className="w-full h-full object-cover" />
                                        {(selectedPreview && selectedPreview !== (studioSubTab === 'identity' ? user.avatar : user.sanctuaryBackground)) && <div className="absolute top-4 right-4 bg-blue-600 text-white font-retro text-[8px] px-2 py-1 rounded border border-white animate-pulse uppercase shadow-lg">PREVIEW</div>}
                                        {isCurrentSelectionListed && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-yellow-500 font-retro text-xs border-4 border-yellow-600">LISTED</div>}
                                        {!selectedPreview && studioSubTab === 'scripture' && (
                                            <div className="text-center p-8 opacity-20">
                                                <div className="text-6xl mb-4 text-white">📜</div>
                                                <p className="text-[10px] font-retro text-white uppercase tracking-widest">Select Verse</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                {(selectedPreview && selectedPreview !== (studioSubTab === 'identity' ? user.avatar : user.sanctuaryBackground)) ? (
                                    <Button onClick={handleApplyIdentity} className={`w-full py-4 text-sm shadow-lg animate-glow ${studioSubTab === 'identity' ? 'bg-yellow-600 border-yellow-400' : studioSubTab === 'sanctuary' ? 'bg-cyan-600 border-cyan-400' : 'bg-amber-600 border-amber-400'}`}>
                                        {studioSubTab === 'identity' ? 'APPLY IDENTITY' : studioSubTab === 'sanctuary' ? 'SET SANCTUARY' : 'SAVE TO VAULT'}
                                    </Button>
                                ) : (
                                    <Button onClick={() => setShowForgeWarning(true)} disabled={isGenerating || (studioSubTab === 'scripture' && !foundVerse)} className="w-full py-4 text-[10px] md:text-sm">FORGE NEW {aesthetic.toUpperCase()} (-1000 XP)</Button>
                                )}

                                {selectedArtifactId && !isCurrentSelectionListed && !isGenerating && (
                                    <button 
                                      onClick={() => setShowListingModal(true)}
                                      className="w-full bg-green-900/40 hover:bg-green-800/60 backdrop-blur-md border border-green-700 text-green-400 py-3 rounded-2xl font-retro text-[9px] uppercase tracking-widest transition-all mt-2 shadow-lg"
                                    >
                                        List on Marketplace
                                    </button>
                                )}
                            </div>
                        </div>
                      </div>
                  </div>

                  <div className="flex flex-col h-[500px] md:h-[600px] bg-white/5 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3rem] border-2 border-white/10 p-6 md:p-8 shadow-2xl">
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-3">
                            <h3 className={`font-retro text-[10px] uppercase tracking-widest flex items-center gap-3 ${studioSubTab === 'identity' ? 'text-purple-400' : studioSubTab === 'sanctuary' ? 'text-cyan-400' : 'text-amber-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${studioSubTab === 'identity' ? 'bg-purple-600' : studioSubTab === 'sanctuary' ? 'bg-cyan-600' : 'bg-amber-600'}`}></span>{studioSubTab === 'identity' ? 'IDENTITY VAULT' : studioSubTab === 'sanctuary' ? 'SANCTUARY VAULT' : 'VERSE VAULT'}</h3>
                            <span className="text-[9px] font-mono text-gray-500">{filteredArchive.length} SAVED</span>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
                            {loadingArchive ? (
                              <div className="h-full flex items-center justify-center text-purple-600 font-retro text-[10px] animate-pulse uppercase">Syncing...</div>
                            ) : filteredArchive.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10"><div className="text-6xl mb-4 text-white">✨</div><p className="text-xs font-serif italic text-white">"Vault empty."</p></div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-10">
                                  {filteredArchive.map(img => (
                                    <div key={img.id} onClick={() => { setSelectedPreview(img.url); setSelectedArtifactId(img.id); AudioSystem.playVoxelTap(); }} className={`group relative aspect-square bg-black rounded-3xl overflow-hidden border-2 transition-all cursor-pointer shadow-xl ${selectedPreview === img.url ? 'border-yellow-500 scale-105 shadow-yellow-500/20' : 'border-white/5 opacity-80 hover:opacity-100 hover:border-white/20'}`}>
                                        <img src={img.url} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md text-[6px] text-white p-1 truncate font-mono uppercase text-center">{img.style}</div>
                                        {img.is_listed && <div className="absolute top-2 right-2 bg-green-600 text-white text-[6px] px-2 py-0.5 rounded-full shadow">LISTED</div>}
                                    </div>
                                  ))}
                              </div>
                            )}
                        </div>
                      </div>
                  </div>
               </div>
            </div>
          )}

          {showListingModal && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md animate-fade-in">
              <div className="bg-gray-900/90 backdrop-blur-2xl border-4 border-green-600 rounded-[3rem] p-8 max-w-md w-full shadow-[0_0_100px_rgba(34,197,94,0.3)] animate-slide-up relative overflow-hidden">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-retro text-green-500 mb-2 uppercase tracking-tighter">Market Protocol</h2>
                    <p className="text-gray-400 text-xs font-serif italic">Relinquish this artifact to the public ledger.</p>
                </div>

                <div className="aspect-square w-32 h-32 mx-auto mb-8 rounded-3xl border-2 border-green-500 overflow-hidden shadow-2xl">
                    <img src={selectedPreview!} className="w-full h-full object-cover" />
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-green-600 font-retro text-[9px] uppercase mb-2 ml-1">List Price (XP)</label>
                        <input type="number" value={listingPrice} onChange={e => setListingPrice(parseInt(e.target.value))} className="w-full bg-black border border-gray-700 p-3 rounded-2xl text-white outline-none focus:border-green-500 font-mono shadow-inner" />
                    </div>

                    <div>
                        <label className="block text-green-600 font-retro text-[9px] uppercase mb-2 ml-1">XP Infusion</label>
                        <input type="number" value={infusedXp} onChange={e => setInfusedXp(parseInt(e.target.value))} className="w-full bg-black border border-gray-700 p-3 rounded-2xl text-white outline-none focus:border-green-500 font-mono shadow-inner" />
                    </div>

                    <div className="pt-4 space-y-3">
                        <Button onClick={handleListForSale} disabled={isListing} className="w-full bg-green-700 border-green-500 py-4 font-retro text-xs shadow-xl animate-glow">
                            {isListing ? 'ARCHIVING...' : 'LIST ON MARKETPLACE'}
                        </Button>
                        <Button variant="secondary" onClick={() => setShowListingModal(false)} className="w-full py-4 font-retro text-[9px] border-gray-800">Abort</Button>
                    </div>
                </div>
              </div>
            </div>
          )}

          {showForgeWarning && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/95 p-4 backdrop-blur-2xl animate-fade-in">
              <div className="bg-black/80 border-4 border-red-600/50 p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] max-w-lg text-center shadow-[0_0_100px_rgba(220,38,38,0.4)] animate-slide-up relative overflow-hidden backdrop-blur-3xl">
                <div className="text-6xl mb-8 relative z-10 animate-bounce">⚠️</div>
                <h2 className="text-3xl md:text-4xl font-retro text-red-500 mb-6 uppercase tracking-tighter drop-shadow-md">XP SACRIFICE</h2>
                <p className="text-gray-300 font-serif mb-12 text-lg md:text-xl leading-relaxed">
                  Manifesting this {aesthetic} artifact requires a spiritual sacrifice of <span className="text-white font-bold drop-shadow-md">1,000 Spirit XP</span>. 
                </p>
                <div className="flex flex-col gap-4">
                  <Button onClick={generateNewArtifact} className="bg-red-600 border-red-400 py-6 font-retro text-xs shadow-2xl rounded-3xl">IGNITE THE FLAME</Button>
                  <Button onClick={() => setShowForgeWarning(false)} variant="secondary" className="py-5 font-retro text-[10px] border-white/10 bg-white/5 rounded-3xl">ABORT PROTOCOL</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
