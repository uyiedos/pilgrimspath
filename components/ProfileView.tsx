
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { User, Achievement, DifficultyMode } from '../types';
import { PLAYER_LEVELS, BADGES, ACHIEVEMENTS, ARCHETYPES } from '../constants';
import { LanguageCode, UI_TEXT } from '../translations';
import { supabase } from '../lib/supabase';
import GuestConversionModal from './GuestConversionModal';
import { BarChart, LineChart, DonutChart, ChartDataPoint } from './Charts';

interface ProfileViewProps {
  user: User | null;
  totalPoints: number;
  unlockedAchievements: string[];
  collectedVerses: string[];
  onBack: () => void;
  onUpdateUser: (updatedUser: User) => void;
  language: LanguageCode;
  onSocialAction?: (action: 'like' | 'pray' | 'comment' | 'share') => void;
  onUnlockAchievement?: (id: string) => void;
  onAwardBadge?: (id: string) => void;
  onConvertGuest?: () => void; 
  onConvertGuestAction?: (email: string, password: string, username: string) => Promise<void>;
  spendPoints?: (amount: number) => Promise<boolean>;
}

// Avatar Generation Tiers
const AVATAR_TIERS = [
  { 
    id: 1, 
    name: "Novice Protocol", 
    minXP: 10000, 
    styles: ['pixel art', '8bit', 'sketch', 'retro anime'],
    classes: ['pilgrim', 'traveler', 'student'] // Fallback if no archetype
  },
  { 
    id: 2, 
    name: "Artisan Protocol", 
    minXP: 25000, 
    styles: ['oil painting', 'watercolor', 'stained glass', 'mosaic'],
    classes: ['scribe', 'shepherd', 'monk', 'disciple']
  },
  { 
    id: 3, 
    name: "Ascended Protocol", 
    minXP: 50000, 
    styles: ['cyberpunk', 'vaporwave', 'neon', 'futuristic', 'holographic'],
    classes: ['warrior', 'knight', 'paladin', 'prophet']
  },
  { 
    id: 4, 
    name: "Divine Protocol", 
    minXP: 100000, 
    styles: ['ethereal', 'celestial', 'glowing gold', 'divine light', 'renaissance masterpiece'],
    classes: ['angel', 'seraph', 'king', 'queen', 'saint']
  }
];

interface ActivityItem {
    id: string;
    username: string;
    avatar: string;
    activity_type: 'levelup' | 'achievement' | 'badge' | 'join' | 'broadcast';
    details: any;
    created_at: string;
}

