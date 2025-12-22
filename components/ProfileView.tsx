
import React, { useState, useRef } from 'react';
import Button from './Button';
import { PLAYER_LEVELS, BADGES, ARCHETYPES, ACHIEVEMENTS } from '../constants';
import { User } from '../types';
import { LanguageCode, UI_TEXT } from '../translations';
import { AudioSystem } from '../utils/audio';
import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";

interface ProfileViewProps {
  user: User | null;
  totalPoints: number; // This is now Net Worth passed from App
  unlockedAchievements: string[];
  collectedVerses: string[];
  onBack: () => void;
  onUpdateUser: (updatedUser: User) => void;
  language: LanguageCode;
  onUnlockAchievement?: (id: string) => void;
  onAwardBadge?: (id: string) => void;
  onConvertGuest?: () => void; 
  spendPoints?: (amount: number, type?: string) => Promise<boolean>;
  onAddPoints?: (amount: number) => void;
  onGoToAdmin?: () => void;
  journalEntriesCount?: number;
}

const ProfileView: React.FC<ProfileViewProps> = ({ 
  user, totalPoints, unlockedAchievements, collectedVerses, onBack, language, onGoToAdmin, onConvertGuest, journalEntriesCount = 0, onUpdateUser 
}) => {
  const [activeTab, setActiveTab] = useState<'badges' | 'achievements'>('badges');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  
  // Avatar Editing State
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT[language][key] || UI_TEXT['en'][key];

  if (!user) return null;

  // -- CALCULATIONS --
  const liquid = user.totalPoints || 0;
  const assets = user.assetPoints || 0;
  const staked = user.stakedPoints || 0;
  const netWorth = liquid + assets + staked;

  const currentLevelInfo = PLAYER_LEVELS.filter(l => l.xp <= netWorth).pop() || PLAYER_LEVELS[0];
  const currentLevelIndex = PLAYER_LEVELS.indexOf(currentLevelInfo);
  const nextLevelInfo = PLAYER_LEVELS[currentLevelIndex + 1];
  
  const xpForCurrent = currentLevelInfo.xp;
  const xpForNext = nextLevelInfo ? nextLevelInfo.xp : xpForCurrent; 
  
  const progressPercent = nextLevelInfo 
    ? Math.min(100, Math.max(0, ((netWorth - xpForCurrent) / (xpForNext - xpForCurrent)) * 100)) 
    : 100;

  const currentArch = ARCHETYPES.find(a => a.name === user.archetype) || ARCHETYPES.find(a => a.name === 'Wanderer');
  
  const unlockedBadgeCount = user.badges.length;
  const totalBadges = BADGES.length;
  
  const uniqueUnlockedAchievements = [...new Set(unlockedAchievements)];
  const unlockedAchievCount = uniqueUnlockedAchievements.length;
  const totalAchievs = ACHIEVEMENTS.length;

  const isAdmin = user.role === 'admin' || user.email === 'uyiedos@gmail.com';
  const isGuest = user.id.startsWith('offline-');

  const BASE_URL = 'https://thejourneyapp.xyz';

  // -- HANDLERS --

  const handleGenerateReferral = async () => {
      if (user.referralCode) return;
      setIsGeneratingCode(true);
      try {
          const code = (user.username.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase()).replace(/[^A-Z0-9]/g, 'X');
          
          const { error } = await supabase.from('users').update({ referral_code: code }).eq('id', user.id);
          
          if (error) throw error;
          
          onUpdateUser({ ...user, referralCode: code });
          AudioSystem.playAchievement();
      } catch (e) {
          console.error("Referral gen failed", e);
      } finally {
          setIsGeneratingCode(false);
      }
  };

  const copyReferral = () => {
      if (!user.referralCode) return;
      const link = `${BASE_URL}?ref=${user.referralCode}`;
      navigator.clipboard.writeText(link);
      AudioSystem.playVoxelTap();
      alert("Referral Link Copied to Clipboard!");
  };

  // -- AVATAR LOGIC --

  const saveAvatarUrl = async (url: string) => {
      if (isGuest) {
          onUpdateUser({ ...user, avatar: url });
          setIsEditingAvatar(false);
          setIsProcessingAvatar(false);
          return;
      }

      try {
          const { error } = await supabase.from('users').update({ avatar: url }).eq('id', user.id);
          if (error) throw error;
          onUpdateUser({ ...user, avatar: url });
          setIsEditingAvatar(false);
          AudioSystem.playAchievement();
      } catch (e: any) {
          alert("Failed to save profile: " + e.message);
      } finally {
          setIsProcessingAvatar(false);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
          alert("File too large. Max 2MB.");
          return;
      }

      setIsProcessingAvatar(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `avatars/${user.id}/upload_${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
              .from('journey_assets')
              .upload(fileName, file, { upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('journey_assets').getPublicUrl(fileName);
          await saveAvatarUrl(data.publicUrl);
      } catch (err: any) {
          alert("Upload failed: " + err.message);
          setIsProcessingAvatar(false);
      }
  };

  const handleAiGenerate = async () => {
      if (!avatarPrompt.trim()) return;
      setIsProcessingAvatar(true);

      try {
          // Initialize AI with the environment key
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: [{ text: `Pixel art avatar face of ${avatarPrompt}. High quality, rpg game style portrait, white background.` }],
              config: {
                  imageConfig: { aspectRatio: '1:1' }
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

          if (!base64Image) throw new Error("No image generated. Please try a different prompt.");

          // Convert base64 to blob for upload
          const binaryString = atob(base64Image);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          const blob = new Blob([bytes], { type: 'image/png' });

          const fileName = `avatars/${user.id}/ai_${Date.now()}.png`;
          const { error: uploadError } = await supabase.storage
              .from('journey_assets')
              .upload(fileName, blob, { contentType: 'image/png', upsert: true });

          if (uploadError) throw uploadError;

          const { data } = supabase.storage.from('journey_assets').getPublicUrl(fileName);
          await saveAvatarUrl(data.publicUrl);

      } catch (err: any) {
          alert("Generation failed: " + err.message);
          setIsProcessingAvatar(false);
      }
  };

  // -- RENDERERS --

  const renderBadges = () => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 animate-slide-up pb-10">
      {BADGES.map(badge => {
        const isUnlocked = user.badges.includes(badge.id);
        return (
          <div 
            key={badge.id}
            className={`
              flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group relative overflow-hidden
              ${isUnlocked 
                ? 'bg-gray-800/80 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)] hover:scale-105' 
                : 'bg-black/40 border-white/5 grayscale opacity-50'}
            `}
            title={badge.description}
            onClick={() => AudioSystem.playVoxelTap()}
          >
            <div className="text-4xl mb-2 drop-shadow-md transition-transform group-hover:scale-110 group-hover:animate-bounce">
              {badge.icon}
            </div>
            <div className={`text-[9px] font-retro uppercase text-center leading-tight ${isUnlocked ? 'text-yellow-100' : 'text-gray-500'}`}>
              {badge.name}
            </div>
            {isUnlocked && (
              <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent pointer-events-none"></div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderAchievements = () => (
    <div className="space-y-3 animate-slide-up pb-10">
      {ACHIEVEMENTS.map(ach => {
        const isUnlocked = uniqueUnlockedAchievements.includes(ach.id);
        return (
          <div 
            key={ach.id} 
            className={`
              flex items-center gap-4 p-4 rounded-2xl border-2 transition-all
              ${isUnlocked 
                ? 'bg-gray-800/80 border-green-500/30 shadow-lg' 
                : 'bg-black/40 border-white/5 opacity-60'}
            `}
          >
            <div className={`
              w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 shrink-0
              ${isUnlocked ? 'bg-green-900/30 border-green-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-600'}
            `}>
              {ach.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h4 className={`font-bold font-retro text-xs md:text-sm uppercase ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                  {ach.title}
                </h4>
                {isUnlocked && <span className="text-[9px] bg-green-900 text-green-400 px-2 py-0.5 rounded border border-green-700 font-mono">UNLOCKED</span>}
              </div>
              <p className="text-gray-400 text-xs font-serif italic truncate">{ach.description}</p>
            </div>

            <div className="text-right shrink-0">
              <span className={`font-mono text-xs font-bold ${isUnlocked ? 'text-yellow-400' : 'text-gray-600'}`}>
                +{ach.xpReward} XP
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-full bg-gray-950 flex flex-col items-center p-4 relative">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>
      
      {/* Avatar Edit Modal */}
      {isEditingAvatar && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
              <div className="bg-gray-900 border-4 border-white/20 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl">
                  <h3 className="text-white font-retro text-sm uppercase mb-4 text-center">Identity Modification</h3>
                  
                  <div className="space-y-6">
                      <div className="text-center">
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                            accept="image/*"
                          />
                          <Button 
                            onClick={() => fileInputRef.current?.click()} 
                            disabled={isProcessingAvatar}
                            className="w-full bg-gray-800 border-gray-600 hover:bg-gray-700"
                          >
                              {isProcessingAvatar ? 'Uploading...' : '📁 Upload Image'}
                          </Button>
                      </div>

                      <div className="relative flex items-center gap-2">
                          <div className="h-px bg-gray-700 flex-1"></div>
                          <span className="text-[9px] text-gray-500 uppercase">OR</span>
                          <div className="h-px bg-gray-700 flex-1"></div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] text-gray-400 uppercase ml-1">Generate with AI</label>
                          <textarea 
                            value={avatarPrompt}
                            onChange={(e) => setAvatarPrompt(e.target.value)}
                            placeholder="e.g. A wise old prophet with a glowing staff..."
                            className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white text-xs outline-none focus:border-yellow-500 h-20 resize-none"
                          />
                          <Button 
                            onClick={handleAiGenerate}
                            disabled={isProcessingAvatar || !avatarPrompt.trim()}
                            className="w-full bg-blue-600 border-blue-400 hover:bg-blue-500"
                          >
                              {isProcessingAvatar ? 'Forging...' : '✨ Generate Avatar'}
                          </Button>
                      </div>
                  </div>

                  <button 
                    onClick={() => setIsEditingAvatar(false)} 
                    className="w-full mt-6 text-gray-500 hover:text-white text-xs uppercase"
                  >
                      Cancel
                  </button>
              </div>
          </div>
      )}

      <div className="relative z-10 w-full max-w-4xl space-y-6 pb-24">
        
        {/* TOP CARD: IDENTITY */}
        <div className="bg-black/60 backdrop-blur-xl border-4 border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
           {/* Header Background */}
           <div className="h-48 w-full relative bg-gray-900">
              {user.sanctuaryBackground ? (
                <img src={user.sanctuaryBackground} className="w-full h-full object-cover opacity-60" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-blue-900 to-purple-900 opacity-50"></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              
              <div className="absolute top-4 right-4 flex gap-2">
                 {isAdmin && (
                   <button onClick={onGoToAdmin} className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-retro px-4 py-2 rounded-xl shadow-lg border border-red-400 animate-pulse">
                     ADMIN CONSOLE
                   </button>
                 )}
                 <Button onClick={onBack} variant="secondary" className="px-4 py-2 text-[10px] bg-black/50 border-white/20 backdrop-blur-md">
                   ✕ CLOSE
                 </Button>
              </div>
           </div>

           {/* Profile Content */}
           <div className="px-8 pb-8 relative -mt-16 flex flex-col md:flex-row gap-6 items-end md:items-end text-center md:text-left">
              <div className="relative group">
                 <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-4 border-black bg-gray-800 overflow-hidden shadow-2xl relative">
                    <img src={user.avatar} className="w-full h-full object-cover" />
                    {isGuest && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer" onClick={onConvertGuest}>
                        <span className="text-[10px] font-retro text-yellow-400 text-center px-2">GUEST<br/>(TAP TO SAVE)</span>
                      </div>
                    )}
                 </div>
                 
                 {/* Edit Avatar Button */}
                 <button 
                    onClick={() => setIsEditingAvatar(true)}
                    className="absolute bottom-0 right-0 bg-white text-black p-2 rounded-full shadow-lg border-2 border-gray-200 hover:scale-110 transition-transform z-20"
                    title="Edit Avatar"
                 >
                    ✏️
                 </button>

                 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-600 text-black font-bold font-retro text-[10px] px-3 py-1 rounded-full border-2 border-yellow-400 shadow-lg whitespace-nowrap z-10">
                    Lvl {currentLevelInfo.level}
                 </div>
              </div>

              <div className="flex-1 pb-2 space-y-1">
                 <h1 className="text-3xl md:text-5xl font-retro text-white uppercase tracking-tighter drop-shadow-lg">{user.username}</h1>
                 <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                    <span className="bg-white/10 text-blue-200 px-3 py-1 rounded-lg text-xs font-bold border border-white/10 backdrop-blur-md flex items-center gap-2">
                       <span>{currentArch?.icon}</span> {user.archetype || 'Wanderer'}
                    </span>
                    <span className="text-gray-500 text-xs font-mono uppercase tracking-widest">
                       Joined {new Date(user.joinedDate).toLocaleDateString()}
                    </span>
                 </div>
              </div>

              <div className="w-full md:w-auto bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md min-w-[200px]">
                 <p className="text-[9px] text-gray-400 font-retro uppercase mb-1 tracking-widest text-center">Net Worth</p>
                 <p className="text-3xl font-mono text-white font-bold text-center drop-shadow-md">{netWorth.toLocaleString()}</p>
                 <div className="flex justify-between mt-2 pt-2 border-t border-white/10 text-[9px] font-mono">
                    <div className="flex flex-col items-center">
                        <span className="text-blue-400">💧 {liquid.toLocaleString()}</span>
                        <span className="text-[8px] text-gray-500">LIQUID</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-white/5 pl-2">
                        <span className="text-yellow-500">💎 {assets.toLocaleString()}</span>
                        <span className="text-[8px] text-gray-500">ASSETS</span>
                    </div>
                    {staked > 0 && (
                        <div className="flex flex-col items-center border-l border-white/5 pl-2">
                            <span className="text-green-500">🔒 {staked.toLocaleString()}</span>
                            <span className="text-[8px] text-gray-500">STAKED</span>
                        </div>
                    )}
                 </div>
              </div>
           </div>

           {/* XP Bar */}
           <div className="px-8 pb-8">
              <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-2 uppercase">
                 <span>{currentLevelInfo.title}</span>
                 <span className="text-white">
                    {nextLevelInfo ? `${Math.floor(progressPercent)}% to ${nextLevelInfo.title}` : 'Max Rank Achieved'}
                 </span>
              </div>
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                 <div 
                   className="h-full bg-gradient-to-r from-blue-600 via-purple-500 to-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all duration-1000 ease-out" 
                   style={{ width: `${progressPercent}%` }}
                 ></div>
              </div>
              <div className="mt-2 text-right">
                 <span className="text-[9px] text-gray-600 font-mono">
                    {netWorth.toLocaleString()} / {nextLevelInfo ? nextLevelInfo.xp.toLocaleString() : '∞'} XP
                 </span>
              </div>
           </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-gray-900 border-2 border-gray-800 p-4 rounded-2xl text-center shadow-lg">
              <div className="text-2xl mb-1">📜</div>
              <div className="text-xl font-bold text-white">{collectedVerses.length}</div>
              <div className="text-[9px] text-gray-500 uppercase font-retro">Verses Found</div>
           </div>
           
           <div className="bg-gray-900 border-2 border-gray-800 p-4 rounded-2xl text-center shadow-lg">
              <div className="text-2xl mb-1">✍️</div>
              <div className="text-xl font-bold text-white">{journalEntriesCount}</div>
              <div className="text-[9px] text-gray-500 uppercase font-retro">Journal Entries</div>
           </div>

           <div className="bg-gray-900 border-2 border-gray-800 p-4 rounded-2xl text-center shadow-lg">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-xl font-bold text-white">{unlockedAchievCount}/{totalAchievs}</div>
              <div className="text-[9px] text-gray-500 uppercase font-retro">Achievements</div>
           </div>
           <div className="bg-gray-900 border-2 border-gray-800 p-4 rounded-2xl text-center shadow-lg">
              <div className="text-2xl mb-1">🎖️</div>
              <div className="text-xl font-bold text-white">{unlockedBadgeCount}/{totalBadges}</div>
              <div className="text-[9px] text-gray-500 uppercase font-retro">Badges</div>
           </div>
           
           {/* REFERRAL CARD */}
           <div className="bg-gray-900 border-2 border-blue-800/50 p-4 rounded-2xl text-center shadow-lg cursor-pointer hover:bg-gray-800 transition-colors col-span-2 relative group overflow-hidden" onClick={user.referralCode ? copyReferral : handleGenerateReferral}>
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex items-center justify-between px-2">
                  <div className="flex flex-col items-start text-left w-full overflow-hidden">
                      <span className="text-[10px] text-blue-400 uppercase font-retro mb-1">My Referral Link</span>
                      <div className="text-xs md:text-sm font-bold text-white font-mono tracking-tight flex items-center gap-2 w-full">
                          {user.referralCode ? (
                              <span className="truncate">{BASE_URL}?ref={user.referralCode}</span>
                          ) : (
                              (isGeneratingCode ? '...' : 'GENERATE LINK')
                          )}
                          {user.referralCode && <span className="text-[9px] opacity-50 bg-blue-900/50 px-2 py-1 rounded shrink-0">COPY</span>}
                      </div>
                  </div>
                  <div className="text-right shrink-0 pl-3 border-l border-white/10 ml-3">
                      <div className="text-2xl mb-1">🤝</div>
                      <div className="text-xl font-bold text-white font-mono">{user.referralsCount || 0}</div>
                      <div className="text-[8px] text-gray-500 uppercase">Invited</div>
                  </div>
              </div>
           </div>
        </div>

        {/* TABS & LISTS */}
        <div className="bg-black/40 backdrop-blur-xl border-2 border-white/5 rounded-[2.5rem] p-6 md:p-8 min-h-[400px]">
           <div className="flex gap-4 mb-8 border-b border-white/10 pb-4">
              <button 
                onClick={() => setActiveTab('badges')} 
                className={`text-sm font-retro uppercase pb-2 px-2 transition-all ${activeTab === 'badges' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-500 hover:text-white'}`}
              >
                Badges Collection
              </button>
              <button 
                onClick={() => setActiveTab('achievements')} 
                className={`text-sm font-retro uppercase pb-2 px-2 transition-all ${activeTab === 'achievements' ? 'text-green-500 border-b-2 border-green-500' : 'text-gray-500 hover:text-white'}`}
              >
                Achievements
              </button>
           </div>

           {activeTab === 'badges' ? renderBadges() : renderAchievements()}
        </div>

      </div>
    </div>
  );
};

export default ProfileView;
