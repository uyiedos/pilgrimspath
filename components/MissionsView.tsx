
import React, { useEffect, useState } from 'react';
import Button from './Button';
import { User, Mission, AppView } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { PLAYER_LEVELS } from '../constants';

interface MissionsViewProps {
  user: User | null;
  collectedVerses: string[];
  onBack: () => void;
  onNavigate: (view: AppView) => void;
  onAddPoints: (amount: number) => void;
}

const MissionsView: React.FC<MissionsViewProps> = ({ user, collectedVerses, onBack, onNavigate, onAddPoints }) => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [claimedMap, setClaimedMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Daily' | 'Weekly' | 'Career'>('Daily');

  useEffect(() => {
    if (user) {
        fetchData();
    }
  }, [user, collectedVerses]);

  const fetchData = async () => {
    setLoading(true);
    if (!user) return;

    try {
        // 1. Fetch Active Missions
        const { data: missionsData } = await supabase.from('missions').select('*');
        if (missionsData) setMissions(missionsData);

        // 2. Fetch User Claims (To see what is already done)
        const { data: claims } = await supabase.from('user_mission_claims').select('*').eq('user_id', user.id);
        const claimedObj: Record<string, boolean> = {};
        
        claims?.forEach((c: any) => {
            const mission = missionsData?.find((m: any) => m.id === c.mission_id);
            if (mission) {
                const resetKey = getResetKey(mission.type);
                // For Career, any claim is permanent. For Daily/Weekly, match key.
                if (mission.type === 'Career' || c.reset_key === resetKey) {
                    claimedObj[c.mission_id] = true;
                }
            }
        });
        setClaimedMap(claimedObj);

        // 3. Calculate Progress
        await calculateProgress(missionsData || [], claimedObj);

    } catch (e) {
        console.error("Missions Error", e);
    } finally {
        setLoading(false);
    }
  };

  const calculateProgress = async (missionList: Mission[], claimedObj: Record<string, boolean>) => {
      if (!user) return;
      const newProgress: Record<string, number> = {};
      const weeklyStart = getStartDate('Weekly');
      const dailyStart = getStartDate('Daily');

      // Batch fetch Activity Feed for generic actions
      const { data: activity } = await supabase.from('activity_feed')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weeklyStart.toISOString()); // Get at least a week of history

      // Helper to count activities
      const countActivity = (type: string, keyOrIcon: string, since: Date) => {
          return activity?.filter((a: any) => {
              const isTime = new Date(a.created_at) >= since;
              if (!isTime) return false;
              // Check type or icon in details
              if (a.activity_type === type) return true;
              if (a.details?.icon === keyOrIcon) return true;
              return false;
          }).length || 0;
      };

      for (const m of missionList) {
          if (claimedObj[m.id]) {
              newProgress[m.id] = m.target_count;
              continue;
          }

          let currentCount = 0;
          const since = m.type === 'Daily' ? dailyStart : (m.type === 'Weekly' ? weeklyStart : new Date(0));

          // --- LOGIC MAP ---
          switch (m.action_key) {
              // Activity Feed Based
              case 'chat':
                  currentCount = countActivity('chat', 'chat', since); 
                  // Fallback: check chat_messages table if feed is empty?
                  // For speed, let's assume activity_feed logs chat (if setup) or query specific table
                  if (currentCount === 0) {
                      const { count } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since.toISOString());
                      currentCount = count || 0;
                  }
                  break;
              case 'chat_10':
                  const { count: c10 } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since.toISOString());
                  currentCount = c10 || 0;
                  break;
              case 'forge':
                  currentCount = countActivity('achievement', '⚒️', since); 
                  // Also check 'forged' type if logged differently
                  break;
              case 'forge_5':
                  // Career: Check avatar_history count
                  const { count: fCount } = await supabase.from('avatar_history').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
                  currentCount = fCount || 0;
                  break;
              case 'tithe':
                  currentCount = countActivity('achievement', '🪙', since); 
                  break;
              case 'share':
                  currentCount = countActivity('share', 'share', since);
                  break;
              case 'market_buy':
                  currentCount = countActivity('achievement', '🛒', since);
                  break;
              case 'enter_raffle':
                  // Check both tables
                  const { count: rCount } = await supabase.from('raffle_participants').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since.toISOString());
                  const { count: gCount } = await supabase.from('giveaway_participants').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since.toISOString());
                  currentCount = (rCount || 0) + (gCount || 0);
                  break;
              
              // Specific Tables
              case 'read_devotional':
                  const { count: devCount } = await supabase.from('user_devotional_completions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('completed_at', since.toISOString());
                  currentCount = devCount || 0;
                  break;
              
              // Profile Stats (Career)
              case 'level_2':
                  currentCount = getCurrentLevel() >= 2 ? 1 : 0;
                  break;
              case 'level_5':
                  currentCount = getCurrentLevel() >= 5 ? 1 : 0;
                  break;
              case 'level_10':
                  currentCount = getCurrentLevel() >= 10 ? 1 : 0;
                  break;
              case 'verses_10':
                  currentCount = collectedVerses.length || 0;
                  break;
              case 'verses_50':
                  currentCount = collectedVerses.length || 0;
                  break;
              case 'referral_3':
                  currentCount = user.referralsCount || 0;
                  break;
              case 'join_community':
                  const { count: commCount } = await supabase.from('community_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
                  currentCount = commCount || 0;
                  break;
              case 'check_profile':
                  // Just give it if they are looking at missions, assuming they checked profile today or make it a button click
                  currentCount = 0; // Requires manual action usually, but for now specific tracking
                  break;
              case 'browser_search':
                  // Rely on activity feed logging 'browser_search'
                  currentCount = countActivity('browser', '🔍', since);
                  break;
              case 'win_giveaway':
                  // Check notifications or feed for 'win'
                  currentCount = countActivity('achievement', '👑', since);
                  break;
              default:
                  currentCount = 0;
          }

          newProgress[m.id] = currentCount;
      }

      setProgressMap(newProgress);
  };

  const getCurrentLevel = () => {
      const xp = user?.totalPoints || 0;
      const levelObj = PLAYER_LEVELS.filter(l => l.xp <= xp).pop();
      return levelObj ? levelObj.level : 1;
  };

  const getStartDate = (type: string) => {
      const now = new Date();
      if (type === 'Daily') {
          now.setHours(0,0,0,0);
          return now;
      }
      if (type === 'Weekly') {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
          now.setDate(diff);
          now.setHours(0,0,0,0);
          return now;
      }
      return new Date(0); 
  };

  const getResetKey = (type: string) => {
      const now = new Date();
      if (type === 'Daily') return now.toISOString().split('T')[0];
      if (type === 'Weekly') {
          const startDate = getStartDate('Weekly');
          return `W-${startDate.getFullYear()}-${Math.floor(startDate.getDate() / 7)}`;
      }
      return 'CAREER';
  };

  const handleClaim = async (mission: Mission) => {
      if (!user) return;
      const progress = progressMap[mission.id] || 0;
      if (progress < mission.target_count) return alert("Mission Requirements not met.");
      if (claimedMap[mission.id]) return;

      const resetKey = getResetKey(mission.type);

      // Optimistic UI
      setClaimedMap(prev => ({...prev, [mission.id]: true}));
      onAddPoints(mission.reward_xp);
      AudioSystem.playAchievement();

      // DB Insert
      await supabase.from('user_mission_claims').insert({
          user_id: user.id,
          mission_id: mission.id,
          reset_key: resetKey
      });
  };

  const handleGoTo = (actionKey: string) => {
      onBack(); // Close first
      setTimeout(() => {
        switch(actionKey) {
            case 'chat': case 'chat_10': onNavigate(AppView.TV); break;
            case 'read_devotional': onNavigate(AppView.DEVOTIONAL); break;
            case 'forge': case 'forge_5': onNavigate(AppView.FORGE); break;
            case 'tithe': case 'join_community': onNavigate(AppView.COMMUNITY); break;
            case 'market_buy': onNavigate(AppView.MARKETPLACE); break;
            case 'enter_raffle': case 'win_giveaway': onNavigate(AppView.GIVEAWAYS); break;
            case 'browser_search': onNavigate(AppView.BROWSER); break;
            case 'check_profile': case 'referral_3': onNavigate(AppView.PROFILE); break;
            case 'level_2': case 'level_5': case 'level_10': case 'verses_10': case 'verses_50': onNavigate(AppView.MAP); break;
            case 'visit_prayer': onNavigate(AppView.PRAYER_ROOM); break;
            default: onNavigate(AppView.LANDING);
        }
      }, 100);
  };

  const filteredMissions = missions.filter(m => m.type === activeTab);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-fade-in backdrop-blur-md overflow-hidden">
        {/* Background FX */}
        <div className="absolute inset-0 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20map%20quest%20parchment%20fantasy%20ui?width=1200&height=800&nologo=true')] bg-cover bg-center opacity-20"></div>
        
        <div className="w-full max-w-4xl bg-gray-900 border-4 border-yellow-600 rounded-[2rem] shadow-[0_0_60px_rgba(202,138,4,0.3)] relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 md:p-8 border-b-4 border-yellow-700 bg-gray-800/90 rounded-t-[1.8rem] flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="text-5xl animate-bounce">📜</div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-retro text-yellow-500 uppercase tracking-tighter drop-shadow-md">Quest Log</h2>
                        <p className="text-gray-400 font-serif italic text-sm">"Faith without works is dead."</p>
                    </div>
                </div>
                <button onClick={onBack} className="text-gray-400 hover:text-white text-3xl">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex bg-black/50 p-2 gap-2 overflow-x-auto no-scrollbar">
                {['Daily', 'Weekly', 'Career'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-3 px-6 rounded-xl font-retro text-xs uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-yellow-600 text-black shadow-lg scale-[1.02]' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                    >
                        {tab} Missions
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scroll bg-black/40">
                {loading ? (
                    <div className="text-center py-20 text-yellow-500 font-retro animate-pulse">Consulting the Scribes...</div>
                ) : filteredMissions.length === 0 ? (
                    <div className="text-center py-20 text-gray-600 font-serif italic">No active quests in this category.</div>
                ) : (
                    filteredMissions.map(mission => {
                        const progress = progressMap[mission.id] || 0;
                        const isComplete = progress >= mission.target_count;
                        const isClaimed = claimedMap[mission.id];
                        const percentage = Math.min(100, (progress / mission.target_count) * 100);

                        return (
                            <div key={mission.id} className={`relative p-4 md:p-6 rounded-2xl border-2 transition-all group overflow-hidden ${isClaimed ? 'bg-gray-900/50 border-gray-700 opacity-60' : isComplete ? 'bg-green-900/20 border-green-500 shadow-lg' : 'bg-gray-800/80 border-gray-600'}`}>
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center text-3xl border-2 shadow-inner ${isComplete ? 'bg-green-800/50 border-green-600' : 'bg-black/40 border-gray-600'}`}>
                                            {mission.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`font-retro text-sm md:text-lg uppercase ${isComplete ? 'text-green-400' : 'text-white'}`}>{mission.title}</h3>
                                            <p className="text-gray-400 text-xs font-serif italic">{mission.description}</p>
                                            
                                            {/* Progress Bar */}
                                            <div className="mt-3 w-full md:w-64 h-3 bg-black/60 rounded-full border border-gray-700 overflow-hidden relative">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${isComplete ? 'bg-green-500' : 'bg-yellow-600'}`}
                                                    style={{ width: `${percentage}%` }}
                                                ></div>
                                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-mono text-white font-bold drop-shadow-md">
                                                    {progress} / {mission.target_count}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                        <div className="bg-black/40 px-3 py-1 rounded-full border border-white/10 text-yellow-500 font-mono text-xs">
                                            +{mission.reward_xp} XP
                                        </div>
                                        {isClaimed ? (
                                            <button disabled className="px-6 py-2 bg-gray-800 text-gray-500 font-retro text-xs rounded-xl border border-gray-600 cursor-default">
                                                COMPLETED
                                            </button>
                                        ) : isComplete ? (
                                            <Button onClick={() => handleClaim(mission)} className="bg-green-600 hover:bg-green-500 border-green-400 animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.5)]">
                                                CLAIM REWARD
                                            </Button>
                                        ) : (
                                            <Button onClick={() => handleGoTo(mission.action_key)} variant="secondary" className="text-[10px] py-2 px-6">
                                                GO TO TASK
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    </div>
  );
};

export default MissionsView;
