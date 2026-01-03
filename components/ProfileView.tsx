
import React, { useState, useRef, useEffect } from 'react';
import Button from './Button';
import { PLAYER_LEVELS, BADGES, ARCHETYPES, ACHIEVEMENTS } from '../constants';
import { User, AppView } from '../types';
import { LanguageCode, UI_TEXT } from '../translations';
import { AudioSystem } from '../utils/audio';
import { supabase } from '../lib/supabase';
import LazyImage from './LazyImage';

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
  spendPoints?: (amount: number, type?: string) => Promise<boolean>;
  onAddPoints?: (amount: number) => void;
  onGoToAdmin?: () => void;
  onNavigate?: (view: AppView) => void;
  journalEntriesCount?: number;
}

const ProfileView: React.FC<ProfileViewProps> = ({ 
  user, totalPoints, unlockedAchievements, collectedVerses, onBack, language, onGoToAdmin, onConvertGuest, journalEntriesCount = 0, onUpdateUser, onNavigate 
}) => {
  const [activeTab, setActiveTab] = useState<'badges' | 'achievements'>('badges');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  
  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT[language][key] || UI_TEXT['en'][key];

  useEffect(() => {
    const initProfile = async () => {
      if (user && !user.id.startsWith('offline-')) {
        const today = new Date().toISOString().split('T')[0];
        const key = `journey_profile_visit_${user.id}_${today}`;
        
        if (!localStorage.getItem(key)) {
          try {
            await supabase.from('activity_feed').insert({
              user_id: user.id,
              activity_type: 'check_profile',
              details: { icon: '🛡️', title: 'Profile Visited' }
            });
            localStorage.setItem(key, 'true');
          } catch (e) {
            console.error("Failed to log profile visit", e);
          }
        }

        try {
            await supabase.rpc('sync_user_badges', { p_user_id: user.id });
            const { data } = await supabase.from('users').select('badges').eq('id', user.id).single();
            if (data && data.badges) {
                onUpdateUser({ ...user, badges: data.badges });
            }
        } catch (e) {
            console.error("Badge sync failed", e);
        }
      }
    };
    initProfile();
  }, [user]);

  if (!user) return null;

  const currentLevelInfo = PLAYER_LEVELS.filter(l => l.xp <= totalPoints).pop() || PLAYER_LEVELS[0];
  const currentLevelIndex = PLAYER_LEVELS.indexOf(currentLevelInfo);
  const nextLevelInfo = PLAYER_LEVELS[currentLevelIndex + 1];
  
  const xpForCurrent = currentLevelInfo.xp;
  const xpForNext = nextLevelInfo ? nextLevelInfo.xp : xpForCurrent; 
  
  const progressPercent = nextLevelInfo 
    ? Math.min(100, Math.max(0, ((totalPoints - xpForCurrent) / (xpForNext - xpForCurrent)) * 100)) 
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

  const renderBadges = () => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4 animate-slide-up pb-10">
      {BADGES.map(badge => {
        const isUnlocked = user.badges.includes(badge.id);
        return (
          <div 
            key={badge.id}
            className={`
              flex flex-col items-center justify-center p-3 md:p-4 rounded-2xl border-2 transition-all group relative overflow-hidden
              ${isUnlocked 
                ? 'bg-gray-800/80 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.1)] hover:scale-105' 
                : 'bg-black/40 border-white/5 grayscale opacity-50'}
            `}
            title={badge.description}
            onClick={() => AudioSystem.playVoxelTap()}
          >
            <div className="text-3xl md:text-4xl mb-2 drop-shadow-md transition-transform group-hover:scale-110 group-hover:animate-bounce">
              {badge.icon}
            </div>
            <div className={`text-[8px] md:text-[9px] font-retro uppercase text-center leading-tight ${isUnlocked ? 'text-yellow-100' : 'text-gray-500'}`}>
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
              flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl border-2 transition-all
              ${isUnlocked 
                ? 'bg-gray-800/80 border-green-500/30 shadow-lg' 
                : 'bg-black/40 border-white/5 opacity-60'}
            `}
          >
            <div className={`
              w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-xl md:text-2xl border-2 shrink-0
              ${isUnlocked ? 'bg-green-900/30 border-green-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-600'}
            `}>
              {ach.icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <h4 className={`font-bold font-retro text-[10px] md:text-sm uppercase ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                  {ach.title}
                </h4>
                {isUnlocked && <span className="text-[7px] md:text-[9px] bg-green-900 text-green-400 px-2 py-0.5 rounded border border-green-700 font-mono">UNLOCKED</span>}
              </div>
              <p className="text-gray-400 text-[10px] md:text-xs font-serif italic truncate">{ach.description}</p>
            </div>

            <div className="text-right shrink-0">
              <span className={`font-mono text-[10px] md:text-xs font-bold ${isUnlocked ? 'text-yellow-400' : 'text-gray-600'}`}>
                +{ach.xpReward} XP
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-full bg-gray-950 flex flex-col items-center p-4 relative custom-scroll">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-4xl space-y-6 pb-24">
        
        {/* TOP CARD: IDENTITY */}
        <div className="bg-black/60 backdrop-blur-xl border-4 border-white/10 rounded-[3rem] overflow-hidden shadow-2xl relative">
           {/* Header Background */}
           <div className="h-40 md:h-48 w-full relative bg-gray-900">
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
           <div className="px-4 md:px-8 pb-8 relative -mt-16 flex flex-col md:flex-row gap-6 items-center md:items-end text-center md:text-left w-full">
              {/* Avatar Section */}
              <div className="relative group shrink-0 z-10">
                 <div 
                    className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-4 border-black bg-gray-800 overflow-hidden shadow-2xl relative"
                 >
                    <LazyImage src={user.avatar} className="w-full h-full object-cover" alt="Avatar" />
                 </div>
                 
                 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-600 text-black text-[9px] font-bold px-3 py-1 rounded-full border-2 border-white shadow-lg whitespace-nowrap">
                    LVL {currentLevelInfo.level}
                 </div>
              </div>

              {/* Identity Details */}
              <div className="flex-1 min-w-0 mb-2">
                 <h2 className="text-2xl md:text-4xl font-bold text-white font-retro tracking-tighter truncate">{user.username}</h2>
                 
                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                    <span className="bg-white/10 px-3 py-1 rounded-lg text-xs font-mono text-gray-300 border border-white/5 flex items-center gap-2">
                       <span>{currentArch?.icon}</span> {user.archetype || 'Wanderer'}
                    </span>
                    <span className="bg-white/10 px-3 py-1 rounded-lg text-xs font-mono text-gray-300 border border-white/5">
                       {unlockedBadgeCount} Badges
                    </span>
                    {isGuest && (
                        <button onClick={onConvertGuest} className="bg-blue-600 px-3 py-1 rounded-lg text-[10px] font-bold uppercase animate-pulse hover:bg-blue-500">
                            Sync Account
                        </button>
                    )}
                 </div>
              </div>

              {/* Points */}
              <div className="flex flex-col items-center md:items-end">
                  <p className="text-gray-500 text-[9px] font-retro uppercase tracking-[0.2em] mb-1">Spirit XP</p>
                  <div className="bg-black/40 px-4 py-2 rounded-xl border border-white/10 text-center md:text-right">
                      <p className="text-2xl md:text-3xl font-mono text-yellow-400 font-bold">{totalPoints.toLocaleString()}</p>
                  </div>
              </div>
           </div>
        </div>

        {/* STATS & REFERRAL GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Level Progress */}
            <div className="bg-black/40 border border-white/5 p-6 rounded-[2rem] flex flex-col justify-between">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h3 className="text-white font-retro text-sm uppercase">Level Progress</h3>
                        <p className="text-gray-500 text-xs mt-1">{currentLevelInfo.title}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xl font-bold text-white">{Math.floor(progressPercent)}%</span>
                    </div>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px] font-mono text-gray-500 uppercase">
                    <span>{totalPoints.toLocaleString()} XP</span>
                    <span>{xpForNext.toLocaleString()} XP</span>
                </div>
            </div>

            {/* Referral System */}
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 p-6 rounded-[2rem] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl">🤝</div>
                <div className="relative z-10">
                    <h3 className="text-blue-300 font-retro text-sm uppercase mb-1">Apostleship</h3>
                    <p className="text-gray-400 text-xs mb-4">Invite friends. Earn 500 XP per soul.</p>
                    
                    {user.referralCode ? (
                        <div className="bg-black/60 p-3 rounded-xl border border-blue-500/30 flex justify-between items-center cursor-pointer hover:bg-black/80 transition-colors" onClick={copyReferral}>
                            <span className="font-mono text-white text-sm tracking-widest">{user.referralCode}</span>
                            <span className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded">COPY</span>
                        </div>
                    ) : (
                        <Button 
                            onClick={handleGenerateReferral} 
                            disabled={isGeneratingCode || isGuest}
                            className="w-full py-3 text-[10px] bg-blue-600 border-blue-400 hover:bg-blue-500"
                        >
                            {isGeneratingCode ? 'Generating...' : 'Generate Code'}
                        </Button>
                    )}
                    <p className="text-[9px] text-gray-600 mt-2 text-center">{user.referralsCount} Souls Referred</p>
                </div>
            </div>
        </div>

        {/* TABS */}
        <div className="space-y-6">
            <div className="flex justify-center">
                <div className="bg-black/40 p-1 rounded-xl border border-white/5 inline-flex backdrop-blur-md">
                    <button 
                        onClick={() => setActiveTab('badges')} 
                        className={`px-6 py-2 rounded-lg text-[10px] font-retro uppercase transition-all ${activeTab === 'badges' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Badges ({unlockedBadgeCount}/{totalBadges})
                    </button>
                    <button 
                        onClick={() => setActiveTab('achievements')} 
                        className={`px-6 py-2 rounded-lg text-[10px] font-retro uppercase transition-all ${activeTab === 'achievements' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        Milestones ({unlockedAchievCount}/{totalAchievs})
                    </button>
                </div>
            </div>

            <div className="bg-black/20 p-4 rounded-[2.5rem] min-h-[300px]">
                {activeTab === 'badges' ? renderBadges() : renderAchievements()}
            </div>
        </div>

      </div>
    </div>
  );
};

export default ProfileView;
