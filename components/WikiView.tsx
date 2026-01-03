
import React, { useState, useEffect, useMemo } from 'react';
import Button from './Button';
import { AppView, User } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { BarChart, DonutChart, ChartDataPoint } from './Charts';
import { LanguageCode } from '../translations';
import TranslatedText from './TranslatedText';

export type WikiTab = 'guide' | 'word' | 'prayer' | 'stats' | 'community' | 'quests' | 'tv' | 'raffles' | 'giveaways' | 'donations';

interface WikiViewProps {
  onBack: () => void;
  onNavigate?: (view: AppView) => void;
  user: User | null;
  onUpdateUser?: (user: User) => void;
  onAddPoints?: (points: number) => void;
  initialTab?: WikiTab;
  language?: LanguageCode;
}

const WIKI_TABS: { id: WikiTab; labelKey: string; icon: string; description: string }[] = [
  { id: 'guide', labelKey: 'Start Here', icon: '🌟', description: 'Pilgrim\'s Handbook v10.0' },
  { id: 'word', labelKey: 'The Word', icon: '📖', description: 'Bible & Daily Bread' },
  { id: 'prayer', labelKey: 'Prayer Room', icon: '🕯️', description: 'Sanctuary & Intercession' },
  { id: 'stats', labelKey: 'Stats & Ranks', icon: '📊', description: 'Point Dashboard & Hall of Faith' },
  { id: 'community', labelKey: 'Fellowship', icon: '🔥', description: 'Guilds & Roles' },
  { id: 'quests', labelKey: 'Missions', icon: '📜', description: 'Daily, Weekly & Career Tasks' },
  { id: 'tv', labelKey: 'Media', icon: '📺', description: 'Broadcasts and Global Chat' },
  { id: 'raffles', labelKey: 'Raffles', icon: '🎟️', description: 'Official Prize Draws' },
  { id: 'giveaways', labelKey: 'Giveaways', icon: '🎁', description: 'Community Gifting Protocol' },
  { id: 'donations', labelKey: 'Donations', icon: '❤️', description: 'Stewardship & Rewards' }
];

