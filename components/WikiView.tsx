
import React, { useState, useEffect, useMemo } from 'react';
import Button from './Button';
import { GAMES, BADGES, ARCHETYPES, PLAYER_LEVELS } from '../constants';
import { AppView, User } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { BarChart, LineChart, DonutChart, ChartDataPoint } from './Charts';

export type WikiTab = 'guide' | 'economy' | 'vault' | 'market' | 'community' | 'quests' | 'prayer' | 'progression' | 'tv' | 'token';

interface WikiViewProps {
  onBack: () => void;
  onNavigate?: (view: AppView) => void;
  user: User | null;
  onUpdateUser?: (user: User) => void;
  onAddPoints?: (points: number) => void;
  initialTab?: WikiTab;
}

const WIKI_TABS: { id: WikiTab; label: string; icon: string; description: string }[] = [
  { id: 'guide', label: 'Start Here', icon: '🌟', description: 'Beginner\'s guide & Activities.' },
  { id: 'economy', label: 'Economy & Fees', icon: '🪙', description: 'Net Worth, Taxes, and XP flow.' },
  { id: 'vault', label: 'Forge & Staking', icon: '⚒️', description: 'Creating Artifacts & Yield.' },
  { id: 'market', label: 'Marketplace', icon: '🛒', description: 'Buying, Selling & Burning.' },
  { id: 'community', label: 'Fellowship', icon: '🔥', description: 'Guilds, Tithing & Roles.' },
  { id: 'quests', label: 'Missions', icon: '📜', description: 'Daily, Weekly & Career Tasks.' },
  { id: 'prayer', label: 'Prayer & Plans', icon: '🙏', description: 'Spiritual Disciplines.' },
  { id: 'tv', label: 'Media & Chat', icon: '📺', description: 'Broadcasts and Global Chat.' },
  { id: 'progression', label: 'Ranks & Stats', icon: '🏆', description: 'Levels, Badges & Global Data.' },
  { id: 'token', label: '$JOURNEY', icon: '🚀', description: 'Future On-Chain Utility.' },
];

