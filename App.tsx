import React, { useState, useEffect } from 'react';
import { 
  AppView, User, GameState, BiblePlan, 
  Achievement, SupportTicket
} from './types';
import { 
  GAMES, ACHIEVEMENTS, PLAYER_LEVELS, DEFAULT_PLANS
} from './constants';
import { LanguageCode, UI_TEXT } from './translations';
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
import ProfileView from './components/ProfileView';
import SupportView from './components/SupportView';
import AdminView from './components/AdminView';
import BibleActivitiesView from './components/BibleActivitiesView';
import MissionsView from './components/MissionsView';
import DonationView from './components/DonationView';
import PrayerRoomView from './components/PrayerRoomView';
import GiveawaysView from './components/GiveawaysView';
import RafflesView from './components/RafflesView';
import BrowserView from './components/BrowserView';
import CommunityView from './components/CommunityView';
import AchievementPopup from './components/AchievementPopup';
import LevelUpModal from './components/LevelUpModal';
import DailyRewardModal from './components/DailyRewardModal';
import GlobalChat from './components/GlobalChat';
import GuestConversionModal from './components/GuestConversionModal';
import TreasuryView from './components/TreasuryView';

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

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[gameState.language][key] || UI_TEXT['en'][key];
  };

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

    if (planId) setNavParams({ initialPlanId: planId });
    else if (communityId) setNavParams({ initialCommunityId: communityId });
  }, []);

  // Handle deep link navigation after login
  useEffect(() => {
      if (gameState.user && navParams && gameState.view === AppView.LANDING) {
          if (navParams.initialPlanId) setGameState(prev => ({ ...prev, view: AppView.PLANS }));
          else if (navParams.initialCommunityId) setGameState(prev => ({ ...prev, view: AppView.COMMUNITY }));
      }
  }, [gameState.user, navParams, gameState.view]);

  // Sync Wealth Breakdown
  const refreshWealth = async (userId: string) => {
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
                    totalPoints: data.liquid_xp // GameState totalPoints usually tracks liquid for spending
                };
            });
        }
      } catch (e) {
        console.warn("XP refresh failed", e);
      }
  };

  // Fetch User Data (Verses, Journal, Achievements, Progress, Plans)
  const loadUserData = async (userId: string) => {
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
                          loadedProgress[gameKey] = Math.max(loadedProgress[gameKey], p.level_id);
                      }
                  }
              });
          }

          // 2. Verses
          const verses = versesRes.data?.map((v: any) => v.verse_text) || [];

          // 3. Journal
          const journal = journalRes.data || [];

          // 4. Achievements
          const achievements = achievRes.data?.map((a: any) => a.achievement_id) || [];

          // 5. Plans
          const plans = plansRes.data || [];

          setGameState(prev => ({
              ...prev,
              progress: loadedProgress,
              collectedVerses: verses,
              journalEntries: journal,
              unlockedAchievements: achievements,
              plans: plans.length ? plans : prev.plans // Keep defaults if none saved
          }));
      } catch (e) {
          console.error("Failed to load user data:", e);
      }
  };

  const onLogin = async (user: User, language: LanguageCode = 'en') => {
    setGameState(prev => ({
      ...prev,
      user,
      language,
      totalPoints: user.totalPoints || 0,
      view: AppView.LANDING
    }));
    
    refreshWealth(user.id);
    loadUserData(user.id); // Load the stats for profile

    // Run Badge & Streak Logic in background
    supabase.rpc('process_daily_login', { p_user_id: user.id }).then(() => {
            // After processing daily login, sync badges based on updated stats
            supabase.rpc('sync_user_badges', { p_user_id: user.id });
        });

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
      
      await supabase.from('users').update({ 
          last_daily_claim: Date.now(), 
          total_points: (gameState.user.totalPoints || 0) + reward 
      }).eq('id', gameState.user.id);
      
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
    const newPoints = gameState.totalPoints + amount;
    setGameState(prev => ({ ...prev, totalPoints: newPoints }));
    
    // XP notification
    const notifId = Date.now();
    setXpNotifs(prev => [...prev, { id: notifId, amount, label }]);
    setTimeout(() => setXpNotifs(prev => prev.filter(n => n.id !== notifId)), 3000);

    // Level check
    const currentLevelObj = PLAYER_LEVELS.filter(l => l.xp <= gameState.totalPoints).pop();
    const newLevelObj = PLAYER_LEVELS.filter(l => l.xp <= newPoints).pop();

    if (currentLevelObj && newLevelObj && newLevelObj.level > currentLevelObj.level) {
        setShowLevelUp({ level: newLevelObj.level, title: newLevelObj.title });
        AudioSystem.playLevelComplete();
    }

    setGameState(prev => ({ 
        ...prev, 
        totalPoints: newPoints, 
        user: prev.user ? { ...prev.user, totalPoints: newPoints } : null 
    }));
    
    if (gameState.user) {
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
      
      if (gameState.user) {
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

  const unlockAchievement = async (id: string) => {
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
      
      if (gameState.user) {
          supabase.from('unlocked_achievements').insert({ user_id: gameState.user.id, achievement_id: id }).then();
      }
    }
  };

  const awardBadge = async (badgeId: string) => {
      if (!gameState.user || gameState.user.badges.includes(badgeId)) return;
      const newBadges = [...gameState.user.badges, badgeId];
      setGameState(prev => ({ ...prev, user: prev.user ? { ...prev.user, badges: newBadges } : null }));
      AudioSystem.playAchievement();
      if (gameState.user) {
          await supabase.from('users').update({ badges: newBadges }).eq('id', gameState.user.id);
      }
  };

  const handleConvertGuest = async (email: string, password: string, username: string) => {
      const { data, error } = await (supabase.auth as any).signUp({ email, password });
      if (error) throw error;
      if (data.user) {
          await supabase.from('users').insert({
              id: data.user.id,
              email,
              username,
              created_at: new Date().toISOString(),
              total_points: gameState.totalPoints,
              badges: gameState.user?.badges || []
          });
          // Migrate offline data to real user
          // (implementation depends on your offline data structure)
          setShowGuestConversion(false);
      }
  };

  const handleGameLevelComplete = async (nextLevel: number, verse: string) => {
            const gameKey = gameState.activeGameId as keyof typeof gameState.progress;
            const currentLevel = gameState.progress[gameKey];
            const newProgress = { ...gameState.progress, [gameKey]: Math.max(currentLevel, nextLevel) };
            
            let newVerses = gameState.collectedVerses;
            if (!newVerses.includes(verse)) {
                newVerses = [...newVerses, verse];
            }
            
            setGameState(prev => ({ ...prev, progress: newProgress, collectedVerses: newVerses }));
            addPoints(200, "Level Cleared");
            unlockAchievement('first_step'); 
            
            // DB PERSISTENCE
            if (gameState.user) {
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
            handleNav(AppView.MAP, false); 
        };

  const currentGameConfig = GAMES.find(g => g.id === gameState.activeGameId);
  const currentUnlockedLevel = gameState.progress[gameState.activeGameId] || 1;
  const activeLevel = activeLevelId && currentGameConfig
    ? currentGameConfig.levels.find(l => l.id === activeLevelId)
    : null;

  return (
    <div className="min-h-screen bg-black text-white font-retro">
      {/* XP Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
          {xpNotifs.map(n => (
              <div key={n.id} className="bg-yellow-900 border border-yellow-600 px-3 py-2 rounded animate-pulse text-yellow-300 text-xs font-bold">
                  +{n.amount} XP {n.label && `· ${n.label}`}
              </div>
          ))}
      </div>

      {/* Modals */}
      {showAchievement && <AchievementPopup achievement={showAchievement} onClose={() => setShowAchievement(null)} />}
      {showLevelUp && <LevelUpModal level={showLevelUp.level} title={showLevelUp.title} onClose={() => setShowLevelUp(null)} />}
      {showDailyReward && <DailyRewardModal onClaim={handleClaimDaily} />}
      {showGuestConversion && <GuestConversionModal onConvert={handleConvertGuest} onCancel={() => setShowGuestConversion(false)} />}

      {/* Views */}
      {gameState.view === AppView.AUTH && <AuthView onLogin={onLogin} />}
      
      {gameState.view === AppView.LANDING && <LandingView 
        user={gameState.user!} 
        onNavigate={handleNav}
        language={gameState.language}
      />}
      
      {gameState.view === AppView.GAME_LIBRARY && <GameLibraryView onBack={() => handleNav(AppView.LANDING)} onSelectGame={(gameId) => { setGameState(prev => ({ ...prev, activeGameId: gameId })); handleNav(AppView.MAP); }} language={gameState.language} />}
      
      {gameState.view === AppView.MAP && currentGameConfig && <LevelMap 
        gameConfig={currentGameConfig}
        unlockedLevelId={currentUnlockedLevel}
        onSelectLevel={(levelId: number) => setActiveLevelId(levelId)}
        onLibrary={() => handleNav(AppView.GAME_LIBRARY)}
        onHome={() => handleNav(AppView.LANDING)}
        language={gameState.language}
      />}
      
      {activeLevel && <GameView 
        level={activeLevel}
        onBack={() => setActiveLevelId(null)}
        onHome={() => { setActiveLevelId(null); handleNav(AppView.LANDING); }}
        onComplete={(verse) => {
          const nextLevel = (activeLevel.id || 1) + 1;
          handleGameLevelComplete(nextLevel, verse);
        }}
        onNavigate={handleNav}
        language={gameState.language}
        difficulty={gameState.user?.difficulty || 'normal'}
      />}
        
      {gameState.view === AppView.JOURNAL && <JournalView state={gameState} onBack={() => handleNav(AppView.LANDING)} onSaveNote={(content) => {
          const newEntry = { id: Date.now().toString(), type: 'note', content, createdAt: new Date().toISOString() };
          setGameState(prev => ({...prev, journalEntries: [newEntry as any, ...prev.journalEntries]}));
          if (gameState.user) {
              supabase.from('journal_entries').insert({ user_id: gameState.user.id, type: 'note', content }).then();
          }
      }} />}
        
      {gameState.view === AppView.DEVOTIONAL && <DevotionalView onBack={() => handleNav(AppView.LANDING)} onAddPoints={addPoints} onUnlockAchievement={unlockAchievement} userId={gameState.user?.id} />}

      {gameState.view === AppView.PLANS && gameState.user && <PlansView
        user={gameState.user}
        onBack={() => handleNav(AppView.LANDING)}
        onAddPoints={(points) => { addPoints(points); }}
        language={gameState.language}
        plans={gameState.plans}
        onUpdatePlans={(plans) => setGameState(prev => ({ ...prev, plans }))}
        initialPlanId={navParams?.initialPlanId}
        spendPoints={spendPoints}
        onUnlockAchievement={unlockAchievement}
        onAwardBadge={awardBadge}
      />}

      {gameState.view === AppView.TV && <JourneyTVView
        user={gameState.user}
        onBack={() => handleNav(AppView.LANDING)}
        language={gameState.language}
        spendPoints={spendPoints}
        onUnlockAchievement={unlockAchievement}
      />}

      {gameState.view === AppView.BIBLE && <BibleReaderView
        onBack={() => handleNav(AppView.LANDING)}
        onAddPoints={(amount) => { addPoints(amount); }}
        onUnlockAchievement={unlockAchievement}
        onSaveToJournal={(type, content, reference) => {
          const newEntry = { id: Date.now().toString(), type, content, reference, createdAt: new Date().toISOString() };
          setGameState(prev => ({ ...prev, journalEntries: [newEntry as any, ...prev.journalEntries] }));
          if (gameState.user) {
            supabase.from('journal_entries').insert({ user_id: gameState.user.id, type, content, reference }).then();
          }
        }}
      />}

      {gameState.view === AppView.LEADERBOARD && <LeaderboardView
        currentUser={gameState.user}
        currentPoints={gameState.totalPoints}
        onBack={() => handleNav(AppView.LANDING)}
      />}

      {gameState.view === AppView.WIKI && <WikiView
        onBack={() => handleNav(AppView.LANDING)}
        onNavigate={handleNav}
        user={gameState.user}
        onAddPoints={(points) => { addPoints(points); }}
        language={gameState.language}
      />}

      {gameState.view === AppView.PROFILE && <ProfileView
        user={gameState.user}
        totalPoints={gameState.totalPoints}
        unlockedAchievements={gameState.unlockedAchievements}
        collectedVerses={gameState.collectedVerses}
        onBack={() => handleNav(AppView.LANDING)}
        onUpdateUser={(updatedUser) => setGameState(prev => ({ ...prev, user: updatedUser }))}
        language={gameState.language}
        onUnlockAchievement={unlockAchievement}
        onAwardBadge={awardBadge}
        onConvertGuest={() => setShowGuestConversion(true)}
        spendPoints={spendPoints}
        onAddPoints={(amount) => { addPoints(amount); }}
        onGoToAdmin={() => handleNav(AppView.ADMIN)}
        onNavigate={handleNav}
        journalEntriesCount={gameState.journalEntries.length}
      />}

      {gameState.view === AppView.SUPPORT && <SupportView
        user={gameState.user}
        tickets={gameState.supportTickets}
        onCreateTicket={(ticket) => setGameState(prev => ({ ...prev, supportTickets: [ticket, ...prev.supportTickets] }))}
        onBack={() => handleNav(AppView.LANDING)}
        language={gameState.language}
      />}

      {gameState.view === AppView.ADMIN && gameState.user && <AdminView
        currentUser={gameState.user}
        onBack={() => handleNav(AppView.LANDING)}
      />}

      {gameState.view === AppView.TREASURY && <TreasuryView
        onBack={() => handleNav(AppView.LANDING)}
        language={gameState.language}
      />}

      {gameState.view === AppView.ACTIVITIES && <BibleActivitiesView
        user={gameState.user}
        onBack={() => handleNav(AppView.LANDING)}
        onAddPoints={(points) => { addPoints(points); }}
        onUnlockAchievement={unlockAchievement}
        onAwardBadge={awardBadge}
      />}

      {gameState.view === AppView.MISSIONS && <MissionsView
        user={gameState.user}
        collectedVerses={gameState.collectedVerses}
        onBack={() => handleNav(AppView.LANDING)}
        onNavigate={handleNav}
        onAddPoints={(amount) => { addPoints(amount); }}
        language={gameState.language}
      />}

      {gameState.view === AppView.DONATE && <DonationView
        user={gameState.user}
        onBack={() => handleNav(AppView.LANDING)}
        onNavigate={handleNav}
        onUnlockAchievement={unlockAchievement}
      />}
        
      {gameState.view === AppView.GIVEAWAYS && <GiveawaysView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onAddPoints={(amount) => { addPoints(amount); }} />}
      
      {gameState.view === AppView.RAFFLES && <RafflesView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} onAddPoints={(amount) => { addPoints(amount); }} onUnlockAchievement={unlockAchievement} />}
      
      {gameState.view === AppView.BROWSER && <BrowserView onBack={() => handleNav(AppView.LANDING)} onNavigate={handleNav} onAddPoints={(amount) => { addPoints(amount); }} onUnlockAchievement={unlockAchievement} />}
      
      {gameState.view === AppView.COMMUNITY && <CommunityView user={gameState.user} onBack={() => handleNav(AppView.LANDING)} language={gameState.language} onAddPoints={(amount) => { addPoints(amount); }} onUnlockAchievement={unlockAchievement} onConvertGuest={() => setShowGuestConversion(true)} spendPoints={spendPoints} initialCommunityId={navParams?.initialCommunityId} />}

      {/* Global Chat (persistent overlay) */}
      {gameState.user && <GlobalChat user={gameState.user} onAddPoints={(amount) => { addPoints(amount); }} onUnlockAchievement={unlockAchievement} />}
    </div>
  );
};
