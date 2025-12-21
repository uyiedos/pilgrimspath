
import React, { useState, useEffect } from 'react';
import { 
  AppView, User, GameState, GameModeId, 
  Achievement, BiblePlan, SupportTicket 
} from './types';
import { 
  GAMES, ACHIEVEMENTS, BADGES, DEFAULT_PLANS, 
  PLAYER_LEVELS
} from './constants';
import { UI_TEXT, LanguageCode } from './translations';
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
import CommunityView from './components/CommunityView';
import GiveawaysView from './components/GiveawaysView';
import RafflesView from './components/RafflesView';
import PrayerRoomView from './components/PrayerRoomView';
import TreasuryView from './components/TreasuryView';
import BibleActivitiesView from './components/BibleActivitiesView';
import ForgeView from './components/ForgeView';
import PilgrimsArchiveView from './components/PilgrimsArchiveView';
import MarketplaceView from './components/MarketplaceView';
import BrowserView from './components/BrowserView';
import MissionsView from './components/MissionsView';
import StakingView from './components/StakingView';

// Modals & UI
import LevelUpModal from './components/LevelUpModal';
import AchievementPopup from './components/AchievementPopup';
import DailyRewardModal from './components/DailyRewardModal';
import GuestConversionModal from './components/GuestConversionModal';
import GlobalChat from './components/GlobalChat';

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

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [recentAchievement, setRecentAchievement] = useState<Achievement | null>(null);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [showGuestConversion, setShowGuestConversion] = useState(false);
  const [activeLevelId, setActiveLevelId] = useState<number | null>(null);
  
  // Global Treasury Balance for Header
  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);

  // Initialize Audio & Treasury
  useEffect(() => {
    const handleInteraction = () => AudioSystem.init();
    window.addEventListener('click', handleInteraction);
    
    // Fetch Treasury Balance periodically
    const fetchTreasury = async () => {
        const { data } = await supabase.from('treasury').select('balance').eq('id', 1).single();
        if (data) setTreasuryBalance(data.balance);
    };
    fetchTreasury();
    const interval = setInterval(fetchTreasury, 30000);
    
    return () => {
        window.removeEventListener('click', handleInteraction);
        clearInterval(interval);
    };
  }, []);

  const refreshWealth = async (userId: string) => {
      if (userId.startsWith('offline-')) return;
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
                  totalPoints: data.liquid_xp // Keep local state in sync with liquid for spending logic
              };
          });
      }
  };

  const syncUserData = async (userId: string) => {
      if (userId.startsWith('offline-')) return;
      
      // 1. Fetch Verses
      const { data: verses } = await supabase.from('collected_verses').select('verse_text').eq('user_id', userId);
      const collectedVerses = verses ? verses.map(v => v.verse_text) : [];

      // 2. Fetch Journal
      const { data: journal } = await supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      const journalEntries = journal || [];

      // 3. Fetch Achievements
      const { data: achievements } = await supabase.from('unlocked_achievements').select('achievement_id').eq('user_id', userId);
      const unlockedAchievements = achievements ? achievements.map(a => a.achievement_id) : [];

      // 4. Fetch User Profile Stats (Referrals, badges, etc)
      const { data: userProfile } = await supabase.from('users').select('referrals_count, total_points, badges').eq('id', userId).single();

      // 5. Update State
      setGameState(prev => ({
          ...prev,
          collectedVerses,
          journalEntries: journalEntries as any[],
          unlockedAchievements,
          user: prev.user ? { 
              ...prev.user, 
              referralsCount: userProfile?.referrals_count || 0,
              badges: userProfile?.badges || prev.user.badges 
          } : null
      }));
  };

  const handleLogin = async (user: User, language: LanguageCode) => {
    setGameState(prev => ({
      ...prev,
      user,
      language,
      view: AppView.LANDING,
      totalPoints: user.totalPoints || 0 
    }));
    
    // Check Daily Reward Logic
    // Rules: 
    // 1. Not claimed today (check lastDailyClaim timestamp)
    // 2. Must be before 12:00 PM (Noon) local time
    // 3. Must not have been SEEN today (Local Storage Check)
    
    const now = new Date();
    const lastClaimDate = new Date(user.lastDailyClaim || 0);
    const isSameDay = now.toDateString() === lastClaimDate.toDateString();
    const isBeforeNoon = now.getHours() < 12;
    
    const todayStr = now.toDateString();
    const seenKey = `daily_reward_seen_${user.id}_${todayStr}`;
    const hasSeenToday = localStorage.getItem(seenKey);

    if (!isSameDay && isBeforeNoon && !hasSeenToday) {
        setShowDailyReward(true);
        localStorage.setItem(seenKey, 'true');
    }

    // Sync Real Data
    await refreshWealth(user.id);
    await syncUserData(user.id);
  };

  const handleSignOut = () => {
      setGameState(INITIAL_STATE);
      supabase.auth.signOut();
  };

  const handleNav = (view: AppView) => {
    setGameState(prev => ({ ...prev, view }));
    AudioSystem.playVoxelTap();
    if (gameState.user) {
        refreshWealth(gameState.user.id);
        // Re-sync specific data based on view to keep it fresh
        if (view === AppView.PROFILE || view === AppView.MISSIONS || view === AppView.STAKING) syncUserData(gameState.user.id);
    }
  };

  const addPoints = async (amount: number) => {
      // Just refresh wealth, logic is usually server side or strictly additive
      // But for local optimisic updates:
      setGameState(prev => {
          const newPoints = prev.totalPoints + amount;
          return { 
              ...prev, 
              totalPoints: newPoints,
              user: prev.user ? { ...prev.user, totalPoints: newPoints } : null
          };
      });

      if (gameState.user && !gameState.user.id.startsWith('offline-')) {
         if (amount > 0) {
             await supabase.rpc('increment_points', { 
                 p_user_id: gameState.user.id, 
                 p_amount: amount 
             });
         }
         refreshWealth(gameState.user.id);
      }
  };

  const spendPoints = async (amount: number, type: string = 'generic'): Promise<boolean> => {
      if (gameState.totalPoints < amount) {
          alert("Insufficient Liquid Spirit XP.");
          return false;
      }
      
      // Optimistic
      setGameState(prev => {
          const newPoints = prev.totalPoints - amount;
          return { 
              ...prev, 
              totalPoints: newPoints,
              user: prev.user ? { ...prev.user, totalPoints: newPoints } : null
          };
      });
      
      if (gameState.user && !gameState.user.id.startsWith('offline-')) {
          const { error } = await supabase.rpc('spend_points', { p_user_id: gameState.user.id, p_amount: amount, p_type: type });
          if (error) {
              console.error("Spend error:", error);
              setGameState(prev => { // Revert
                  const fixedPoints = prev.totalPoints + amount;
                  return { 
                      ...prev, 
                      totalPoints: fixedPoints,
                      user: prev.user ? { ...prev.user, totalPoints: fixedPoints } : null 
                  };
              });
              return false;
          }
          refreshWealth(gameState.user.id); 
      }
      return true;
  };

  const unlockAchievement = (id: string) => {
      if (gameState.unlockedAchievements.includes(id)) return;
      
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      if (achievement) {
          setRecentAchievement(achievement);
          setGameState(prev => ({
              ...prev,
              unlockedAchievements: [...prev.unlockedAchievements, id]
          }));
          addPoints(achievement.xpReward);
          AudioSystem.playAchievement();
          
          if (gameState.user && !gameState.user.id.startsWith('offline-')) {
              supabase.from('unlocked_achievements').insert({
                  user_id: gameState.user.id,
                  achievement_id: id
              }).then();
          }
      }
  };

  const awardBadge = async (badgeId: string) => {
      if (!gameState.user) return;
      if (gameState.user.badges.includes(badgeId)) return;

      const badge = BADGES.find(b => b.id === badgeId);
      if (badge) {
          AudioSystem.playLevelComplete();
          alert(`🎖️ NEW BADGE EARNED: ${badge.name}`);
          
          const newBadges = [...gameState.user.badges, badgeId];
          
          // Update Local
          setGameState(prev => ({
              ...prev,
              user: prev.user ? { ...prev.user, badges: newBadges } : null
          }));

          // Update DB (Append to array)
          if (!gameState.user.id.startsWith('offline-')) {
              const { error } = await supabase.rpc('append_user_badge', { 
                  p_user_id: gameState.user.id, 
                  p_badge_id: badgeId 
              });
              if (error) {
                  await supabase.from('users').update({ badges: newBadges }).eq('id', gameState.user.id);
              }
          }
      }
  };

  const handleClaimDaily = () => {
      addPoints(10); // Updated to 10 based on user prompt context, though previous was 50. I'll stick to 10 as per prompt hint " +10 Spirit XP"
      setShowDailyReward(false);
      AudioSystem.playAchievement();
      
      if (gameState.user) {
          const now = Date.now();
          const today = new Date().toISOString().split('T')[0];
          
          const updatedUser = { 
              ...gameState.user, 
              lastActivityDate: today,
              lastDailyClaim: now // Update in memory immediately
          };
          
          setGameState(prev => ({ ...prev, user: updatedUser }));
          
          if (!gameState.user.id.startsWith('offline-')) {
              supabase.from('users').update({ 
                  last_activity_date: today,
                  last_daily_claim: now 
              }).eq('id', gameState.user.id);
          }
      }
  };

  const handleConvertGuest = async (email: string, pass: string, username: string) => {
      const { data, error } = await supabase.auth.signUp({ email, password: pass });
      if (error) throw error;
      if (data.user) {
          await supabase.from('users').insert({
              id: data.user.id,
              username: username,
              total_points: gameState.totalPoints,
              avatar: gameState.user?.avatar,
              joined_date: new Date().toISOString(),
              badges: gameState.user?.badges || []
          });
          
          setGameState(prev => ({
              ...prev,
              user: { ...prev.user!, id: data.user!.id, email, username }
          }));
          
          setShowGuestConversion(false);
          AudioSystem.playLevelComplete();
          alert("Soul Record Synced Successfully!");
      }
  };

  const handleSelectGame = (gameId: GameModeId) => {
      setGameState(prev => ({ ...prev, activeGameId: gameId, view: AppView.MAP }));
  };

  const handleLevelComplete = (verse: string) => {
      setGameState(prev => {
          const newProgress = { ...prev.progress };
          newProgress[prev.activeGameId] = Math.max(newProgress[prev.activeGameId], (activeLevelId || 0) + 1);
          const newVerses = prev.collectedVerses.includes(verse) ? prev.collectedVerses : [...prev.collectedVerses, verse];
          return {
              ...prev,
              progress: newProgress,
              collectedVerses: newVerses,
              view: AppView.VICTORY
          };
      });
      addPoints(200);
      setActiveLevelId(null);
      setGameState(prev => ({ ...prev, view: AppView.MAP }));
      
      if (gameState.user && !gameState.user.id.startsWith('offline-')) {
          supabase.from('collected_verses').insert({ user_id: gameState.user.id, verse_text: verse }).then();
      }
  };

  const activeGame = GAMES.find(g => g.id === gameState.activeGameId) || GAMES[0];
  const activeLevel = activeGame.levels.find(l => l.id === activeLevelId);
  
  // NET WORTH CALCULATION FOR DISPLAY (Sums everything)
  const netWorth = (gameState.user?.totalPoints || 0) + (gameState.user?.assetPoints || 0) + (gameState.user?.stakedPoints || 0);
  const currentLevelInfo = PLAYER_LEVELS.filter(l => l.xp <= netWorth).pop() || PLAYER_LEVELS[0];

  const isImmersiveView = [AppView.AUTH, AppView.GAME, AppView.PRAYER_ROOM].includes(gameState.view);

  return (
    <div className="font-sans text-white fixed inset-0 h-[100dvh] w-full overflow-hidden bg-black flex flex-col">
      
      {/* GLOBAL HEADER */}
      {!isImmersiveView && gameState.user && (
        <header className="fixed top-0 left-0 w-full z-50 bg-black/90 backdrop-blur-xl border-b border-white/10 shadow-2xl px-4 py-3 flex justify-between items-center h-16 md:h-20 shrink-0 transition-all duration-300">
            {/* Identity */}
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

            {/* Title */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-80 hidden md:block" onClick={() => handleNav(AppView.LANDING)}>
                <h1 className="font-retro text-xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-md tracking-tighter cursor-pointer pointer-events-auto hover:scale-105 transition-transform">THE JOURNEY</h1>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4">
                {/* Net Worth (Rank) */}
                <div className="flex flex-col items-end">
                    <span className="text-yellow-400 font-mono font-bold text-sm md:text-base drop-shadow-sm flex items-center gap-1">
                        {netWorth.toLocaleString()} <span className="text-[10px]">XP</span>
                    </span>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest hidden md:block">Net Worth</span>
                </div>
                
                {/* Liquid (Wallet) */}
                <div className="flex flex-col items-end border-l border-white/10 pl-2 md:pl-4">
                    <div className="flex items-center gap-1">
                        <span className="text-blue-400 font-mono font-bold text-sm md:text-base drop-shadow-sm hidden md:inline">{gameState.totalPoints.toLocaleString()}</span>
                        <span className="md:hidden text-blue-400 text-xs" title="Liquid XP">💧</span>
                    </div>
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest hidden md:block">Liquid</span>
                </div>

                <button onClick={handleSignOut} className="bg-red-900/30 hover:bg-red-900/60 border border-red-800 text-red-400 p-2 rounded-lg transition-all active:scale-95 ml-1" title="Sign Out">
                    ⏻
                </button>
            </div>
        </header>
      )}

      {/* MAIN CONTENT AREA */}
      <main className={`flex-1 overflow-y-auto custom-scroll relative w-full h-full ${!isImmersiveView ? 'pt-16 pb-20 md:pt-20 md:pb-0' : ''}`}>
        {gameState.view === AppView.AUTH && <AuthView onLogin={handleLogin} />}
        {gameState.view === AppView.LANDING && <LandingView user={gameState.user} onNavigate={handleNav} language={gameState.language} />}
        {gameState.view === AppView.MISSIONS && <MissionsView user={gameState.user} collectedVerses={gameState.collectedVerses} onBack={() => handleNav(AppView.LANDING)} onNavigate={handleNav} onAddPoints={addPoints} />}
        {gameState.view === AppView.GAME_LIBRARY && <GameLibraryView onSelectGame={handleSelectGame} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} />}
        {gameState.view === AppView.MAP && <LevelMap gameConfig={activeGame} unlockedLevelId={gameState.progress[gameState.activeGameId]} onSelectLevel={(id) => { setActiveLevelId(id); handleNav(AppView.GAME); }} onLibrary={() => handleNav(AppView.GAME_LIBRARY)} onHome={() => handleNav(AppView.LANDING)} language={gameState.language} />}
        {gameState.view === AppView.GAME && activeLevel && <GameView level={activeLevel} onBack={() => handleNav(AppView.MAP)} onHome={() => handleNav(AppView.LANDING)} onComplete={handleLevelComplete} language={gameState.language} difficulty={gameState.user?.difficulty || 'normal'} />}
        {gameState.view === AppView.JOURNAL && <JournalView state={gameState} onBack={() => handleNav(AppView.LANDING)} />}
        {gameState.view === AppView.DEVOTIONAL && <DevotionalView onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} userId={gameState.user?.id} />}
        {gameState.view === AppView.TV && <JourneyTVView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} spendPoints={spendPoints} />}
        {gameState.view === AppView.PLANS && <PlansView onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} language={gameState.language} plans={gameState.plans} onUpdatePlans={(newPlans) => setGameState(prev => ({...prev, plans: newPlans}))} />}
        {gameState.view === AppView.BIBLE && <BibleReaderView onBack={() => handleNav(AppView.LANDING)} />}
        {gameState.view === AppView.LEADERBOARD && <LeaderboardView currentUser={gameState.user} currentPoints={netWorth} onBack={() => handleNav(AppView.LANDING)} />}
        {gameState.view === AppView.WIKI && <WikiView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onNavigate={handleNav} />}
        {gameState.view === AppView.TOKEN && <TokenLaunchView onBack={() => handleNav(AppView.LANDING)} onGoToTV={() => handleNav(AppView.TV)} />}
        {gameState.view === AppView.PROFILE && <ProfileView user={{...gameState.user!, totalPoints: gameState.totalPoints}} totalPoints={netWorth} unlockedAchievements={gameState.unlockedAchievements} collectedVerses={gameState.collectedVerses} onBack={() => handleNav(AppView.LANDING)} onUpdateUser={(u) => setGameState(prev => ({...prev, user: u}))} language={gameState.language} onUnlockAchievement={unlockAchievement} onConvertGuest={() => setShowGuestConversion(true)} spendPoints={spendPoints} onAddPoints={addPoints} onGoToAdmin={gameState.user?.role === 'admin' ? () => handleNav(AppView.ADMIN) : undefined} journalEntriesCount={gameState.journalEntries.length} />}
        {gameState.view === AppView.SUPPORT && <SupportView user={gameState.user} tickets={gameState.supportTickets} onCreateTicket={(t) => setGameState(prev => ({...prev, supportTickets: [...prev.supportTickets, t]}))} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} />}
        {gameState.view === AppView.ADMIN && gameState.user && <AdminView currentUser={gameState.user} onBack={() => handleNav(AppView.LANDING)} />}
        {gameState.view === AppView.COMMUNITY && <CommunityView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} onConvertGuest={() => setShowGuestConversion(true)} spendPoints={spendPoints} />}
        {gameState.view === AppView.GIVEAWAYS && <GiveawaysView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} />}
        {gameState.view === AppView.RAFFLES && <RafflesView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} />}
        {gameState.view === AppView.PRAYER_ROOM && <PrayerRoomView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} spendPoints={spendPoints} />}
        {gameState.view === AppView.TREASURY && <TreasuryView onBack={() => handleNav(AppView.LANDING)} />}
        {gameState.view === AppView.ACTIVITIES && <BibleActivitiesView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} onAwardBadge={awardBadge} />}
        {gameState.view === AppView.FORGE && <ForgeView user={gameState.user} totalPoints={netWorth} onBack={() => handleNav(AppView.LANDING)} onUpdateUser={(u) => { setGameState(prev => ({...prev, user: u, totalPoints: u.totalPoints || 0})); refreshWealth(u.id); }} spendPoints={spendPoints} onUnlockAchievement={unlockAchievement} collectedVerses={gameState.collectedVerses} language={gameState.language} />}
        {gameState.view === AppView.ARCHIVE && <PilgrimsArchiveView onBack={() => handleNav(AppView.LANDING)} />}
        {gameState.view === AppView.MARKETPLACE && <MarketplaceView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} spendPoints={spendPoints} onAddPoints={(amt) => { refreshWealth(gameState.user!.id); }} />}
        {gameState.view === AppView.BROWSER && <BrowserView onBack={() => handleNav(AppView.LANDING)} onNavigate={handleNav} onAddPoints={addPoints} />}
        {gameState.view === AppView.STAKING && <StakingView user={{...gameState.user!, totalPoints: gameState.totalPoints}} onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} />}
      </main>

      {!isImmersiveView && gameState.user && (
          <div className="fixed bottom-0 left-0 w-full h-16 bg-black/90 backdrop-blur-xl border-t border-white/10 flex justify-around items-center z-50 md:hidden">
              <button onClick={() => handleNav(AppView.LANDING)} className={`flex flex-col items-center gap-1 p-2 ${gameState.view === AppView.LANDING ? 'text-yellow-500' : 'text-gray-500 hover:text-white'}`}>
                  <span className="text-xl">🏠</span>
                  <span className="text-[9px] font-retro uppercase">Home</span>
              </button>
              <button onClick={() => handleNav(AppView.TV)} className={`flex flex-col items-center gap-1 p-2 ${gameState.view === AppView.TV ? 'text-red-500' : 'text-gray-500 hover:text-white'}`}>
                  <span className="text-xl">📺</span>
                  <span className="text-[9px] font-retro uppercase">TV</span>
              </button>
              <button onClick={() => handleNav(AppView.GAME_LIBRARY)} className={`flex flex-col items-center gap-1 p-2 -mt-6 bg-yellow-600 rounded-full w-14 h-14 border-4 border-black shadow-lg ${[AppView.GAME, AppView.MAP].includes(gameState.view) ? 'text-white' : 'text-black'}`}>
                  <span className="text-2xl mt-1">⚔️</span>
              </button>
              <button onClick={() => handleNav(AppView.COMMUNITY)} className={`flex flex-col items-center gap-1 p-2 ${gameState.view === AppView.COMMUNITY ? 'text-orange-500' : 'text-gray-500 hover:text-white'}`}>
                  <span className="text-xl">🔥</span>
                  <span className="text-[9px] font-retro uppercase">Guilds</span>
              </button>
              <button onClick={() => handleNav(AppView.PROFILE)} className={`flex flex-col items-center gap-1 p-2 ${gameState.view === AppView.PROFILE ? 'text-blue-500' : 'text-gray-500 hover:text-white'}`}>
                  <span className="text-xl">👤</span>
                  <span className="text-[9px] font-retro uppercase">Me</span>
              </button>
          </div>
      )}

      {gameState.user && !isImmersiveView && (
        <GlobalChat 
            user={gameState.user} 
            onAddPoints={addPoints} 
            onUnlockAchievement={unlockAchievement}
        />
      )}

      {showLevelUp && (
        <LevelUpModal 
          level={currentLevelInfo.level} 
          title={currentLevelInfo.title} 
          onClose={() => setShowLevelUp(false)} 
        />
      )}

      <AchievementPopup 
        achievement={recentAchievement} 
        onClose={() => setRecentAchievement(null)} 
      />

      {showDailyReward && (
        <DailyRewardModal onClaim={handleClaimDaily} />
      )}

      {showGuestConversion && (
        <GuestConversionModal 
          onConvert={handleConvertGuest} 
          onCancel={() => setShowGuestConversion(false)} 
        />
      )}
    </div>
  );
}