const WikiView: React.FC<WikiViewProps> = ({ onBack, onNavigate, user, onUpdateUser, onAddPoints, initialTab = 'guide', language = 'en' }) => {
  const [activeTab, setActiveTab] = useState<WikiTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Analytics State
  const [registryStats, setRegistryStats] = useState({ 
      users: 0, xp: 0, active_today: 0, avg_xp: 0,
      growth: [] as ChartDataPoint[],
      xp_dist: [] as ChartDataPoint[],
      activity_vol: [] as ChartDataPoint[]
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (activeTab === 'stats') {
        loadAnalytics();
    }
  }, [activeTab]);

  const loadAnalytics = async () => {
      setLoadingStats(true);
      try {
          const { data, error } = await supabase.rpc('get_registry_analytics');
          if (data && !error) {
              setRegistryStats({ 
                  users: data.total_users || 0, 
                  xp: data.total_xp || 0, 
                  active_today: data.active_today || 0,
                  avg_xp: data.avg_xp || 0,
                  growth: (data.growth || []).map((d: any) => ({ label: d.label, value: d.value || 0 })),
                  xp_dist: (data.xp_dist || []).map((d: any, i: number) => ({ 
                      label: d.label, value: d.value || 0, 
                      color: ['#eab308', '#3b82f6', '#a855f7', '#22c55e', '#ef4444'][i % 5] 
                  })),
                  activity_vol: (data.activity_vol || []).map((d: any, i: number) => ({ 
                      label: d.label, value: d.value || 0, 
                      color: ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'][i % 5] 
                  }))
              });
          }
      } catch (e) { console.error(e); } finally { setLoadingStats(false); }
  };

  const filteredTabs = useMemo(() => {
    return WIKI_TABS; 
  }, [searchQuery]);

  const handleTabChange = (tabId: WikiTab) => {
    setActiveTab(tabId);
    AudioSystem.playVoxelTap();
    document.getElementById('wiki-content-panel')?.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 flex flex-col items-center animate-fade-in custom-scroll">
      <div className="max-w-7xl w-full mb-8 bg-gray-900 border-b-4 border-yellow-600 rounded-2xl p-6 flex flex-col md:flex-row gap-6 justify-between items-center shadow-2xl relative z-50">
         <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-yellow-500 rounded-xl flex items-center justify-center text-3xl border-4 border-white animate-float">📘</div>
            <div>
               <h1 className="text-3xl md:text-5xl font-retro text-white leading-none tracking-tighter uppercase">Digital Codex</h1>
               <p className="text-gray-500 text-[10px] font-mono mt-2 uppercase tracking-[0.4em]">Spirit_Network_v10.0</p>
            </div>
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search topics..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 md:w-64 bg-black border-2 border-gray-800 rounded-xl p-3 text-white text-sm font-mono focus:border-yellow-500 outline-none"
            />
            <Button onClick={onBack} variant="secondary" className="px-4 py-3">✖</Button>
         </div>
      </div>

      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-4 gap-8 min-h-[70vh]">
        <div className="col-span-1 bg-gray-900/40 p-4 rounded-2xl border-2 border-white/5 h-fit sticky top-24 backdrop-blur-md">
           <nav className="space-y-1.5 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
             {filteredTabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => handleTabChange(tab.id)}
                 className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-yellow-600 text-white shadow-lg translate-x-2' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}
               >
                 <span className="text-xl">{tab.icon}</span>
                 <div>
                    <span className="font-retro text-[9px] uppercase tracking-wider block">{tab.labelKey}</span>
                    <span className="text-[7px] font-serif italic opacity-60 block line-clamp-1">{tab.description}</span>
                 </div>
               </button>
             ))}
           </nav>
        </div>

        <div id="wiki-content-panel" className="md:col-span-3 bg-gray-900/60 border-2 border-white/5 rounded-[3rem] p-6 md:p-12 shadow-2xl relative overflow-y-auto custom-scroll backdrop-blur-lg h-[80vh]">
           
           {activeTab === 'guide' && (
             <div className="space-y-8 animate-slide-up">
                <h2 className="text-5xl font-retro text-white mb-4">
                    <TranslatedText text="The Pilgrim's Path" language={language} />
                </h2>
                <p className="text-xl font-serif text-gray-300 italic">"The Journey is a gamified spiritual ecosystem. Your actions here build a digital legacy."</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-black/30 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-yellow-500 font-retro text-xs uppercase mb-2">Core Gameplay</h3>
                        <ul className="text-sm text-gray-400 space-y-2 list-disc pl-4">
                            <li><strong>Campaigns:</strong> Navigate biblical stories (Peter, Elijah, Paul) to earn XP.</li>
                            <li><strong>Disciplines:</strong> Practice Lectio Divina, Verse Mapping, and Prayer Walks.</li>
                            <li><strong>Fellowship:</strong> Join communities to unlock team achievements.</li>
                        </ul>
                    </div>
                    <div className="bg-black/30 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-blue-500 font-retro text-xs uppercase mb-2">Divine Economy</h3>
                        <ul className="text-sm text-gray-400 space-y-2 list-disc pl-4">
                            <li><strong>Spirit XP:</strong> The central currency earned through faithfulness.</li>
                            <li><strong>The Forge:</strong> Create unique artifacts using AI.</li>
                            <li><strong>Marketplace:</strong> Trade artifacts with other pilgrims.</li>
                        </ul>
                    </div>
                </div>
             </div>
           )}

           {activeTab === 'stats' && (
              <div className="space-y-8 animate-slide-up">
                 <h2 className="text-4xl font-retro text-blue-500">Stats & Rankings</h2>
                 <p className="text-gray-300 font-serif text-sm">Real-time statistics from the Book of Life.</p>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-blue-900/10 p-6 rounded-2xl border border-blue-500/30 flex flex-col justify-between">
                        <div>
                            <h3 className="text-blue-300 font-retro text-sm uppercase mb-2">Point Dashboard</h3>
                            <p className="text-xs text-gray-400 mb-4">
                                Monitor the global flow of Spirit XP and ecosystem growth.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-black/40 p-4 rounded-xl"><div className="text-xl font-bold text-white">{(registryStats.users || 0).toLocaleString()}</div><div className="text-[8px] uppercase text-gray-500">Pilgrims</div></div>
                            <div className="bg-black/40 p-4 rounded-xl"><div className="text-xl font-bold text-green-400">{(registryStats.xp/1000).toFixed(1)}k</div><div className="text-[8px] uppercase text-gray-500">Total XP</div></div>
                            <div className="bg-black/40 p-4 rounded-xl"><div className="text-xl font-bold text-blue-400">{(registryStats.active_today || 0).toLocaleString()}</div><div className="text-[8px] uppercase text-gray-500">Active</div></div>
                            <div className="bg-black/40 p-4 rounded-xl"><div className="text-xl font-bold text-purple-400">{(registryStats.avg_xp || 0).toLocaleString()}</div><div className="text-[8px] uppercase text-gray-500">Avg XP</div></div>
                        </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <h4 className="text-[10px] uppercase text-gray-500 mb-4">Activity Volume</h4>
                        <BarChart data={registryStats.activity_vol} />
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                        <h4 className="text-[10px] uppercase text-gray-500 mb-4">XP Distribution</h4>
                        <DonutChart data={registryStats.xp_dist} />
                    </div>
                 </div>
              </div>
           )}

           {activeTab === 'raffles' && (
               <div className="space-y-8 animate-slide-up">
                   <h2 className="text-4xl font-retro text-pink-400">Official Raffles</h2>
                   <p className="text-gray-300 font-serif text-lg leading-relaxed">
                       The Sanctuary hosts official prize draws where pilgrims can exchange Spirit XP for a chance to win exclusive rewards, including rare Artifacts, massive XP bundles, or real-world ministry gifts.
                   </p>

                   <div className="bg-pink-900/20 p-6 rounded-2xl border border-pink-500/30">
                       <h3 className="text-pink-300 font-retro text-sm uppercase mb-4">Mechanics</h3>
                       <ul className="space-y-3 text-sm text-gray-300">
                           <li className="flex items-start gap-2">
                               <span className="text-pink-500">🎟️</span>
                               <span><strong>Entry Fee:</strong> Each ticket costs a specific amount of Spirit XP (e.g., 50 XP).</span>
                           </li>
                           <li className="flex items-start gap-2">
                               <span className="text-pink-500">⚖️</span>
                               <span><strong>Weighted Luck:</strong> Your chance of winning improves based on your activity consistency and account level. Faithful pilgrims are favored.</span>
                           </li>
                           <li className="flex items-start gap-2">
                               <span className="text-pink-500">🔗</span>
                               <span><strong>External Actions:</strong> Some raffles require visiting a sponsor or ministry page to unlock entry.</span>
                           </li>
                       </ul>
                   </div>

                   {onNavigate && (
                       <Button onClick={() => onNavigate(AppView.RAFFLES)} className="bg-pink-600 hover:bg-pink-500 border-pink-400">
                           VIEW ACTIVE RAFFLES
                       </Button>
                   )}
               </div>
           )}

           {activeTab === 'giveaways' && (
               <div className="space-y-8 animate-slide-up">
                   <h2 className="text-4xl font-retro text-purple-400">Community Giveaways</h2>
                   <p className="text-gray-300 font-serif text-lg leading-relaxed">
                       A peer-to-peer gifting protocol. Any pilgrim who has attained the rank of <strong>Believer (Level 5)</strong> can host a giveaway to bless the community.
                   </p>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="bg-purple-900/20 p-6 rounded-2xl border border-purple-500/30">
                           <h3 className="text-purple-300 font-retro text-sm uppercase mb-2">For Hosts</h3>
                           <ul className="text-sm text-gray-400 space-y-2 list-disc pl-4">
                               <li><strong>Requirement:</strong> Level 5 (5,000 XP).</li>
                               <li><strong>Creation Fee:</strong> 500 XP (Burned).</li>
                               <li><strong>Revenue:</strong> You receive 70% of all ticket sales. The remaining 30% goes to the Global Treasury.</li>
                               <li><strong>Prize Types:</strong> XP, Artifacts (NFTs), or External Codes.</li>
                           </ul>
                       </div>
                       <div className="bg-purple-900/20 p-6 rounded-2xl border border-purple-500/30">
                           <h3 className="text-purple-300 font-retro text-sm uppercase mb-2">For Entrants</h3>
                           <ul className="text-sm text-gray-400 space-y-2 list-disc pl-4">
                               <li><strong>Ticket Cost:</strong> Set by the host (Min 10 XP).</li>
                               <li><strong>Winner Selection:</strong> Provably fair random draw handled by the system.</li>
                               <li><strong>Vesting:</strong> Some prizes may be locked for a duration (Vested Giveaways).</li>
                           </ul>
                       </div>
                   </div>

                   {onNavigate && (
                       <Button onClick={() => onNavigate(AppView.GIVEAWAYS)} className="bg-purple-600 hover:bg-purple-500 border-purple-400">
                           BROWSE GIVEAWAYS
                       </Button>
                   )}
               </div>
           )}

           {activeTab === 'donations' && (
               <div className="space-y-8 animate-slide-up">
                   <h2 className="text-4xl font-retro text-red-400">Kingdom Stewardship</h2>
                   <p className="text-gray-300 font-serif text-lg leading-relaxed">
                       Sowing into "The Journey" supports server costs, AI generation fees, and our global ministry partners. We believe in rewarding generosity.
                   </p>

                   <div className="bg-red-900/20 p-6 rounded-2xl border border-red-500/30">
                       <h3 className="text-red-300 font-retro text-sm uppercase mb-4">The Altar Protocol</h3>
                       <div className="space-y-4">
                           <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/5">
                               <div className="text-3xl">🪙</div>
                               <div>
                                   <h4 className="text-white font-bold text-sm">Currency Support</h4>
                                   <p className="text-gray-400 text-xs">We accept Crypto (SOL, BTC, ETH) and Manual Fiat transfers via partners.</p>
                               </div>
                           </div>
                           <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/5">
                               <div className="text-3xl">✨</div>
                               <div>
                                   <h4 className="text-white font-bold text-sm">Divine Reward</h4>
                                   <p className="text-gray-400 text-xs">Every $1 donated grants approx <strong>2,000 Spirit XP</strong> upon verification.</p>
                               </div>
                           </div>
                           <div className="flex items-center gap-4 bg-black/40 p-4 rounded-xl border border-white/5">
                               <div className="text-3xl">🎖️</div>
                               <div>
                                   <h4 className="text-white font-bold text-sm">Generous Soul Badge</h4>
                                   <p className="text-gray-400 text-xs">Unlocked permanently after your first confirmed donation.</p>
                               </div>
                           </div>
                       </div>
                   </div>

                   {onNavigate && (
                       <Button onClick={() => onNavigate(AppView.DONATE)} className="bg-red-600 hover:bg-red-500 border-red-400">
                           SOW A SEED
                       </Button>
                   )}
               </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default WikiView;
