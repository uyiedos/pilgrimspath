
import React, { useState, useEffect, useMemo } from 'react';
import Button from './Button';
import { GAMES, BADGES, ARCHETYPES, PLAYER_LEVELS } from '../constants';
import { AppView, User } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { BarChart, LineChart, DonutChart, ChartDataPoint } from './Charts';

export type WikiTab = 'guide' | 'game' | 'economy' | 'token' | 'events' | 'community' | 'lore' | 'archetypes' | 'progression' | 'tv' | 'activities' | 'vault' | 'prayer' | 'market' | 'quests';

interface WikiViewProps {
  onBack: () => void;
  onNavigate?: (view: AppView) => void;
  user: User | null;
  onUpdateUser?: (user: User) => void;
  onAddPoints?: (points: number) => void;
  initialTab?: WikiTab;
}

const WIKI_TABS: { id: WikiTab; label: string; icon: string; description: string }[] = [
  { id: 'guide', label: 'Start Here', icon: '🌟', description: 'Beginner\'s guide to The Journey.' },
  { id: 'game', label: 'Pilgrim\'s Game', icon: '⚔️', description: 'Arcade campaigns and leveling.' },
  { id: 'quests', label: 'Quests & Points', icon: '📜', description: 'Missions, XP system, and rewards.' },
  { id: 'tv', label: 'Journey TV', icon: '📺', description: 'Broadcasting and community media.' },
  { id: 'community', label: 'Fellowship', icon: '🔥', description: 'Ministries, Guilds, and tithing.' },
  { id: 'activities', label: 'Daily Bread & Plans', icon: '🍞', description: 'Devotionals and Bible reading.' },
  { id: 'prayer', label: 'Prayer Room', icon: '✨', description: 'Real-time vocal guidance.' },
  { id: 'vault', label: 'Sacred Forge', icon: '⚒️', description: 'Creating artifacts with AI.' },
  { id: 'market', label: 'Marketplace', icon: '🛒', description: 'Buying and selling artifacts.' },
  { id: 'events', label: 'Raffles & Gifts', icon: '🎁', description: 'Giveaways and official events.' },
  { id: 'economy', label: 'Treasury', icon: '🏛️', description: 'Global economy statistics.' },
  { id: 'progression', label: 'Rankings', icon: '🏆', description: 'Leaderboards and levels.' },
  { id: 'token', label: '$JOURNEY Token', icon: '🚀', description: 'Solana utility token.' },
];

