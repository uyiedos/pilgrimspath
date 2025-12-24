
import React, { useState, useEffect } from 'react';
import { 
  AppView, User, GameState, BiblePlan, 
  Achievement, SupportTicket
} from './types';
import { 
  GAMES, ACHIEVEMENTS, PLAYER_LEVELS, DEFAULT_PLANS
} from './constants';
import { LanguageCode } from './translations';
import { supabase } from './lib/supabase';
import { AudioSystem } from './utils/audio';

// Components
import AuthView from './components/AuthView';
import LandingView from './components/LandingView';
import GameLibraryView from './components/GameLibraryView';
import LevelMap from './components/LevelMap';
import GameView from './components/GameView';
import JournalView from './components/JournalView';
import DevotionalView from './components/DevotionalView';
import PlansView from './components/PlansView';
import JourneyTVView from './components/JourneyTVView';
import BibleReaderView from './components/BibleReaderView';
import LeaderboardView from './components/LeaderboardView';
import WikiView from './components/WikiView';
import TokenLaunchView from './components/TokenLaunchView';
import ProfileView from './components/ProfileView';
import SupportView from './components/SupportView';
import AdminView from './components/AdminView';
import BibleActivitiesView from './components/BibleActivitiesView';
import MissionsView from './components/MissionsView';
import StakingView from './components/StakingView';
import DonationView from './components/DonationView';
import PrayerRoomView from './components/PrayerRoomView';
import MarketplaceView from './components/MarketplaceView';
import GiveawaysView from './components/GiveawaysView';
import RafflesView from './components/RafflesView';
import BrowserView from './components/BrowserView';
import CommunityView from './components/CommunityView';
import PilgrimsArchiveView from './components/PilgrimsArchiveView';
import ForgeView from './components/ForgeView';
import TreasuryView from './components/TreasuryView';
import AchievementPopup from './components/AchievementPopup';
import LevelUpModal from './components/LevelUpModal';
import DailyRewardModal from './components/DailyRewardModal';
import GlobalChat from './components/GlobalChat';
import GuestConversionModal from './components/GuestConversionModal';