const WikiView: React.FC<WikiViewProps> = ({ onBack, onNavigate, user, onUpdateUser, onAddPoints, initialTab = 'guide' }) => {
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
                 <div>
                    <span className="font-retro text-[9px] uppercase tracking-wider block">{tab.label}</span>
                    <span className="text-[7px] font-serif italic opacity-60 block line-clamp-1">{tab.description}</span>
                 </div>
               </button>
             ))}
           </nav>
        </div>

        {/* Content Display Panel */}
        <div id="wiki-content-panel" className="md:col-span-3 bg-gray-900/60 border-2 border-white/5 rounded-[3rem] p-6 md:p-12 shadow-2xl relative overflow-y-auto custom-scroll backdrop-blur-lg h-[80vh]">
           
           {activeTab === 'guide' && (
             <div className="space-y-8 animate-slide-up">
                <h2 className="text-5xl font-retro text-white mb-4">The Pilgrim's Path</h2>
                <p className="text-xl font-serif text-gray-300 italic">"The Journey is a gamified spiritual ecosystem. Your actions here build a digital legacy."</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-black/40 p-6 rounded-2xl border border-blue-500/30">
                        <h3 className="text-blue-400 font-retro text-sm uppercase mb-2">1. The Arcade</h3>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            Play through campaigns (Pilgrim, David, Paul). Navigate 9 levels of sin/virtue. 
                            <strong> +200 XP</strong> per level cleared. Collect <strong>Revealed Verses</strong> to build your library.
                        </p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-2xl border border-yellow-500/30">
                        <h3 className="text-yellow-400 font-retro text-sm uppercase mb-2">2. Daily Disciplines</h3>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            Consistency is key. Read the <strong>Daily Bread</strong> (+50 XP). Complete <strong>Daily Missions</strong> (+100-300 XP).
                            Check the <strong>Browser</strong> for resources.
                        </p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-2xl border border-purple-500/30">
                        <h3 className="text-purple-400 font-retro text-sm uppercase mb-2">3. Manifest & Own</h3>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            Use your XP in the <strong>Sacred Forge</strong> to create unique AI-generated Artifacts. 
                            These increase your <strong>Net Worth</strong> and can be traded.
                        </p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-2xl border border-green-500/30">
                        <h3 className="text-green-400 font-retro text-sm uppercase mb-2">4. Community</h3>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            Join a Fellowship. Tithe XP to level up your guild. 
                            Participate in <strong>Raffles</strong> and <strong>Giveaways</strong> to win massive prizes.
                        </p>
                    </div>
                </div>
             </div>
           )}

           {activeTab === 'economy' && (
             <div className="space-y-8 animate-slide-up">
                <h2 className="text-4xl font-retro text-yellow-500">Divine Economy</h2>
                <div className="bg-yellow-900/20 p-6 rounded-3xl border border-yellow-600/30">
                    <h3 className="text-xl font-bold text-white mb-2">Net Worth</h3>
                    <p className="text-sm text-gray-300">Your total standing is calculated as:</p>
                    <div className="flex flex-wrap gap-4 mt-4 font-mono text-xs">
                        <div className="bg-black/50 px-4 py-2 rounded-lg text-blue-400">💧 Liquid XP (Wallet)</div>
                        <span className="self-center">+</span>
                        <div className="bg-black/50 px-4 py-2 rounded-lg text-purple-400">💎 Asset XP (Artifact Value)</div>
                        <span className="self-center">+</span>
                        <div className="bg-black/50 px-4 py-2 rounded-lg text-green-400">🔒 Staked XP (Vault)</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-green-400 font-retro text-xs uppercase border-b border-white/10 pb-2">Sources of Income</h4>
                        <ul className="text-xs text-gray-400 space-y-2">
                            <li><span className="text-white">Gameplay:</span> Levels, Verses, Achievements.</li>
                            <li><span className="text-white">Daily:</span> Devotionals, Chat participation.</li>
                            <li><span className="text-white">Staking:</span> Earning APY in the Vault.</li>
                            <li><span className="text-white">Sales:</span> Selling artifacts on Marketplace.</li>
                            <li><span className="text-white">Giveaways:</span> Hosting (70% cut) or Winning.</li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-red-400 font-retro text-xs uppercase border-b border-white/10 pb-2">Fees & Sinks</h4>
                        <ul className="text-xs text-gray-400 space-y-2">
                            <li><span className="text-white">Market Tax:</span> 10% on Sales / 100 XP Listing Fee.</li>
                            <li><span className="text-white">Dissolution:</span> Burning items returns 50% XP.</li>
                            <li><span className="text-white">Giveaways:</span> 30% tax on entry fees + 500 XP Creation.</li>
                            <li><span className="text-white">Broadcasts:</span> 1000 XP to post on Journey TV.</li>
                            <li><span className="text-white">Staking:</span> 100 XP Deposit Fee.</li>
                        </ul>
                    </div>
                </div>
             </div>
           )}

           {activeTab === 'vault' && (
             <div className="space-y-8 animate-slide-up">
                <div>
                    <h2 className="text-4xl font-retro text-purple-500 mb-4">The Sacred Forge</h2>
                    <p className="text-gray-300 font-serif text-sm">Convert Liquid XP into Digital Assets (NFTs). Value is stored inside the item.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[{n:'Scribe', c:500, q:'Common'}, {n:'Warrior', c:1500, q:'Rare'}, {n:'Angelic', c:5000, q:'Legendary'}, {n:'Seraphic', c:15000, q:'Mythic'}].map(t => (
                        <div key={t.n} className="bg-black/40 p-4 rounded-xl border border-purple-500/20 flex justify-between items-center">
                            <div>
                                <span className="font-retro text-xs text-purple-300 uppercase">{t.n} Protocol</span>
                                <span className="block text-[10px] text-gray-500">{t.q} Quality</span>
                            </div>
                            <span className="font-mono text-white font-bold">{t.c.toLocaleString()} XP</span>
                        </div>
                    ))}
                </div>
                
                <div className="bg-purple-900/20 p-4 rounded-xl border border-purple-600/30 text-xs text-gray-300">
                    <strong className="text-purple-300">AUTO-LISTING:</strong> Items forged are automatically listed on the Marketplace at 110% cost. If sold, you recover 100% of your invested XP immediately.
                </div>

                <hr className="border-white/10" />

                <div>
                    <h2 className="text-4xl font-retro text-yellow-500 mb-4">Celestial Staking</h2>
                    <p className="text-gray-300 font-serif text-sm mb-4">Lock XP to earn passive yield. Early withdrawal forfeits rewards.</p>
                    <div className="bg-gray-800 p-6 rounded-2xl border border-yellow-600/30 space-y-3">
                        <div className="flex justify-between text-xs"><span className="text-gray-400">Daily Flex</span><span className="text-green-400">5% APY</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-400">Weekly Covenant</span><span className="text-green-400">15% APY</span></div>
                        <div className="flex justify-between text-xs"><span className="text-gray-400">Monthly Vow</span><span className="text-green-400">40% APY</span></div>
                        <div className="flex justify-between text-xs"><span className="text-white font-bold">Yearly Eternal Oath</span><span className="text-green-400 font-bold">100% APY</span></div>
                    </div>
                </div>
             </div>
           )}

           {activeTab === 'market' && (
             <div className="space-y-8 animate-slide-up">
                <h2 className="text-4xl font-retro text-green-500">Marketplace Protocols</h2>
                
                <div className="bg-green-900/20 border-l-4 border-green-500 p-6 rounded-r-xl">
                    <h3 className="text-green-400 font-bold mb-2">XP Infusion & Absorption</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                        Artifacts hold "Intrinsic Value" (Attached XP). When you buy an item, you inherit this value in your <strong>Net Worth</strong>.
                        You can also burn items to reclaim this value as Liquid XP.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                        <div className="text-3xl mb-2">🛒</div>
                        <h4 className="font-retro text-xs text-white uppercase mb-1">Buying</h4>
                        <p className="text-[10px] text-gray-400">
                            Pay listing price.<br/>Receive Item + Attached XP.<br/>
                            <strong>10% Fee</strong> included in price goes to Treasury.
                        </p>
                    </div>
                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                        <div className="text-3xl mb-2">🏷️</div>
                        <h4 className="font-retro text-xs text-white uppercase mb-1">Selling</h4>
                        <p className="text-[10px] text-gray-400">
                            Set Price.<br/>
                            If Auto-Listed from Forge: Price is 110% of Cost.<br/>
                            Custom Listing: 10% Tax on sale.
                        </p>
                    </div>
                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                        <div className="text-3xl mb-2">🔥</div>
                        <h4 className="font-retro text-xs text-white uppercase mb-1">Burning</h4>
                        <p className="text-[10px] text-gray-400">
                            Sacred Dissolution.<br/>
                            Reclaim <strong>50%</strong> of Attached XP immediately.<br/>
                            Remaining 50% returns to the Treasury.
                        </p>
                    </div>
                </div>
             </div>
           )}

           {activeTab === 'community' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-orange-500">Fellowship & Guilds</h2>
                <p className="text-gray-300 font-serif text-sm">"Where two or three are gathered..."</p>
                
                <div className="bg-orange-900/20 p-6 rounded-2xl border border-orange-600/30">
                    <h3 className="text-orange-400 font-retro text-sm uppercase mb-2">Tithing & Leveling</h3>
                    <p className="text-xs text-gray-300 mb-4">
                        Communities have a shared <strong>Treasury</strong>. Members can "Tithe" their personal XP to the guild.
                        Higher total XP unlocks higher Guild Levels.
                    </p>
                    <div className="flex gap-2">
                        <span className="px-3 py-1 bg-black/40 rounded border border-orange-500/50 text-[10px] text-orange-200">Lvl 1: 0 XP</span>
                        <span className="px-3 py-1 bg-black/40 rounded border border-orange-500/50 text-[10px] text-orange-200">Lvl 2: 10k XP</span>
                        <span className="px-3 py-1 bg-black/40 rounded border border-orange-500/50 text-[10px] text-orange-200">Lvl 5: 100k XP</span>
                    </div>
                </div>

                <div className="bg-gray-800/50 p-6 rounded-2xl">
                    <h3 className="text-white font-retro text-sm uppercase mb-2">Prayer Wall</h3>
                    <p className="text-xs text-gray-400">
                        Post prayer requests. When others click "Pray", they receive a small XP reward for intercession.
                        This builds the community's "Faith Score" (Achievements).
                    </p>
                </div>
             </div>
           )}

           {activeTab === 'quests' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-blue-400">Mission System</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                        <h4 className="font-bold text-blue-300">Daily</h4>
                        <p className="text-[10px] text-gray-400">Reset every 24h</p>
                        <p className="text-sm font-mono mt-2">+50-100 XP</p>
                    </div>
                    <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl">
                        <h4 className="font-bold text-purple-300">Weekly</h4>
                        <p className="text-[10px] text-gray-400">Reset Sundays</p>
                        <p className="text-sm font-mono mt-2">+300-1000 XP</p>
                    </div>
                    <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                        <h4 className="font-bold text-yellow-300">Career</h4>
                        <p className="text-[10px] text-gray-400">One-time Milestones</p>
                        <p className="text-sm font-mono mt-2">+500-5000 XP</p>
                    </div>
                </div>
                <p className="text-xs text-gray-500 text-center italic">"Check the Quest Log daily to maximize your growth."</p>
             </div>
           )}

           {activeTab === 'prayer' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-cyan-400">Spiritual Disciplines</h2>
                
                <div className="bg-cyan-900/20 p-6 rounded-2xl border border-cyan-500/30 mb-6">
                    <h3 className="text-cyan-300 font-retro text-sm uppercase mb-2">The Prayer Room</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                        An immersive, voice-enabled sanctuary powered by Gemini Live API. 
                        Speak naturally to the 'Eternal Guide' for biblical counsel, comfort, and prayer.
                        <br/><br/>
                        <strong>Cost:</strong> 10 XP Offering per session.
                    </p>
                </div>

                <div className="bg-gray-800/50 p-6 rounded-2xl">
                    <h3 className="text-white font-retro text-sm uppercase mb-2">Bible Plans</h3>
                    <p className="text-xs text-gray-400">
                        Choose from curated plans (Gospels, Psalms) or use the <strong>AI Architect</strong> to generate a custom 
                        reading schedule based on your specific emotional or spiritual needs.
                        <br/>
                        Completing a plan awards a massive XP bonus (+1000 XP).
                    </p>
                </div>
             </div>
           )}

           {activeTab === 'tv' && (
             <div className="space-y-6 animate-slide-up">
                <h2 className="text-4xl font-retro text-red-500">Media & Chat</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/40 p-6 rounded-2xl border border-red-900/50">
                        <h3 className="text-red-400 font-retro text-sm uppercase mb-2">Journey TV</h3>
                        <p className="text-xs text-gray-400">
                            A curated stream of Christian content. Users can broadcast YouTube/Twitch streams to the whole platform.
                            <br/><br/>
                            <strong>Broadcast Fee:</strong> 1000 XP
                        </p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-2xl border border-blue-900/50">
                        <h3 className="text-blue-400 font-retro text-sm uppercase mb-2">Global Chat</h3>
                        <p className="text-xs text-gray-400">
                            Real-time fellowship. Share wins, ask for help, or discuss scripture.
                            <br/><br/>
                            <strong>Reward:</strong> +5 XP per message (anti-spam limited).
                        </p>
                    </div>
                </div>
             </div>
           )}

           {(activeTab === 'progression' || activeTab === 'economy') && activeTab !== 'economy' && (
              <div className="space-y-8 animate-slide-up">
                 <h2 className="text-4xl font-retro text-blue-500">Global Registry</h2>
                 <p className="text-gray-300 font-serif text-sm">Real-time statistics from the Book of Life.</p>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-black/40 p-4 rounded-xl"><div className="text-2xl font-bold text-white">{registryStats.users}</div><div className="text-[9px] uppercase text-gray-500">Pilgrims</div></div>
                    <div className="bg-black/40 p-4 rounded-xl"><div className="text-2xl font-bold text-green-400">{(registryStats.xp/1000).toFixed(1)}k</div><div className="text-[9px] uppercase text-gray-500">Total XP</div></div>
                    <div className="bg-black/40 p-4 rounded-xl"><div className="text-2xl font-bold text-blue-400">{registryStats.active_today}</div><div className="text-[9px] uppercase text-gray-500">Active 24h</div></div>
                    <div className="bg-black/40 p-4 rounded-xl"><div className="text-2xl font-bold text-purple-400">{registryStats.avg_xp}</div><div className="text-[9px] uppercase text-gray-500">Avg XP</div></div>
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

           {activeTab === 'token' && (
               <div className="space-y-6 animate-slide-up text-center">
                   <h2 className="text-5xl font-retro text-green-400">$JOURNEY</h2>
                   <p className="text-xl text-gray-300 font-serif italic">"Store up for yourselves treasures in heaven..."</p>
                   <div className="bg-green-900/20 p-8 rounded-[3rem] border-2 border-green-500/50 inline-block max-w-lg mx-auto">
                       <p className="text-sm text-gray-300 leading-relaxed mb-6">
                           The $JOURNEY token on Solana will serve as the governance and premium utility token for the ecosystem. 
                           Holders will vote on treasury allocations and charity partnerships.
                       </p>
                       <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                           <div className="bg-black/50 p-3 rounded-lg"><span className="text-gray-500 block">Supply</span>1 Billion</div>
                           <div className="bg-black/50 p-3 rounded-lg"><span className="text-gray-500 block">Network</span>Solana</div>
                       </div>
                       <div className="mt-6">
                           <button onClick={() => onNavigate && onNavigate(AppView.TOKEN)} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-black font-bold rounded-xl shadow-lg transition-all">VIEW TOKENOMICS</button>
                       </div>
                   </div>
               </div>
           )}

        </div>
      </div>
    </div>
  );
};

export default WikiView;