const WikiView: React.FC<WikiViewProps> = ({ onBack, onNavigate, user, onUpdateUser, onAddPoints, initialTab = 'guide' }) => {
  const [activeTab, setActiveTab] = useState<WikiTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Analytics State (Kept for Progression tab)
  const [registryStats, setRegistryStats] = useState({ 
      users: 0, xp: 0, active_today: 0, avg_xp: 0,
      growth: [] as ChartDataPoint[],
      xp_dist: [] as ChartDataPoint[],
      activity_vol: [] as ChartDataPoint[]
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (activeTab === 'progression' || activeTab === 'economy') {
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
                  growth: (data.growth || []).map((d: any) => ({ label: d.label, value: d.value })),
                  xp_dist: (data.xp_dist || []).map((d: any, i: number) => ({ 
                      label: d.label, value: d.value, 
                      color: ['#eab308', '#3b82f6', '#a855f7', '#22c55e', '#ef4444'][i % 5] 
                  })),
                  activity_vol: (data.activity_vol || []).map((d: any, i: number) => ({ 
                      label: d.label, value: d.value, 
                      color: ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'][i % 5] 
                  }))
              });
          }
      } catch (e) { console.error(e); } finally { setLoadingStats(false); }
  };

  const filteredTabs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return WIKI_TABS;
    return WIKI_TABS.filter(t => t.label.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
  }, [searchQuery]);

  const handleTabChange = (tabId: WikiTab) => {
    setActiveTab(tabId);
    AudioSystem.playVoxelTap();
    document.getElementById('wiki-content-panel')?.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 flex flex-col items-center animate-fade-in custom-scroll">
      
      {/* Search Header */}
      <div className="max-w-7xl w-full mb-8 bg-gray-900 border-b-4 border-yellow-600 rounded-2xl p-6 flex flex-col md:flex-row gap-6 justify-between items-center shadow-2xl relative z-50">
         <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-yellow-500 rounded-xl flex items-center justify-center text-3xl border-4 border-white animate-float">📘</div>
            <div>
               <h1 className="text-3xl md:text-5xl font-retro text-white leading-none tracking-tighter uppercase">Digital Codex</h1>
               <p className="text-gray-500 text-[10px] font-mono mt-2 uppercase tracking-[0.4em]">Spirit_Network_v9.6</p>
            </div>
         </div>
         <div className="flex items-center gap-3 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search guides..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 md:w-64 bg-black border-2 border-gray-800 rounded-xl p-3 text-white text-sm font-mono focus:border-yellow-500 outline-none"
            />
            <Button onClick={onBack} variant="secondary" className="px-4 py-3">✖</Button>
         </div>
      </div>

      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-4 gap-8 min-h-[70vh]">
        
        {/* Navigation Sidebar */}
        <div className="col-span-1 bg-gray-900/40 p-4 rounded-2xl border-2 border-white/5 h-fit sticky top-24 backdrop-blur-md">
           <nav className="space-y-1.5 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
             {filteredTabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => handleTabChange(tab.id)}
                 className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${activeTab === tab.id ? 'bg-yellow-600 text-white shadow-lg translate-x-2' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}
               >
                 <span className="text-xl">{tab.icon}</span>
                 <span className="font-retro text-[9px] uppercase tracking-wider">{tab.label}</span>
               </button>
             ))}
           </nav>
        </div>

        {/* Content Display Panel */}
        <div id="wiki-content-panel" className="md:col-span-3 bg-gray-900/60 border-2 border-white/5 rounded-[3rem] p-6 md:p-12 shadow-2xl relative overflow-y-auto custom-scroll backdrop-blur-lg h-[80vh]">
           
           {activeTab === 'guide' && (
             <div className="space-y-8 animate-slide-up">
                <h2 className="text-5xl font-retro text-white mb-4">Welcome, Pilgrim.</h2>
                <p className="text-xl font-serif text-gray-300 italic">"The Journey is not just a game; it is a spiritual practice disguised as an adventure."</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-yellow-500 font-retro text-xs uppercase mb-2">1. Play & Pray</h3>
                        <p className="text-gray-400 text-sm">Engage in Arcade Campaigns to face spiritual trials. Respond with wisdom to earn XP and revealed scripture.</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-blue-500 font-retro text-xs uppercase mb-2">2. Forge Identity</h3>
                        <p className="text-gray-400 text-sm">Use your XP to forge unique artifacts in the Sacred Forge. Build your Sanctuary.</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-green-500 font-retro text-xs uppercase mb-2">3. Fellowship</h3>
                        <p className="text-gray-400 text-sm">Join a community. Tithe XP to strengthen your guild. Share prayer requests on the wall.</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-purple-500 font-retro text-xs uppercase mb-2">4. Daily Bread</h3>
                        <p className="text-gray-400 text-sm">Return daily for a new devotional. Consistency is the key to spiritual growth (and rewards).</p>
                    </div>
                </div>
             </div>
           )}

           {activeTab === 'game' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-yellow-500">Pilgrim's Game</h2>
                <p className="text-gray-300 font-serif">The core experience. Select a campaign (Pilgrim, David, or Paul) and navigate 9 circles of overcoming.</p>
                <ul className="list-disc pl-5 space-y-2 text-gray-400 text-sm">
                    <li><strong>Trials:</strong> Each level presents a moral dilemma or spiritual obstacle.</li>
                    <li><strong>AI Guide:</strong> You speak to a biblical character or the Spirit Guide.</li>
                    <li><strong>Resolution:</strong> Choose the path of virtue to clear the circle.</li>
                    <li><strong>Rewards:</strong> +200-500 XP per level, plus a "Revealed Verse" for your collection.</li>
                </ul>
             </div>
           )}

           {activeTab === 'tv' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-red-500">Journey TV</h2>
                <p className="text-gray-300 font-serif">A curated stream of Christian content, sermons, and lofi worship.</p>
                <div className="bg-gray-800 p-4 rounded-xl border border-red-900/50">
                    <h4 className="text-red-400 font-bold mb-2">Broadcasting</h4>
                    <p className="text-xs text-gray-400">Users can pay <strong>1000 XP</strong> to broadcast a YouTube/Twitch link to the entire community. This is a great way to share your favorite sermon or worship set.</p>
                </div>
             </div>
           )}

           {activeTab === 'quests' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-green-400">Quests & XP</h2>
                <p className="text-gray-300 font-serif">Spirit XP is the lifeblood of the Journey economy. Earn it to forge items, enter raffles, and rank up.</p>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl">
                        <span className="text-2xl">🍞</span>
                        <p className="font-bold text-white mt-2">Daily Bread</p>
                        <p className="text-xs text-gray-400">+50 XP / Day</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl">
                        <span className="text-2xl">⚔️</span>
                        <p className="font-bold text-white mt-2">Levels</p>
                        <p className="text-xs text-gray-400">+200 XP / Circle</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl">
                        <span className="text-2xl">📜</span>
                        <p className="font-bold text-white mt-2">Missions</p>
                        <p className="text-xs text-gray-400">+100-5000 XP</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl">
                        <span className="text-2xl">💬</span>
                        <p className="font-bold text-white mt-2">Chat/Community</p>
                        <p className="text-xs text-gray-400">+5 XP / Interaction</p>
                    </div>
                </div>
             </div>
           )}

           {activeTab === 'community' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-orange-500">Fellowship</h2>
                <p className="text-gray-300 font-serif">Join a Ministry (Guild) to pool resources and unlock collective achievements.</p>
                <ul className="space-y-4">
                    <li className="bg-black/30 p-4 rounded-xl border border-orange-900/30">
                        <strong className="text-orange-400 block mb-1">Tithing</strong>
                        <span className="text-xs text-gray-400">Contribute personal XP to the Community Treasury. This levels up the guild and unlocks perks for all members.</span>
                    </li>
                    <li className="bg-black/30 p-4 rounded-xl border border-orange-900/30">
                        <strong className="text-orange-400 block mb-1">Prayer Wall</strong>
                        <span className="text-xs text-gray-400">Post prayer requests or testimonies. Members can click "Pray" to send a notification and earn support XP.</span>
                    </li>
                </ul>
             </div>
           )}

           {activeTab === 'vault' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-purple-500">Sacred Forge</h2>
                <p className="text-gray-300 font-serif">The Forge uses AI to manifest your spiritual journey into digital artifacts.</p>
                <div className="border-l-4 border-purple-500 pl-4 py-2">
                    <p className="text-white font-bold">Cost: 500 - 15,000 XP</p>
                    <p className="text-xs text-gray-400 mt-1">Depends on the Protocol Tier (Common to Mythic).</p>
                </div>
                <p className="text-xs text-gray-400">Forged items (Avatars, Backgrounds, Scripture Stones) are saved to your permanent collection and can be traded.</p>
             </div>
           )}

           {activeTab === 'market' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-green-500">Marketplace</h2>
                <p className="text-gray-300 font-serif">A peer-to-peer exchange for Forged Artifacts.</p>
                <p className="text-sm text-gray-400">When you list an item, you can "infuse" it with extra XP. When another player buys it, they receive the item AND the infused XP.</p>
                <div className="bg-green-900/20 p-4 rounded-xl text-center">
                    <p className="font-mono text-green-400">30% Transaction Fee</p>
                    <p className="text-[10px] text-gray-500">Goes to the Global Treasury to fund Raffles.</p>
                </div>
             </div>
           )}

           {activeTab === 'prayer' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-cyan-400">Prayer Room</h2>
                <p className="text-gray-300 font-serif">An immersive, voice-enabled sanctuary powered by Gemini Live API.</p>
                <p className="text-sm text-gray-400">Speak naturally to the 'Eternal Guide'. Receive biblical counsel, prayer, and comfort in real-time. Requires a small XP offering to enter.</p>
             </div>
           )}

           {activeTab === 'events' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-yellow-500">Raffles & Giveaways</h2>
                <p className="text-gray-300 font-serif">A chance to win XP or artifacts through providence.</p>
                <div className="bg-gray-800 p-4 rounded-xl border border-yellow-900/50 mb-4">
                    <h4 className="text-yellow-400 font-bold mb-2">User Giveaways</h4>
                    <p className="text-xs text-gray-400">Any level 5+ pilgrim can host a giveaway. 70% of fees go to the host, 30% to the Treasury.</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-blue-900/50">
                    <h4 className="text-blue-400 font-bold mb-2">Official Raffles</h4>
                    <p className="text-xs text-gray-400">Hosted by the system or partners. Proceeds go fully to the Treasury.</p>
                </div>
             </div>
           )}

           {(activeTab === 'progression' || activeTab === 'economy') && (
              <div className="space-y-8 animate-slide-up">
                 <h2 className="text-4xl font-retro text-blue-500">Global Stats</h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-black/40 p-4 rounded-xl"><div className="text-2xl font-bold text-white">{registryStats.users}</div><div className="text-[9px] uppercase text-gray-500">Pilgrims</div></div>
                    <div className="bg-black/40 p-4 rounded-xl"><div className="text-2xl font-bold text-green-400">{(registryStats.xp/1000).toFixed(1)}k</div><div className="text-[9px] uppercase text-gray-500">Total XP</div></div>
                 </div>
                 <div className="h-64 bg-black/40 p-4 rounded-xl border border-white/5">
                    <BarChart data={registryStats.activity_vol} />
                 </div>
              </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default WikiView;