const ProfileView: React.FC<ProfileViewProps> = ({ 
  user, 
  totalPoints, 
  unlockedAchievements, 
  collectedVerses,
  onBack, 
  onUpdateUser,
  language,
  onSocialAction,
  onUnlockAchievement,
  onAwardBadge,
  onConvertGuest,
  onConvertGuestAction,
  spendPoints
}) => {
  const [activeTab, setActiveTab] = useState<'passport' | 'avatar' | 'registry' | 'referral' | 'archetype' | 'activity'>('passport');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMsg, setGenerationMsg] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<number>(1);
  const [selectedArchetype, setSelectedArchetype] = useState<string>(user?.archetype || 'Knight');
  const [showConversionModal, setShowConversionModal] = useState(false);
  
  // Registry State
  const [registryData, setRegistryData] = useState({
    users: 0,
    verses: 0,
    achievements: 0,
    loaded: false
  });
  
  const [charts, setCharts] = useState({
      rankDist: [] as ChartDataPoint[],
      activityTrend: [] as ChartDataPoint[],
      activityType: [] as ChartDataPoint[]
  });

  const [personalFeed, setPersonalFeed] = useState<ActivityItem[]>([]);

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[language][key] || UI_TEXT['en'][key];
  };

  const isGuest = user?.id.startsWith('offline-');

  useEffect(() => {
    if (activeTab === 'registry' && !registryData.loaded) {
        if (isGuest) {
            // Mock data for guests to view without crashing
            setRegistryData({
                users: 1240,
                verses: 5400,
                achievements: 3200,
                loaded: true
            });
            return;
        }

        const fetchRegistryData = async () => {
            try {
                // 1. Basic Counts
                const [userReq, verseReq, achReq] = await Promise.all([
                    supabase.from('users').select('*', { count: 'exact', head: true }),
                    supabase.from('collected_verses').select('*', { count: 'exact', head: true }),
                    supabase.from('unlocked_achievements').select('*', { count: 'exact', head: true })
                ]);
                
                // 2. Fetch Analytical Data
                const { data: userData } = await supabase.from('users').select('total_points').limit(500);
                const buckets = { 'Seeker': 0, 'Disciple': 0, 'Guardian': 0, 'Mystic': 0, 'Saint': 0 };
                
                if (userData) {
                    userData.forEach(u => {
                        const xp = u.total_points || 0;
                        if (xp < 2000) buckets['Seeker']++;
                        else if (xp < 6800) buckets['Disciple']++;
                        else if (xp < 16000) buckets['Guardian']++;
                        else if (xp < 36000) buckets['Mystic']++;
                        else buckets['Saint']++;
                    });
                }

                // 3. Activity Trend
                const { data: activityData } = await supabase
                  .from('activity_feed')
                  .select('activity_type, created_at')
                  .order('created_at', { ascending: false })
                  .limit(200);

                const trendMap: Record<string, number> = {};
                const typeMap: Record<string, number> = { 'levelup': 0, 'achievement': 0, 'badge': 0, 'join': 0, 'broadcast': 0 };
                
                if (activityData) {
                    activityData.forEach(act => {
                        const date = new Date(act.created_at).toLocaleDateString(undefined, { weekday: 'short' });
                        trendMap[date] = (trendMap[date] || 0) + 1;
                        const t = act.activity_type || 'other';
                        typeMap[t] = (typeMap[t] || 0) + 1;
                    });
                }
                
                setRegistryData({
                    users: userReq.count || 0,
                    verses: verseReq.count || 0,
                    achievements: achReq.count || 0,
                    loaded: true
                });

                setCharts({
                    rankDist: [
                        { label: 'Seeker', value: buckets['Seeker'], color: '#9ca3af' },
                        { label: 'Disciple', value: buckets['Disciple'], color: '#60a5fa' },
                        { label: 'Guardian', value: buckets['Guardian'], color: '#a855f7' },
                        { label: 'Mystic', value: buckets['Mystic'], color: '#eab308' },
                        { label: 'Saint', value: buckets['Saint'], color: '#ef4444' },
                    ],
                    activityTrend: Object.keys(trendMap).reverse().slice(0,7).map(d => ({ label: d, value: trendMap[d] })),
                    activityType: [
                        { label: 'Level Up', value: typeMap['levelup'], color: '#fbbf24' },
                        { label: 'Badge', value: typeMap['badge'], color: '#8b5cf6' },
                        { label: 'Achieve', value: typeMap['achievement'], color: '#10b981' },
                        { label: 'Join', value: typeMap['join'], color: '#3b82f6' },
                        { label: 'Live', value: typeMap['broadcast'], color: '#ef4444' }
                    ]
                });

            } catch (e) {
                console.error("Error fetching registry data", e);
            }
        };
        fetchRegistryData();
    }

    if (activeTab === 'activity' && user && !isGuest) {
        const fetchPersonalActivity = async () => {
            const { data } = await supabase
                .from('activity_feed')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (data) setPersonalFeed(data);
        };
        fetchPersonalActivity();
    }
  }, [activeTab, registryData.loaded, isGuest, user]);

  // Set default tier to highest unlocked
  useEffect(() => {
    const highestUnlocked = AVATAR_TIERS.filter(t => totalPoints >= t.minXP).pop();
    if (highestUnlocked) {
        setSelectedTierId(highestUnlocked.id);
    }
  }, [totalPoints]);

  if (!user) return null;

  const currentLevel = PLAYER_LEVELS.filter(l => l.xp <= totalPoints).pop() || PLAYER_LEVELS[0];
  const nextLevel = PLAYER_LEVELS.find(l => l.level === currentLevel.level + 1);
  const progressPercent = nextLevel 
    ? Math.min(100, Math.max(0, ((totalPoints - currentLevel.xp) / (nextLevel.xp - currentLevel.xp)) * 100))
    : 100;

  const isAvatarStudioUnlocked = totalPoints >= AVATAR_TIERS[0].minXP;

  const handleGenerateClick = () => {
      if (isGuest) {
          alert("Please create an account to use the Avatar Studio.");
          setShowConversionModal(true);
          return;
      }
      setShowWarning(true);
  };

  const handleDifficultyChange = (mode: DifficultyMode) => {
      onUpdateUser({ ...user, difficulty: mode });
  };

  const handleArchetypeSelect = (archName: string) => {
      setSelectedArchetype(archName);
      onUpdateUser({ ...user, archetype: archName });
  };

  const handleCopyReferral = () => {
      const url = `${window.location.origin}/?ref=${user.referralCode}`;
      navigator.clipboard.writeText(url);
      alert("Referral link copied to clipboard!");
  };

  const generateNewAvatar = async () => {
    if (!isAvatarStudioUnlocked || isGuest) return;
    
    // Check Cost - 50 XP
    if (spendPoints) {
        const success = await spendPoints(50);
        if (!success) {
            setShowWarning(false);
            return;
        }
    }

    setShowWarning(false);
    setIsGenerating(true);
    setGenerationMsg("Accessing Neural Paintbrush...");

    const tier = AVATAR_TIERS.find(t => t.id === selectedTierId) || AVATAR_TIERS[0];
    
    // Priority: User's Archetype -> Random class from tier
    const archeytpeClass = user.archetype || tier.classes[Math.floor(Math.random() * tier.classes.length)];
    const randomStyle = tier.styles[Math.floor(Math.random() * tier.styles.length)];
    const timestamp = Date.now();
    
    const prompt = `portrait of a ${archeytpeClass}, ${randomStyle} style, spiritual, holy aura, masterpiece`;
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=300&height=300&nologo=true&seed=${user.id}-${timestamp}`;

    try {
      setGenerationMsg(`Forging ${randomStyle} ${archeytpeClass}...`);
      
      const response = await fetch(pollinationsUrl);
      const blob = await response.blob();

      setGenerationMsg(`Archiving to Vault...`);
      
      const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Date.now().toString(36) + Math.random().toString(36).substr(2);
        
      const fileName = `avatars/${user.id}/${uniqueId}.png`;
      const { error: uploadError } = await supabase.storage
        .from('journey_assets')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('journey_assets').getPublicUrl(fileName);
      const permanentUrl = urlData.publicUrl;

      // Update history with collection name 'Forged'
      await supabase.from('avatar_history').insert({
        user_id: user.id,
        avatar_url: permanentUrl,
        style_prompt: `${randomStyle} ${archeytpeClass}`,
        collection_name: 'Forged'
      });

      onUpdateUser({ ...user, avatar: permanentUrl });
      setGenerationMsg(`Identity secured.`);

      if (onUnlockAchievement) {
          onUnlockAchievement('divine_architect');
      }

      if (onAwardBadge) {
          onAwardBadge('creator'); // Award new 'Forged Identity' Badge
      }
      
    } catch (error: any) {
      console.error("Avatar generation error:", error);
      setGenerationMsg(`Error: ${error.message || "Failed to generate"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const getActivityIcon = (type: string) => {
      switch(type) {
          case 'levelup': return '⭐';
          case 'achievement': return '🏆';
          case 'badge': return '🎖️';
          case 'join': return '👋';
          case 'broadcast': return '📺';
          default: return '📜';
      }
  };

  const getActivityText = (item: ActivityItem) => {
      const d = item.details || {};
      switch(item.activity_type) {
          case 'levelup': return `Ascended to Level ${d.level}: ${d.title}`;
          case 'achievement': return `Unlocked achievement: ${d.title}`;
          case 'badge': return `Earned the ${d.name} Badge`;
          case 'join': return `Joined the pilgrimage`;
          case 'broadcast': return `Went live on Journey TV`;
          default: return 'Made progress';
      }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center pt-20 bg-[url('https://image.pollinations.ai/prompt/futuristic%20holographic%20interface%20blue%20grid?width=1200&height=800&nologo=true')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>

      {showConversionModal && onConvertGuestAction && (
          <GuestConversionModal 
             onConvert={async (e, p, u) => {
                 await onConvertGuestAction(e, p, u);
                 setShowConversionModal(false);
             }}
             onCancel={() => setShowConversionModal(false)}
          />
      )}

      {showWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 animate-fade-in">
            <div className="bg-red-900/20 border-4 border-red-600 rounded-xl p-6 max-w-md w-full text-center shadow-[0_0_50px_rgba(220,38,38,0.5)]">
                <div className="text-5xl mb-4">⚠️</div>
                <h2 className="text-2xl font-retro text-red-500 mb-4">PERMANENT DATA OVERWRITE</h2>
                <p className="text-gray-300 font-serif mb-6 text-sm">
                    Warning: Generating a new avatar will replace your current profile picture.
                    <br/><br/>
                    The new avatar will be automatically saved to your <strong className="text-white">Personal Vault</strong> as part of the <strong className="text-purple-400">Forged Collection</strong>.
                    <br/><br/>
                    Cost: <strong className="text-yellow-500">50 XP</strong>. Proceed with generation?
                </p>
                <div className="flex gap-4 justify-center">
                    <Button onClick={() => setShowWarning(false)} variant="secondary">Cancel</Button>
                    <Button onClick={generateNewAvatar} className="bg-red-700 hover:bg-red-600 border-red-900">Proceed</Button>
                </div>
            </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-5xl p-4 md:p-8">
        
        {/* Top Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
           <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-yellow-500 overflow-hidden bg-black shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                   <img src={user.avatar} className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-600 text-black font-bold text-xs px-2 py-0.5 rounded border border-white">
                   Lvl {currentLevel.level}
                </div>
              </div>
              <div>
                 <h1 className="text-2xl md:text-3xl font-retro text-white uppercase flex items-center gap-2">
                    {user.username}
                    {user.archetype && <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-1 rounded border border-blue-500">{user.archetype}</span>}
                 </h1>
                 <p className="text-gray-400 font-mono text-xs">{t('joined')}: {new Date(user.joinedDate).toLocaleDateString()}</p>
                 <div className="flex gap-2 items-center">
                    <p className="text-gray-500 font-mono text-[10px] mt-1">ID: {user.id}</p>
                    {isGuest && (
                        <span className="text-[9px] bg-red-600 text-white px-2 rounded animate-pulse">OFFLINE MODE</span>
                    )}
                 </div>
              </div>
           </div>
           
           <div className="flex gap-2 flex-wrap justify-center">
             <Button onClick={() => setActiveTab('passport')} variant={activeTab === 'passport' ? 'primary' : 'secondary'} className="text-xs">{t('profile')}</Button>
             <Button onClick={() => setActiveTab('activity')} variant={activeTab === 'activity' ? 'primary' : 'secondary'} className="text-xs">{t('activity')}</Button>
             <Button onClick={() => setActiveTab('archetype')} variant={activeTab === 'archetype' ? 'primary' : 'secondary'} className="text-xs">Class</Button>
             <Button onClick={() => setActiveTab('avatar')} variant={activeTab === 'avatar' ? 'primary' : 'secondary'} className="text-xs">{t('avatar_studio')}</Button>
             <Button onClick={() => setActiveTab('referral')} variant={activeTab === 'referral' ? 'primary' : 'secondary'} className="text-xs">Invite</Button>
             <Button onClick={() => setActiveTab('registry')} variant={activeTab === 'registry' ? 'primary' : 'secondary'} className="text-xs">{t('global_registry')}</Button>
             <Button onClick={onBack} variant="secondary" className="text-xs ml-2">❌</Button>
           </div>
        </div>

        {/* GUEST WARNING / CONVERSION CTA */}
        {isGuest && (
            <div className="mb-6 bg-red-900/30 border border-red-500 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="text-3xl">💾</div>
                    <div>
                        <h3 className="text-red-400 font-bold text-sm">Playing as Guest (Unsaved)</h3>
                        <p className="text-gray-400 text-xs">Your progress is locally saved. Create an account to prevent data loss.</p>
                    </div>
                </div>
                {onConvertGuestAction && (
                    <Button onClick={() => setShowConversionModal(true)} className="bg-green-600 hover:bg-green-500 text-xs whitespace-nowrap">
                        Save Progress / Create Account
                    </Button>
                )}
            </div>
        )}

        {/* Content Area */}
        <div className="bg-gray-900/80 border-2 border-gray-600 rounded-xl p-6 min-h-[500px] pixel-shadow relative overflow-hidden flex flex-col">
          
          <div className="flex-1">
            {/* TAB: PASSPORT */}
            {activeTab === 'passport' && (
               <div className="space-y-8 animate-fade-in">
                  
                  {/* Top Stats Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                     <div className="bg-black/40 p-4 rounded border border-gray-700">
                        <h3 className="text-yellow-500 font-retro text-sm uppercase mb-4 border-b border-gray-700 pb-2">Spiritual Metrics</h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <span className="block text-gray-500 text-xs font-mono uppercase">Total XP</span>
                              <span className="text-2xl text-white font-mono">{totalPoints.toLocaleString()}</span>
                           </div>
                           <div>
                              <span className="block text-gray-500 text-xs font-mono uppercase">Rank</span>
                              <span className="text-xl text-yellow-400 font-serif">{currentLevel.title}</span>
                           </div>
                           <div>
                              <span className="block text-gray-500 text-xs font-mono uppercase">Verses</span>
                              <span className="text-xl text-blue-400 font-mono">{collectedVerses.length}</span>
                           </div>
                           <div>
                              <span className="block text-gray-500 text-xs font-mono uppercase">Achievements</span>
                              <span className="text-xl text-green-400 font-mono">{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
                           </div>
                        </div>
                        <div className="mt-4">
                           <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Progress to Lvl {currentLevel.level + 1}</span>
                              <span>{Math.floor(progressPercent)}%</span>
                           </div>
                           <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400" style={{ width: `${progressPercent}%` }}></div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-black/40 p-4 rounded border border-gray-700">
                        <h3 className="text-red-400 font-retro text-sm uppercase mb-4 border-b border-gray-700 pb-2">Spiritual Intensity</h3>
                        <div className="flex gap-2 mb-4">
                            {(['easy', 'normal', 'hard'] as DifficultyMode[]).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => handleDifficultyChange(m)}
                                    className={`flex-1 py-2 px-1 text-xs font-bold uppercase rounded border-2 transition-all ${user.difficulty === m ? (m === 'hard' ? 'bg-red-900 border-red-500 text-white' : m === 'easy' ? 'bg-green-900 border-green-500 text-white' : 'bg-yellow-900 border-yellow-500 text-white') : 'bg-gray-800 border-gray-600 text-gray-500 hover:bg-gray-700'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                        <div className="text-xs text-gray-400 font-serif italic">
                            {user.difficulty === 'easy' && "For those seeking encouragement. Grace abounds."}
                            {user.difficulty === 'normal' && "The standard path. Balanced challenge and growth."}
                            {user.difficulty === 'hard' && "For spiritual warriors. Strict guidance, high reward."}
                        </div>
                     </div>
                  </div>

                  {/* Honors (Badges) Section */}
                  <div>
                     <h3 className="text-purple-400 font-retro text-lg uppercase mb-4 flex items-center gap-2">
                        <span>🎖️</span> Honors
                     </h3>
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {BADGES.map((badge) => {
                           const isUnlocked = user.badges.includes(badge.id);
                           return (
                              <div 
                                 key={badge.id} 
                                 className={`p-3 rounded border flex flex-col items-center text-center transition-all ${isUnlocked ? 'bg-gray-800 border-purple-500/50 shadow-sm' : 'bg-gray-900/50 border-gray-800 opacity-50 grayscale'}`}
                                 title={badge.description}
                              >
                                 <div className={`text-3xl mb-2 ${isUnlocked ? 'animate-float' : ''}`}>{badge.icon}</div>
                                 <div className={`text-[10px] font-bold uppercase leading-tight ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{badge.name}</div>
                                 {isUnlocked && <div className="text-[8px] text-purple-300 mt-1">Unlocked</div>}
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  {/* Deeds of Faith (Achievements) Section */}
                  <div>
                     <h3 className="text-green-400 font-retro text-lg uppercase mb-4 flex items-center gap-2">
                        <span>🏆</span> Deeds of Faith
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ACHIEVEMENTS.map((ach) => {
                           const isUnlocked = unlockedAchievements.includes(ach.id);
                           return (
                              <div 
                                 key={ach.id} 
                                 className={`flex items-start gap-3 p-3 rounded border-2 transition-all ${isUnlocked ? 'bg-gray-800 border-green-600/50 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-gray-900/50 border-gray-800 opacity-60'}`}
                              >
                                 <div className={`text-2xl w-10 h-10 flex items-center justify-center rounded bg-black border border-gray-700 shrink-0 ${!isUnlocked && 'grayscale'}`}>
                                    {ach.icon}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                       <h4 className={`text-sm font-bold truncate ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{ach.title}</h4>
                                       {isUnlocked && <span className="text-[10px] text-green-400">✓</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{ach.description}</p>
                                    <div className={`text-[9px] font-mono mt-2 inline-block px-1.5 py-0.5 rounded ${isUnlocked ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-600'}`}>
                                       +{ach.xpReward} XP
                                    </div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>

               </div>
            )}

            {/* TAB: ACTIVITY LOG */}
            {activeTab === 'activity' && (
               <div className="animate-fade-in h-full flex flex-col">
                  <h2 className="text-2xl font-retro text-white mb-4">Personal History</h2>
                  
                  {isGuest ? (
                      <div className="flex-1 flex items-center justify-center text-gray-500">
                          <p>Activity logging requires an account.</p>
                      </div>
                  ) : personalFeed.length === 0 ? (
                      <div className="flex-1 flex items-center justify-center text-gray-500 border-4 border-dashed border-gray-700 rounded-xl">
                          <p>No activity recorded yet.</p>
                      </div>
                  ) : (
                      <div className="space-y-4 overflow-y-auto pr-2 custom-scroll max-h-[500px]">
                          {personalFeed.map((item, idx) => (
                              <div key={idx} className="flex gap-4 p-4 bg-black/40 rounded border-l-4 border-gray-600 hover:border-yellow-500 transition-colors">
                                  <div className="text-2xl">{getActivityIcon(item.activity_type)}</div>
                                  <div>
                                      <p className="text-sm text-gray-300">{getActivityText(item)}</p>
                                      <p className="text-[10px] text-gray-500 font-mono mt-1">{new Date(item.created_at).toLocaleString()}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
               </div>
            )}

            {/* TAB: ARCHETYPE SELECTOR */}
            {activeTab === 'archetype' && (
               <div className="animate-fade-in text-center">
                  <h2 className="text-2xl font-retro text-yellow-400 mb-6">Choose Your Calling</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto custom-scroll p-2">
                     {ARCHETYPES.map(arch => (
                        <div 
                           key={arch.name}
                           onClick={() => handleArchetypeSelect(arch.name)}
                           className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${user.archetype === arch.name ? 'bg-blue-900 border-blue-400 scale-105 shadow-lg' : 'bg-gray-800 border-gray-600 hover:border-yellow-500'}`}
                        >
                           <div className="text-4xl mb-2">{arch.icon}</div>
                           <h3 className="font-retro text-sm text-white mb-1">{arch.name}</h3>
                           <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">{arch.role}</p>
                           <p className="text-[10px] text-gray-500 leading-tight">{arch.desc}</p>
                        </div>
                     ))}
                  </div>
                  <p className="text-gray-400 text-xs mt-6">
                     Your chosen archetype influences your community identity and avatar generation style.
                  </p>
               </div>
            )}

            {/* TAB: REFERRAL */}
            {activeTab === 'referral' && (
                <div className="flex flex-col items-center text-center animate-fade-in py-8">
                    <div className="max-w-2xl w-full bg-gray-800 p-8 rounded-xl border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                        <div className="text-6xl mb-4">🤝</div>
                        <h2 className="text-3xl font-retro text-yellow-400 mb-2">Evangelism Protocol</h2>
                        <p className="text-gray-300 font-serif text-lg mb-8">Bring new souls to The Journey. Reward the faithful.</p>
                        
                        {isGuest ? (
                            <div className="bg-red-900/30 p-6 rounded border border-red-500 mb-4">
                                <p className="text-red-400 font-bold mb-2">Login Required</p>
                                <p className="text-xs text-gray-400">You must create an account to earn referral rewards.</p>
                                <Button onClick={() => setShowConversionModal(true)} className="mt-4 bg-red-600 hover:bg-red-500">Create Account</Button>
                            </div>
                        ) : (
                            <div className="bg-black/30 p-6 rounded border border-gray-700 mb-8">
                                <p className="text-xs text-gray-500 uppercase mb-2">Your Unique Code</p>
                                <div className="text-4xl font-mono text-white tracking-widest mb-4 select-all">{user.referralCode || 'PENDING...'}</div>
                                <Button onClick={handleCopyReferral} className="text-xs">Copy Invite Link</Button>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="bg-gray-900 p-4 rounded border border-gray-700">
                                <h4 className="text-green-400 font-bold mb-1">For You</h4>
                                <p className="text-xs text-gray-400">Earn <span className="text-white font-bold">500 XP</span> for every pilgrim who joins via your code.</p>
                            </div>
                            <div className="bg-gray-900 p-4 rounded border border-gray-700">
                                <h4 className="text-blue-400 font-bold mb-1">For Them</h4>
                                <p className="text-xs text-gray-400">New pilgrims start with <span className="text-white font-bold">200 XP</span> bonus.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: AVATAR STUDIO */}
            {activeTab === 'avatar' && (
               <div className="animate-fade-in flex flex-col items-center">
                  <div className="max-w-2xl w-full text-center">
                     <h2 className="text-3xl font-retro text-yellow-400 mb-2">Avatar Studio</h2>
                     <p className="text-gray-400 font-serif mb-8 text-sm">
                        Use your accumulated XP to forge a new unique identity. 
                        Generated avatars are added to your <strong>Forged Collection</strong>.
                     </p>

                     {isGuest && (
                         <div className="bg-red-900/30 p-4 rounded border border-red-500 mb-6 text-sm text-red-200">
                             <strong>Guest Mode:</strong> You must create an account to generate and save permanent avatars.
                         </div>
                     )}

                     {/* Tier Selection */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-8">
                        {AVATAR_TIERS.map(tier => {
                           const locked = totalPoints < tier.minXP;
                           return (
                              <button 
                                key={tier.id}
                                onClick={() => !locked && setSelectedTierId(tier.id)}
                                disabled={locked}
                                className={`p-3 rounded border-2 transition-all relative overflow-hidden group ${selectedTierId === tier.id ? 'bg-yellow-900/40 border-yellow-500' : 'bg-gray-800 border-gray-700'} ${locked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}
                              >
                                 <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">{tier.name}</div>
                                 <div className={`text-xs font-mono ${locked ? 'text-red-400' : 'text-green-400'}`}>
                                    {tier.minXP.toLocaleString()} XP
                                 </div>
                                 {locked && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xl">🔒</div>}
                              </button>
                           )
                        })}
                     </div>

                     <div className="bg-black/50 p-8 rounded-xl border border-gray-700 shadow-inner flex flex-col items-center relative overflow-hidden">
                        
                        {/* Preview Area */}
                        <div className="w-48 h-48 bg-gray-900 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center mb-6 relative">
                           {isGenerating ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 p-4 text-center">
                                 <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                 <p className="text-[10px] text-blue-300 font-mono animate-pulse">{generationMsg}</p>
                              </div>
                           ) : (
                              <div className="text-6xl opacity-20">🎨</div>
                           )}
                           <img src={user.avatar} className={`w-full h-full object-cover opacity-50 filter grayscale blur-sm transition-all duration-1000 ${isGenerating ? 'scale-90' : 'scale-100'}`} />
                        </div>

                        <Button 
                           onClick={handleGenerateClick} 
                           disabled={isGenerating || !isAvatarStudioUnlocked}
                           className={`w-full max-w-xs text-lg py-4 relative z-20 ${!isAvatarStudioUnlocked ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-blue-600 hover:bg-blue-500'}`}
                        >
                           {isGenerating ? 'Forging...' : 'Generate New Identity (-50 XP)'}
                        </Button>
                        
                        {!isAvatarStudioUnlocked && (
                           <p className="text-red-400 text-xs mt-3 font-mono">
                              Required: {AVATAR_TIERS[0].minXP.toLocaleString()} XP
                           </p>
                        )}
                        
                        <p className="text-gray-500 text-[10px] mt-6 max-w-md">
                           Generates a unique image based on your Archetype ({user.archetype || 'Novice'}) and selected Protocol tier. Old avatars are saved to your Vault.
                        </p>
                     </div>
                  </div>
               </div>
            )}

            {/* TAB: GLOBAL REGISTRY */}
            {activeTab === 'registry' && (
                <div className="animate-fade-in space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-retro text-white mb-2">Global Soul Registry</h2>
                        <p className="text-gray-400 text-sm font-serif">Live statistics from the Journey Network.</p>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-800 p-6 rounded-lg text-center border-t-4 border-blue-500 shadow-lg">
                            <div className="text-4xl font-mono text-white mb-1">{registryData.users.toLocaleString()}</div>
                            <div className="text-xs text-blue-400 uppercase tracking-widest">Active Pilgrims</div>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg text-center border-t-4 border-green-500 shadow-lg">
                            <div className="text-4xl font-mono text-white mb-1">{registryData.verses.toLocaleString()}</div>
                            <div className="text-xs text-green-400 uppercase tracking-widest">Verses Discovered</div>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg text-center border-t-4 border-yellow-500 shadow-lg">
                            <div className="text-4xl font-mono text-white mb-1">{registryData.achievements.toLocaleString()}</div>
                            <div className="text-xs text-yellow-400 uppercase tracking-widest">Deeds Completed</div>
                        </div>
                    </div>

                    {/* Charts */}
                    {registryData.loaded && !isGuest && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            
                            {/* Rank Distribution */}
                            <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                    <span>📊</span> Rank Distribution
                                </h3>
                                <div className="h-48 w-full">
                                    <BarChart data={charts.rankDist} />
                                </div>
                            </div>

                            {/* Activity Trends */}
                            <div className="bg-gray-900/50 p-4 rounded border border-gray-700">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                    <span>📈</span> Activity Trends (7 Days)
                                </h3>
                                <div className="h-48 w-full">
                                    <LineChart data={charts.activityTrend} color="#3b82f6" />
                                </div>
                            </div>

                            {/* Event Breakdown */}
                            <div className="bg-gray-900/50 p-4 rounded border border-gray-700 lg:col-span-2 flex flex-col md:flex-row gap-8 items-center">
                                <div className="w-full md:w-1/3 h-48">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 text-center">Event Breakdown</h3>
                                    <DonutChart data={charts.activityType} />
                                </div>
                                <div className="flex-1 space-y-3 w-full">
                                    <div className="grid grid-cols-2 gap-2">
                                        {charts.activityType.map((d, i) => (
                                            <div key={i} className="flex justify-between items-center bg-black/40 p-2 rounded border border-gray-800">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                                                    <span className="text-gray-400 text-xs">{d.label}</span>
                                                </div>
                                                <span className="text-white text-xs font-mono">{d.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {isGuest && (
                        <div className="text-center text-xs text-gray-500 italic mt-8">
                            Note: Connect to network (Login) to see real-time charts.
                        </div>
                    )}
                </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