const INITIAL_STATE: GameState = {
  user: null,
  totalPoints: 0,
  activeGameId: 'pilgrim',
  progress: { pilgrim: 1, david: 1, paul: 1 },
  view: AppView.AUTH,
  chatHistory: {},
  collectedVerses: [],
  journalEntries: [],
  unlockedAchievements: [],
  language: 'en',
  supportTickets: [],
  plans: DEFAULT_PLANS,
  rank: 1
};

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);
  const [showLevelUp, setShowLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showGuestConversion, setShowGuestConversion] = useState(false);
  const [activeLevelId, setActiveLevelId] = useState<number | null>(null);
  const [xpNotifs, setXpNotifs] = useState<{ id: number, amount: number, label?: string }[]>([]);
  
  // Navigation Params
  const [navParams, setNavParams] = useState<any>(null);

  // Initialize Audio
  useEffect(() => {
    const interactHandler = () => {
        AudioSystem.init();
        window.removeEventListener('click', interactHandler);
    };
    window.addEventListener('click', interactHandler);
    return () => window.removeEventListener('click', interactHandler);
  }, []);

  // Check URL params for deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('plan_id');
    const communityId = params.get('community_id');
    const artifactId = params.get('artifact_id');

    if (planId) setNavParams({ initialPlanId: planId });
    else if (communityId) setNavParams({ initialCommunityId: communityId });
    else if (artifactId) setNavParams({ initialArtifactId: artifactId });
  }, []);

  // Handle deep link navigation after login
  useEffect(() => {
      if (gameState.user && navParams && gameState.view === AppView.LANDING) {
          if (navParams.initialPlanId) setGameState(prev => ({ ...prev, view: AppView.PLANS }));
          else if (navParams.initialCommunityId) setGameState(prev => ({ ...prev, view: AppView.COMMUNITY }));
          else if (navParams.initialArtifactId) setGameState(prev => ({ ...prev, view: AppView.FORGE }));
      }
  }, [gameState.user, navParams, gameState.view]);

  // Fetch Wealth & Stats
  const refreshWealth = async (userId: string) => {
      if (userId.startsWith('offline-')) return;
      try {
        const { data, error } = await supabase.rpc('get_player_wealth', { p_user_id: userId });
        if (data && !error) {
            setGameState(prev => {
                if (!prev.user) return prev;
                return {
                    ...prev,
                    user: { 
                        ...prev.user, 
                        totalPoints: data.liquid_xp, 
                        assetPoints: data.asset_xp, 
                        stakedPoints: data.staked_xp 
                    },
                    totalPoints: data.liquid_xp 
                };
            });
        }
      } catch (e) {
        console.warn("Wealth refresh failed", e);
      }
  };

  // Fetch User Data (Verses, Journal, Achievements, Progress, Plans)
  const loadUserData = async (userId: string) => {
      if (userId.startsWith('offline-')) return;

      try {
          const [versesRes, journalRes, achievRes, progressRes, plansRes] = await Promise.all([
              supabase.from('collected_verses').select('verse_text').eq('user_id', userId),
              supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
              supabase.from('unlocked_achievements').select('achievement_id').eq('user_id', userId),
              supabase.from('user_progress').select('*').eq('user_id', userId),
              supabase.from('user_plans').select('*').eq('user_id', userId)
          ]);

          // 1. Progress (Safe Merge)
          const loadedProgress = { ...INITIAL_STATE.progress };
          if (progressRes.data) {
              progressRes.data.forEach((p: any) => {
                  if (p.game_id && p.level_id) {
                      // Normalize key to lowercase to match GameModeId
                      const gameKey = p.game_id.toLowerCase() as keyof typeof loadedProgress;
                      if (loadedProgress[gameKey] !== undefined) {
                          // Use Math.max to prevent local progress regression if DB is slow
                          loadedProgress[gameKey] = Math.max(loadedProgress[gameKey], p.level_id);
                      }
                  }
              });
          }

          // 2. Plans (Merge Default with Saved)
          const savedPlans = plansRes.data || [];
          const mergedPlans: BiblePlan[] = DEFAULT_PLANS.map(defPlan => {
              const saved = savedPlans.find((p: any) => p.id === defPlan.id);
              if (saved) {
                  return {
                      ...defPlan,
                      progress: saved.progress,
                      isActive: saved.is_active,
                      startDate: saved.start_date,
                      lastCompletedDate: saved.last_completed_date
                  };
              }
              return defPlan;
          });

          // Add Custom Forged Plans not in Default
          savedPlans.forEach((p: any) => {
              if (!DEFAULT_PLANS.some(dp => dp.id === p.id)) {
                  mergedPlans.push({
                      id: p.id,
                      title: p.title,
                      desc: p.description,
                      category: p.category as any,
                      image: p.image,
                      duration: p.duration,
                      progress: p.progress,
                      isActive: p.is_active,
                      startDate: p.start_date,
                      lastCompletedDate: p.last_completed_date,
                      days: p.days_json || []
                  });
              }
          });

          setGameState(prev => ({
              ...prev,
              collectedVerses: versesRes.data ? versesRes.data.map((v: any) => v.verse_text) : [],
              journalEntries: journalRes.data || [],
              unlockedAchievements: achievRes.data ? achievRes.data.map((a: any) => a.achievement_id) : [],
              progress: { ...prev.progress, ...loadedProgress }, // Merge with existing to be safe
              plans: mergedPlans
          }));
      } catch (e) {
          console.error("Data Load Error:", e);
      }
  };

  // Sync Logic to be called by child views after a transaction
  const handleSync = () => {
      if (gameState.user) {
          refreshWealth(gameState.user.id);
          loadUserData(gameState.user.id);
      }
  };

  const handleLogin = (user: User, language: LanguageCode) => {
    setGameState(prev => ({
      ...prev,
      user,
      language,
      totalPoints: user.totalPoints || 0,
      view: AppView.LANDING
    }));
    
    refreshWealth(user.id);
    loadUserData(user.id); // Load the stats for profile

    const today = new Date().toLocaleDateString();
    const lastClaimDate = user.lastDailyClaim ? new Date(user.lastDailyClaim).toLocaleDateString() : '';
    if (lastClaimDate !== today) {
        setShowDailyReward(true);
    }
  };

  const handleClaimDaily = async () => {
      if (!gameState.user) return;
      const reward = 10;
      addPoints(reward);
      setShowDailyReward(false);
      
      if (!gameState.user.id.startsWith('offline-')) {
          await supabase.from('users').update({ 
              last_daily_claim: Date.now(), 
              total_points: (gameState.user.totalPoints || 0) + reward 
          }).eq('id', gameState.user.id);
      }
      
      setGameState(prev => ({
          ...prev,
          user: prev.user ? { ...prev.user, lastDailyClaim: Date.now() } : null
      }));
      AudioSystem.playAchievement();
  };

  // Modified handleNav to allow skipping data refresh (prevents race conditions)
  const handleNav = (view: AppView, refreshData = true) => {
    AudioSystem.playVoxelTap();
    setGameState(prev => ({ ...prev, view }));
    
    if(gameState.user && refreshData) {
        refreshWealth(gameState.user.id);
        // Only reload data if navigating to key views to save bandwidth
        if ([AppView.PROFILE, AppView.MAP, AppView.PLANS].includes(view)) {
            loadUserData(gameState.user.id);
        }
    }
  };

  const addPoints = async (amount: number, label?: string) => {
    // Show Notification
    const notifId = Date.now();
    setXpNotifs(prev => [...prev, { id: notifId, amount, label }]);
    setTimeout(() => {
        setXpNotifs(prev => prev.filter(n => n.id !== notifId));
    }, 2000);

    setGameState(prev => {
      const newPoints = prev.totalPoints + amount;
      
      // Level check based on NET WORTH (Total + Assets + Staked)
      const currentNetWorth = (prev.user?.totalPoints || 0) + (prev.user?.assetPoints || 0) + (prev.user?.stakedPoints || 0);
      const newNetWorth = currentNetWorth + amount;

      const currentLevelObj = PLAYER_LEVELS.filter(l => l.xp <= currentNetWorth).pop();
      const newLevelObj = PLAYER_LEVELS.filter(l => l.xp <= newNetWorth).pop();

      if (currentLevelObj && newLevelObj && newLevelObj.level > currentLevelObj.level) {
        setShowLevelUp({ level: newLevelObj.level, title: newLevelObj.title });
        AudioSystem.playLevelComplete();
      }

      return { ...prev, totalPoints: newPoints, user: prev.user ? { ...prev.user, totalPoints: newPoints } : null };
    });
    
    if (gameState.user && !gameState.user.id.startsWith('offline-')) {
        await supabase.rpc('increment_points', { p_user_id: gameState.user.id, p_amount: amount });
    }
  };

  const spendPoints = async (amount: number, type: string = 'spend'): Promise<boolean> => {
      if (gameState.totalPoints < amount) return false;
      
      setGameState(prev => ({ 
          ...prev, 
          totalPoints: prev.totalPoints - amount,
          user: prev.user ? { ...prev.user, totalPoints: prev.totalPoints - amount } : null
      }));
      
      if (gameState.user && !gameState.user.id.startsWith('offline-')) {
          const { error } = await supabase.rpc('spend_points', {
              p_user_id: gameState.user.id,
              p_amount: amount,
              p_type: type
          });
          if (error) {
              refreshWealth(gameState.user.id); // Revert on failure
              return false;
          }
      }
      return true;
  };

  const unlockAchievement = (id: string) => {
    if (gameState.unlockedAchievements.includes(id)) return;
    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (achievement) {
      setGameState(prev => ({
        ...prev,
        unlockedAchievements: [...prev.unlockedAchievements, id]
      }));
      setShowAchievement(achievement);
      addPoints(achievement.xpReward, achievement.title); // Pass title for notif
      AudioSystem.playAchievement();
      
      if (gameState.user && !gameState.user.id.startsWith('offline-')) {
          supabase.from('unlocked_achievements').insert({ user_id: gameState.user.id, achievement_id: id }).then();
      }
    }
  };

  const awardBadge = async (badgeId: string) => {
      if (!gameState.user || gameState.user.badges.includes(badgeId)) return;
      const newBadges = [...gameState.user.badges, badgeId];
      setGameState(prev => ({ ...prev, user: prev.user ? { ...prev.user, badges: newBadges } : null }));
      AudioSystem.playAchievement();
      if (!gameState.user.id.startsWith('offline-')) {
          await supabase.from('users').update({ badges: newBadges }).eq('id', gameState.user.id);
      }
  };

  const handleConvertGuest = async (email: string, password: string, username: string) => {
      const { data, error } = await (supabase.auth as any).signUp({ email, password });
      if (error) throw error;
      if (data.user) {
          await supabase.from('users').insert({
              id: data.user.id,
              username: username,
              avatar: gameState.user?.avatar,
              total_points: gameState.totalPoints,
              badges: gameState.user?.badges,
              joined_date: new Date().toISOString()
          });
          setGameState(prev => ({ ...prev, user: { ...prev.user!, id: data.user!.id, email, username } }));
          setShowGuestConversion(false);
          alert("Account created and progress saved!");
      }
  };

  const activeGame = GAMES.find(g => g.id === gameState.activeGameId) || GAMES[0];
  const activeLevel = activeGame.levels.find(l => l.id === activeLevelId);
  const isImmersiveView = [AppView.GAME, AppView.PRAYER_ROOM].includes(gameState.view);

  // Net Worth for UI display
  const netWorth = (gameState.user?.totalPoints || 0) + (gameState.user?.assetPoints || 0) + (gameState.user?.stakedPoints || 0);
  const currentLevelInfo = PLAYER_LEVELS.filter(l => l.xp <= netWorth).pop() || PLAYER_LEVELS[0];

  if (gameState.view === AppView.AUTH) {
      return <AuthView onLogin={handleLogin} />;
  }

  return (
    <div className="bg-black min-h-screen font-sans text-white overflow-hidden relative flex flex-col">
      
      {/* HEADER (Only show if not immersive) */}
      {!isImmersiveView && gameState.user && (
        <header className="fixed top-0 left-0 w-full z-50 bg-black/90 backdrop-blur-xl border-b border-white/10 shadow-2xl px-4 py-3 flex justify-between items-center h-16 md:h-20 shrink-0 transition-all duration-300">
            {/* LEFT: PROFILE */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleNav(AppView.PROFILE)}>
                <div className="relative">
                    <img src={gameState.user.avatar} className="w-11 h-11 md:w-12 md:h-12 rounded-full border-2 border-yellow-500 object-cover group-hover:scale-105 transition-transform" alt="Avatar" />
                    <div className="absolute -bottom-1 -right-1 bg-black text-[8px] font-bold px-1 py-0.5 rounded border border-yellow-500 text-yellow-500 shadow-md leading-tight">Lvl {currentLevelInfo.level}</div>
                </div>
                <div className="flex flex-col">
                    <p className="text-yellow-500 font-retro text-[10px] md:text-xs uppercase group-hover:text-white transition-colors truncate max-w-[80px] md:max-w-none">{gameState.user.username}</p>
                    <p className="text-gray-400 text-[9px] md:text-[10px] font-mono hidden md:block">{gameState.user.archetype || 'Wanderer'}</p>
                </div>
            </div>

            {/* CENTER: TITLE & SOCIALS */}
            <div className="flex flex-col items-center gap-1">
                <div className="hidden md:block pointer-events-none opacity-80" onClick={() => handleNav(AppView.LANDING)}>
                    <h1 className="font-retro text-xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-md tracking-tighter cursor-pointer pointer-events-auto hover:scale-105 transition-transform">THE JOURNEY</h1>
                </div>
                {/* Social Icons (Visible Mobile & Desktop) */}
                <div className="flex gap-4 items-center">
                    <a href="https://x.com/thejourneyapptv" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors" title="Follow on X">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                    </a>
                    <a href="https://www.youtube.com/@JourneyappTV" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-red-500 transition-colors" title="Subscribe on YouTube">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                    </a>
                    <a href="https://www.tiktok.com/@thejourneyapptv" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors" title="Follow on TikTok">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3V0Z" /></svg>
                    </a>
                    <a href="https://www.twitch.tv/journeyapptv" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-500 transition-colors" title="Follow on Twitch">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" /></svg>
                    </a>
                </div>
            </div>

            {/* RIGHT: XP STATS */}
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-yellow-400 font-mono font-bold text-sm md:text-base drop-shadow-sm flex items-center gap-1">
                        {netWorth.toLocaleString()} <span className="text-[10px]">XP</span>
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest hidden md:block">Net Worth</span>
                </div>
                <div className="flex flex-col items-end border-l border-white/10 pl-2 md:pl-4">
                    <div className="flex items-center gap-1">
                        <span className="text-blue-400 font-mono font-bold text-sm md:text-base drop-shadow-sm hidden md:inline">{gameState.totalPoints.toLocaleString()}</span>
                        <span className="md:hidden text-blue-400 text-xs" title="Liquid XP">💧</span>
                    </div>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest hidden md:block">Liquid</span>
                </div>
            </div>
        </header>
      )}

      {/* XP NOTIFICATIONS (TOASTS) */}
      <div className="fixed top-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
          {xpNotifs.map(notif => (
              <div key={notif.id} className="bg-gray-900/90 border border-yellow-500/50 text-yellow-400 px-4 py-2 rounded-xl shadow-2xl animate-slide-in flex items-center gap-2 font-mono text-sm backdrop-blur-md">
                  <span className="text-xl">✨</span>
                  <div>
                      <span className="font-bold">+{notif.amount} XP</span>
                      {notif.label && <span className="block text-[9px] text-gray-400 uppercase tracking-wider">{notif.label}</span>}
                  </div>
              </div>
          ))}
      </div>

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 w-full relative overflow-y-auto custom-scroll ${!isImmersiveView ? 'pt-16 pb-24 md:pt-20 md:pb-0' : ''}`}>
        
        {/* VIEW ROUTER */}
        {gameState.view === AppView.LANDING && <LandingView user={gameState.user} onNavigate={handleNav} language={gameState.language} />}
        
        {gameState.view === AppView.GAME_LIBRARY && <GameLibraryView onSelectGame={(id) => { setGameState(prev => ({...prev, activeGameId: id})); handleNav(AppView.MAP); }} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} />}
        
        {gameState.view === AppView.MAP && <LevelMap gameConfig={activeGame} unlockedLevelId={gameState.progress[gameState.activeGameId] || 1} onSelectLevel={(lvlId) => { setActiveLevelId(lvlId); handleNav(AppView.GAME); }} onLibrary={() => handleNav(AppView.GAME_LIBRARY)} onHome={() => handleNav(AppView.LANDING)} language={gameState.language} />}
        
        {gameState.view === AppView.GAME && activeLevel && <GameView level={activeLevel} onBack={() => handleNav(AppView.MAP)} onHome={() => handleNav(AppView.LANDING)} onNavigate={handleNav} onComplete={(verse) => { 
            const nextLevel = activeLevel.id + 1;
            const currentLevel = gameState.progress[gameState.activeGameId] || 1;
            const newProgress = { ...gameState.progress, [gameState.activeGameId]: Math.max(currentLevel, nextLevel) };
            
            // Optimistic Update
            let newVerses = gameState.collectedVerses;
            if (!newVerses.includes(verse)) {
                newVerses = [...newVerses, verse];
            }
            
            setGameState(prev => ({ ...prev, progress: newProgress, collectedVerses: newVerses }));
            addPoints(200, "Level Cleared");
            unlockAchievement('first_step'); 
            
            // DB PERSISTENCE
            if (gameState.user && !gameState.user.id.startsWith('offline-')) {
                supabase.from('user_progress').upsert({
                    user_id: gameState.user.id,
                    game_id: gameState.activeGameId,
                    level_id: Math.max(currentLevel, nextLevel)
                }).then();

                if (!gameState.collectedVerses.includes(verse)) {
                    supabase.from('collected_verses').insert({
                        user_id: gameState.user.id,
                        verse_text: verse
                    }).then();
                }
            }

            setActiveLevelId(null);
            // CRITICAL FIX: Pass false to skip reloading data, preventing stale DB read from reverting optimistic progress
            handleNav(AppView.MAP, false); 
        }} language={gameState.language} difficulty={gameState.user?.difficulty || 'normal'} />}
        
        {gameState.view === AppView.JOURNAL && <JournalView state={gameState} onBack={() => handleNav(AppView.LANDING)} onSaveNote={(content) => {
            const newEntry = { id: Date.now().toString(), type: 'note', content, createdAt: new Date().toISOString() };
            setGameState(prev => ({...prev, journalEntries: [newEntry as any, ...prev.journalEntries]}));
            if (gameState.user && !gameState.user.id.startsWith('offline-')) {
                supabase.from('journal_entries').insert({ user_id: gameState.user.id, type: 'note', content }).then();
            }
        }} />}
        
        {gameState.view === AppView.DEVOTIONAL && <DevotionalView onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} userId={gameState.user?.id} />}
        
        {gameState.view === AppView.PLANS && <PlansView user={gameState.user!} onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} language={gameState.language} plans={gameState.plans} onUpdatePlans={(plans) => setGameState(prev => ({...prev, plans}))} initialPlanId={navParams?.initialPlanId} spendPoints={spendPoints} onUnlockAchievement={unlockAchievement} onAwardBadge={awardBadge} />}
        
        {gameState.view === AppView.TV && <JourneyTVView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} spendPoints={spendPoints} onUnlockAchievement={unlockAchievement} />}
        
        {gameState.view === AppView.BIBLE && <BibleReaderView onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} />}
        
        {gameState.view === AppView.LEADERBOARD && <LeaderboardView currentUser={gameState.user} currentPoints={netWorth} onBack={() => handleNav(AppView.LANDING)} />}
        
        {gameState.view === AppView.WIKI && <WikiView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} />}
        
        {gameState.view === AppView.TOKEN && <TokenLaunchView onBack={() => handleNav(AppView.LANDING)} onGoToTV={() => handleNav(AppView.TV)} onNavigate={handleNav} />}
        
        {gameState.view === AppView.PROFILE && <ProfileView user={{...gameState.user!, totalPoints: gameState.totalPoints}} totalPoints={netWorth} unlockedAchievements={gameState.unlockedAchievements} collectedVerses={gameState.collectedVerses} onBack={() => handleNav(AppView.LANDING)} onUpdateUser={(u) => setGameState(prev => ({...prev, user: u}))} language={gameState.language} onConvertGuest={() => setShowGuestConversion(true)} onGoToAdmin={() => handleNav(AppView.ADMIN)} onNavigate={handleNav} journalEntriesCount={gameState.journalEntries.length} />}
        
        {gameState.view === AppView.SUPPORT && <SupportView user={gameState.user} tickets={gameState.supportTickets} onCreateTicket={(ticket) => setGameState(prev => ({...prev, supportTickets: [ticket, ...prev.supportTickets]}))} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} />}
        
        {gameState.view === AppView.ADMIN && <AdminView currentUser={gameState.user!} onBack={() => handleNav(AppView.PROFILE)} />}
        
        {gameState.view === AppView.ACTIVITIES && <BibleActivitiesView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} onAwardBadge={awardBadge} />}
        
        {gameState.view === AppView.MISSIONS && <MissionsView user={gameState.user} collectedVerses={gameState.collectedVerses} onBack={() => handleNav(AppView.LANDING)} onNavigate={handleNav} onAddPoints={addPoints} />}
        
        {gameState.view === AppView.STAKING && <StakingView user={{...gameState.user!, totalPoints: gameState.totalPoints}} onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} />}
        
        {gameState.view === AppView.DONATE && <DonationView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onNavigate={handleNav} onUnlockAchievement={unlockAchievement} />}
        
        {gameState.view === AppView.PRAYER_ROOM && <PrayerRoomView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} spendPoints={spendPoints} />}
        
        {gameState.view === AppView.MARKETPLACE && <MarketplaceView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} spendPoints={spendPoints} onAddPoints={(amt) => gameState.user && refreshWealth(gameState.user.id)} onUnlockAchievement={unlockAchievement} onSync={handleSync} />}
        
        {gameState.view === AppView.GIVEAWAYS && <GiveawaysView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onSync={handleSync} />}
        
        {gameState.view === AppView.RAFFLES && <RafflesView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} onSync={handleSync} />}
        
        {gameState.view === AppView.BROWSER && <BrowserView onBack={() => handleNav(AppView.LANDING)} onNavigate={handleNav} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} />}
        
        {gameState.view === AppView.COMMUNITY && <CommunityView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} onConvertGuest={() => setShowGuestConversion(true)} spendPoints={spendPoints} initialCommunityId={navParams?.initialCommunityId} onSync={handleSync} />}
        
        {gameState.view === AppView.FORGE && <ForgeView user={gameState.user} totalPoints={netWorth} onBack={() => handleNav(AppView.LANDING)} onUpdateUser={(u) => { setGameState(prev => ({...prev, user: u})); refreshWealth(u.id); }} spendPoints={spendPoints} onUnlockAchievement={unlockAchievement} collectedVerses={gameState.collectedVerses} language={gameState.language} initialArtifactId={navParams?.initialArtifactId} onAddPoints={addPoints} onSync={handleSync} />}
        
        {gameState.view === AppView.TREASURY && <TreasuryView onBack={() => handleNav(AppView.LANDING)} />}

        {gameState.view === AppView.ARCHIVE && <PilgrimsArchiveView onBack={() => handleNav(AppView.LANDING)} />}
      </main>

      {/* MOBILE NAVIGATION BAR */}
      {!isImmersiveView && gameState.user && (
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-black/95 backdrop-blur-xl border-t-2 border-white/10 z-[49] h-20 pb-safe flex justify-around items-center px-1 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
            {[
                { id: AppView.LANDING, icon: '🏠', label: 'Home' },
                { id: AppView.MAP, icon: '🗺️', label: 'Play' },
                { id: AppView.DEVOTIONAL, icon: '🍞', label: 'Daily' },
                { id: AppView.COMMUNITY, icon: '🔥', label: 'Fellowship' },
                { id: AppView.PROFILE, icon: '👤', label: 'Me' },
            ].map((item) => (
                <button 
                    key={item.id}
                    onClick={() => handleNav(item.id)} 
                    className={`flex flex-col items-center justify-center w-full h-full transition-all active:scale-90 ${gameState.view === item.id ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
                >
                    <span className={`text-2xl mb-1 ${gameState.view === item.id ? 'animate-float drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]' : ''}`}>{item.icon}</span>
                    <span className="text-[8px] font-retro uppercase tracking-widest">{item.label}</span>
                    {gameState.view === item.id && <span className="w-1 h-1 bg-yellow-500 rounded-full mt-1"></span>}
                </button>
            ))}
        </nav>
      )}

      {/* OVERLAYS */}
      {!isImmersiveView && gameState.user && (
        <GlobalChat user={gameState.user} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} />
      )}
      
      {showAchievement && <AchievementPopup achievement={showAchievement} onClose={() => setShowAchievement(null)} />}
      {showLevelUp && <LevelUpModal level={showLevelUp.level} title={showLevelUp.title} onClose={() => setShowLevelUp(null)} />}
      {showDailyReward && <DailyRewardModal onClaim={handleClaimDaily} />}
      {showGuestConversion && <GuestConversionModal onConvert={handleConvertGuest} onCancel={() => setShowGuestConversion(false)} />}
    </div>
  );
};
