
import React, { useState, useEffect, useMemo } from 'react';
import Button from './Button';
import { GAMES, BADGES, ARCHETYPES, PLAYER_LEVELS } from '../constants';
import { AppView, User } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { BarChart, LineChart, ChartDataPoint, DonutChart } from './Charts';

export type WikiTab = 'guide' | 'economy' | 'token' | 'events' | 'community' | 'lore' | 'archetypes' | 'progression' | 'tv' | 'activities' | 'vault' | 'prayer' | 'faq';

interface WikiViewProps {
  onBack: () => void;
  onNavigate?: (view: AppView) => void;
  user: User | null;
  onUpdateUser?: (user: User) => void;
  onAddPoints?: (points: number) => void;
  initialTab?: WikiTab;
}

const WIKI_TABS: { id: WikiTab; label: string; icon: string; description: string }[] = [
  { id: 'guide', label: 'Gameplay Guide', icon: '🎮', description: 'Core mechanics and trial resolution.' },
  { id: 'token', label: '$JOURNEY Token', icon: '🚀', description: 'Solana fair launch and utility.' },
  { id: 'events', label: 'Raffles & Partners', icon: '🎁', description: 'Giveaways, sponsorships, and donations.' },
  { id: 'economy', label: 'Spirit Economy', icon: '🪙', description: 'XP, Forging, and the Marketplace.' },
  { id: 'community', label: 'Fellowship', icon: '🔥', description: 'Ministries, Guilds, and shared treasury.' },
  { id: 'prayer', label: 'Prayer Room', icon: '✨', description: 'Real-time vocal guidance and counseling.' },
  { id: 'activities', label: 'Disciplines', icon: '🧩', description: 'Interactive spiritual practices.' },
  { id: 'archetypes', label: 'Archetypes', icon: '🛡️', description: 'Character classes and their stats.' },
  { id: 'vault', label: "Personal Vault", icon: '🔐', description: 'Managing your forged collection.' },
  { id: 'tv', label: 'Journey TV', icon: '📺', description: 'Broadcasting and community media.' },
  { id: 'lore', label: 'Realms & Lore', icon: '🗺️', description: 'The geography of the spiritual path.' },
  { id: 'progression', label: 'Soul Registry', icon: '⚡', description: 'Real-time network telemetry.' },
  { id: 'faq', label: 'Support / FAQ', icon: '❓', description: 'Troubleshooting and inquiries.' },
];

const WikiView: React.FC<WikiViewProps> = ({ onBack, onNavigate, user, onUpdateUser, onAddPoints, initialTab = 'guide' }) => {
  const [activeTab, setActiveTab] = useState<WikiTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [registryStats, setRegistryStats] = useState({ users: 1420, xp: 852400, achievements: 5421 });

  useEffect(() => {
    const loadStats = async () => {
      try {
          const { data } = await supabase.rpc('get_global_stats');
          if (data) {
              setRegistryStats({ 
                  users: data.users || 1420, 
                  xp: data.xp || 852400, 
                  achievements: 5421
              });
          }
      } catch (e) {
          console.log("Using mock registry stats");
      }
    };
    loadStats();
  }, []);

  const filteredTabs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return WIKI_TABS;
    return WIKI_TABS.filter(t => 
        t.label.toLowerCase().includes(query) || 
        t.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleTabChange = (tabId: WikiTab) => {
    setActiveTab(tabId);
    AudioSystem.playVoxelTap();
    const contentPanel = document.getElementById('wiki-content-panel');
    if (contentPanel) contentPanel.scrollTop = 0;
  };

  const chartData: ChartDataPoint[] = [
    { label: 'Seekers', value: 45, color: '#9ca3af' },
    { label: 'Disciples', value: 30, color: '#60a5fa' },
    { label: 'Guardians', value: 15, color: '#a855f7' },
    { label: 'Saints', value: 7, color: '#fbbf24' },
    { label: 'Seraphs', value: 3, color: '#ef4444' },
  ];

  const economyData: ChartDataPoint[] = [
    { label: 'Mined', value: 12000, color: '#eab308' },
    { label: 'Burned', value: 4500, color: '#ef4444' },
    { label: 'Market', value: 8000, color: '#22c55e' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 flex flex-col items-center animate-fade-in custom-scroll selection:bg-yellow-500 selection:text-black">
      
      {/* Search Header */}
      <div className="max-w-7xl w-full mb-8 bg-gray-900 border-b-4 border-yellow-600 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-center shadow-2xl relative z-50">
         <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-yellow-500 rounded-xl flex items-center justify-center text-3xl border-4 border-white shadow-[0_0_20px_rgba(234,179,8,0.3)] animate-float">📘</div>
            <div>
               <h1 className="text-3xl md:text-5xl font-retro text-white leading-none tracking-tighter uppercase">Digital Codex</h1>
               <p className="text-gray-500 text-[10px] font-mono mt-2 uppercase tracking-[0.4em]">Spirit_Network_v9.2.0_LATEST</p>
            </div>
         </div>

         <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
               <input 
                 type="text" 
                 placeholder="Search entries..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-black border-2 border-gray-800 rounded-xl p-3 pl-11 text-white text-sm font-mono focus:border-yellow-500 outline-none transition-all"
               />
               <span className="absolute left-4 top-3.5 text-gray-600 text-lg">🔍</span>
            </div>
            <Button onClick={onBack} variant="secondary" className="px-4 py-3">✖</Button>
         </div>
      </div>

      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-4 gap-8 min-h-[70vh]">
        
        {/* Navigation Sidebar */}
        <div className="col-span-1 bg-gray-900/40 p-5 rounded-2xl border-2 border-white/5 h-fit sticky top-24 backdrop-blur-md overflow-hidden">
           <h3 className="text-gray-600 text-[10px] font-retro uppercase mb-6 ml-3 tracking-widest border-b border-gray-800 pb-2">Index</h3>
           <nav className="space-y-1.5 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
             {filteredTabs.map(tab => (
               <button
                 key={tab.id}
                 onClick={() => handleTabChange(tab.id)}
                 className={`w-full text-left p-3.5 rounded-xl flex items-center gap-4 transition-all duration-300 ${activeTab === tab.id ? 'bg-yellow-600 text-white shadow-lg translate-x-2' : 'text-gray-500 hover:bg-gray-800/50 hover:text-gray-300'}`}
               >
                 <span className="text-xl md:text-2xl">{tab.icon}</span>
                 <span className="font-retro text-[9px] md:text-[10px] uppercase tracking-wider">{tab.label}</span>
               </button>
             ))}
           </nav>
        </div>

        {/* Content Display Panel */}
        <div id="wiki-content-panel" className="md:col-span-3 bg-gray-900/60 border-2 border-white/5 rounded-[3rem] p-8 md:p-14 shadow-2xl relative overflow-y-auto custom-scroll backdrop-blur-lg h-[80vh]">
           
           {/* GUIDE SECTION */}
           {activeTab === 'guide' && (
             <div className="space-y-10 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-yellow-500 drop-shadow-md uppercase tracking-tighter">Gameplay Guide</h2>
                <div className="bg-white/5 p-8 rounded-3xl border-l-4 border-yellow-500 italic font-serif text-xl md:text-2xl text-gray-200 leading-relaxed shadow-inner">
                  "Every trial is a question only the Spirit can answer. Navigate the path using wisdom, truth, and prayer."
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-black/40 p-8 rounded-[2.5rem] border border-blue-900/30 shadow-xl group hover:border-blue-500 transition-colors">
                      <div className="w-14 h-14 bg-blue-900/40 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg">📡</div>
                      <h4 className="text-blue-400 font-retro text-xs mb-4 uppercase tracking-widest">1. The Encounter</h4>
                      <p className="text-gray-400 text-base leading-relaxed font-serif">Enter a specific biblical moment. The Guide will describe your current spiritual conflict and the specific sin you must overcome through a core virtue.</p>
                   </div>
                   <div className="bg-black/40 p-8 rounded-[2.5rem] border border-green-900/30 shadow-xl group hover:border-green-500 transition-colors">
                      <div className="w-14 h-14 bg-green-900/40 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg">💬</div>
                      <h4 className="text-green-400 font-retro text-xs mb-4 uppercase tracking-widest">2. The Response</h4>
                      <p className="text-gray-400 text-base leading-relaxed font-serif">Speak naturally to the Guide. Evaluate your heart and respond with confession, prayer, or biblical wisdom. Your choices determine the path ahead.</p>
                   </div>
                   <div className="bg-black/40 p-8 rounded-[2.5rem] border border-yellow-900/30 shadow-xl group hover:border-yellow-500 transition-colors">
                      <div className="w-14 h-14 bg-yellow-900/40 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg">✨</div>
                      <h4 className="text-yellow-400 font-retro text-xs mb-4 uppercase tracking-widest">3. Revelation</h4>
                      <p className="text-gray-400 text-base leading-relaxed font-serif">Successful resolution unlocks a 'Revelation' — a core scripture verse that is added to your collection and personal journal.</p>
                   </div>
                   <div className="bg-black/40 p-8 rounded-[2.5rem] border border-purple-900/30 shadow-xl group hover:border-purple-500 transition-colors">
                      <div className="w-14 h-14 bg-purple-900/40 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-lg">🚀</div>
                      <h4 className="text-purple-400 font-retro text-xs mb-4 uppercase tracking-widest">4. Ascension</h4>
                      <p className="text-gray-400 text-base leading-relaxed font-serif">Earn Spirit XP to ascend through levels. Each cleared circle brings you closer to the presence of the Almighty.</p>
                   </div>
                </div>
             </div>
           )}

           {/* TOKEN SECTION ($JOURNEY) */}
           {activeTab === 'token' && (
             <div className="space-y-10 animate-slide-up">
                <div className="text-center md:text-left">
                    <h2 className="text-4xl md:text-7xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-purple-500 drop-shadow-md uppercase tracking-tighter mb-4">$JOURNEY Token</h2>
                    <span className="bg-green-900/40 text-green-400 font-mono text-[10px] px-4 py-2 rounded-full border border-green-600/30 uppercase tracking-[0.2em] inline-block">Solana Network</span>
                </div>

                <div className="bg-gradient-to-br from-green-900/20 to-black p-10 rounded-[3rem] border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <h3 className="text-2xl font-retro text-white mb-6 uppercase">Fair Launch Protocol</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-gray-300 leading-relaxed font-serif">
                        <p><strong>$JOURNEY</strong> is a community-driven utility token launching on <strong>Pump.fun</strong>. We believe in a fair start: no pre-sale, no insider allocations, and 100% transparency.</p>
                        <p>The token connects the digital sanctuary with real-world value, enabling premium cosmetic forging, governance voting, and supporting our ministry partners.</p>
                    </div>
                    <div className="mt-8 flex gap-4">
                        <Button onClick={() => onNavigate?.(AppView.TOKEN)} className="bg-green-600 hover:bg-green-500 border-green-400 shadow-lg text-xs py-3 px-8">VIEW LAUNCHPAD</Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5">
                        <div className="text-4xl mb-4">🌱</div>
                        <h4 className="text-white font-retro text-xs mb-2 uppercase">Sustainable</h4>
                        <p className="text-gray-500 text-xs">A portion of fees supports app server costs and partner charities.</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5">
                        <div className="text-4xl mb-4">⚒️</div>
                        <h4 className="text-white font-retro text-xs mb-2 uppercase">Utility</h4>
                        <p className="text-gray-500 text-xs">Burn $JOURNEY for Mythic Artifacts and Sanctuary upgrades.</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-[2rem] border border-white/5">
                        <div className="text-4xl mb-4">🗳️</div>
                        <h4 className="text-white font-retro text-xs mb-2 uppercase">Governance</h4>
                        <p className="text-gray-500 text-xs">Token holders vote on future features and charitable allocations.</p>
                    </div>
                </div>
             </div>
           )}

           {/* EVENTS SECTION (Raffles & Partnerships) */}
           {activeTab === 'events' && (
             <div className="space-y-12 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-yellow-500 drop-shadow-md uppercase tracking-tighter">Events & Partners</h2>
                
                {/* PARTNERSHIP CALL TO ACTION */}
                <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-8 md:p-12 rounded-[3rem] border-2 border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-3xl font-retro text-white mb-4 uppercase">Partner with Us</h3>
                        <p className="text-gray-200 font-serif text-lg italic mb-8 max-w-2xl">
                            "As iron sharpens iron, so one person sharpens another."<br/>
                            We invite ministries, creators, and brands to sponsor official raffles or donate to the Treasury.
                        </p>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 flex-1">
                                <h4 className="text-blue-400 font-bold text-sm mb-1">Sponsor a Raffle</h4>
                                <p className="text-gray-400 text-xs">Donate XP, Crypto, or NFTs to be raffled to the community. Includes 'Visit Link' requirements to grow your audience.</p>
                            </div>
                            <div className="bg-black/40 p-4 rounded-2xl border border-white/10 flex-1">
                                <h4 className="text-purple-400 font-bold text-sm mb-1">Sustainable Giving</h4>
                                <p className="text-gray-400 text-xs">Donations help sustain the AI costs and servers, keeping the Journey free for seekers worldwide.</p>
                            </div>
                        </div>
                        <button onClick={() => onNavigate?.(AppView.SUPPORT)} className="mt-8 bg-white text-black font-bold py-3 px-8 rounded-full font-retro text-xs hover:bg-gray-200 transition-all shadow-xl">
                            CONTACT FOR PARTNERSHIP
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-yellow-600/30">
                        <h4 className="text-yellow-500 font-retro text-xs mb-4 uppercase tracking-widest flex items-center gap-2">
                            <span className="text-xl">🎟️</span> Official Raffles
                        </h4>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Hosted by The Journey or official partners. These high-value events often require a small XP fee or a social action (e.g., visiting a sponsor). Winners are drawn fairly by the system.
                        </p>
                    </div>
                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-green-600/30">
                        <h4 className="text-green-500 font-retro text-xs mb-4 uppercase tracking-widest flex items-center gap-2">
                            <span className="text-xl">🎁</span> Community Giveaways
                        </h4>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Any pilgrim (Lvl 5+) can host a giveaway. 
                            <br/><br/>
                            <span className="text-white font-bold">The Economics:</span>
                            <br/>
                            • <strong>70%</strong> of entry fees go to the Host.
                            <br/>
                            • <strong>30%</strong> goes to the Community Treasury.
                            <br/>
                            • Items are held in <strong>Escrow</strong> until the winner is drawn.
                        </p>
                    </div>
                </div>
             </div>
           )}

           {/* PRAYER ROOM SECTION */}
           {activeTab === 'prayer' && (
             <div className="space-y-10 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-cyan-400 drop-shadow-md uppercase tracking-tighter">Prayer Room</h2>
                <div className="bg-cyan-900/20 p-8 rounded-[2.5rem] border-2 border-cyan-800/30 text-gray-300 font-serif text-lg leading-relaxed shadow-inner">
                    The Prayer Room uses the <strong>Nexus Voice Protocol</strong> (Gemini Live API) to provide a real-time, vocal counseling experience. Speak your heart, and the Eternal Guide will respond with scripture and guidance.
                </div>

                <div className="space-y-6">
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                        <h4 className="text-white font-retro text-[10px] uppercase mb-4 tracking-widest flex items-center gap-3">
                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping"></span>
                            Vocal Communion
                        </h4>
                        <p className="text-gray-400 text-sm leading-relaxed">Unlike text-based trials, the Prayer Room is a safe haven for free-form vocal expression. There is no 'correct' answer here—only sincerity.</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                        <h4 className="text-white font-retro text-[10px] uppercase mb-4 tracking-widest flex items-center gap-3">
                            <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>
                            Spiritual Counsel
                        </h4>
                        <p className="text-gray-400 text-sm leading-relaxed">The Guide in this room is tuned for empathy and biblical wisdom. If you are struggling, ask for a prayer, and the Guide will lead you through one.</p>
                    </div>
                </div>
             </div>
           )}

           {/* ECONOMY SECTION */}
           {activeTab === 'economy' && (
             <div className="space-y-12 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-green-400 drop-shadow-md uppercase tracking-tighter">Spirit Economy</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="bg-black/40 p-8 rounded-[2.5rem] border border-green-900/30 shadow-xl">
                            <h4 className="text-yellow-500 font-retro text-xs mb-4 uppercase">Spirit XP</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">XP is earned through consistent spiritual discipline: trial completion (+100-300), daily devotionals (+50), and community interaction (+5-10).</p>
                        </div>
                        <div className="bg-black/40 p-8 rounded-[2.5rem] border border-purple-900/30 shadow-xl">
                            <h4 className="text-purple-400 font-retro text-xs mb-4 uppercase">The Sacred Forge</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">Use 1,000 XP to ignite the forge and manifest unique 3D Voxel or 2D Pixel artifacts. These become permanent parts of your soul record.</p>
                        </div>
                    </div>
                    <div className="bg-black/50 p-8 rounded-[3rem] border border-white/5 flex flex-col">
                        <h4 className="text-gray-500 font-retro text-[9px] uppercase mb-6 tracking-widest">XP Distribution Analysis</h4>
                        <div className="flex-1 min-h-[200px]">
                            <DonutChart data={economyData} />
                        </div>
                        <p className="text-[9px] text-gray-600 mt-4 font-mono uppercase text-center">Real-time Network Volume</p>
                    </div>
                </div>

                <div className="bg-green-900/10 p-8 rounded-[3rem] border border-green-800/30">
                    <h3 className="text-white font-retro text-sm mb-4 uppercase">The Marketplace</h3>
                    <p className="text-gray-300 text-base leading-relaxed mb-6 font-serif">Trade forged artifacts on the global ledger. Sellers can "Infuse" their artifacts with their own XP, allowing buyers to absorb that power upon acquisition. A 30% Tithe applies to all trades, funding the Community Treasury.</p>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-green-500 font-bold text-xl">30%</p>
                            <p className="text-[8px] text-gray-500 uppercase font-retro mt-1">Community Tithe</p>
                        </div>
                        <div className="flex-1 bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                            <p className="text-blue-500 font-bold text-xl">100%</p>
                            <p className="text-[8px] text-gray-500 uppercase font-retro mt-1">XP Transfer</p>
                        </div>
                    </div>
                </div>
             </div>
           )}

           {/* COMMUNITY SECTION */}
           {activeTab === 'community' && (
             <div className="space-y-10 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-orange-500 drop-shadow-md uppercase tracking-tighter">Fellowship</h2>
                <p className="text-gray-300 font-serif text-xl leading-relaxed italic">"For where two or three are gathered in my name, there am I among them."</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                        <h4 className="text-white font-retro text-[10px] mb-2 uppercase">Ministries (Guilds)</h4>
                        <p className="text-gray-400 text-sm">Join or start a fellowship. Ministries compete in the 'Hall of Faith' through collective XP gain and trial completion.</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                        <h4 className="text-white font-retro text-[10px] mb-2 uppercase">The Treasury</h4>
                        <p className="text-gray-400 text-sm">Each fellowship has its own treasury. Members can contribute XP to fund collective goals and unlock group-wide bonuses.</p>
                    </div>
                </div>

                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10">
                    <h4 className="text-yellow-500 font-retro text-xs mb-4 uppercase">Post Types</h4>
                    <div className="space-y-4">
                        <div className="flex gap-4 items-center">
                            <span className="w-12 h-12 bg-blue-600/30 rounded-xl flex items-center justify-center text-xl">🙏</span>
                            <div className="flex-1">
                                <p className="text-white font-bold text-sm">Prayer Requests</p>
                                <p className="text-gray-500 text-xs">Notify your group to stand with you in spiritual warfare.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center">
                            <span className="w-12 h-12 bg-green-600/30 rounded-xl flex items-center justify-center text-xl">📜</span>
                            <div className="flex-1">
                                <p className="text-white font-bold text-sm">Testimonies</p>
                                <p className="text-gray-500 text-xs">Share how the Spirit has moved in your life to encourage others.</p>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
           )}

           {/* ARCHETYPES SECTION */}
           {activeTab === 'archetypes' && (
             <div className="space-y-10 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-blue-500 drop-shadow-md uppercase tracking-tighter">Archetypes</h2>
                <p className="text-gray-300 font-serif text-lg leading-relaxed">Your Archetype defines your role in the community and provides unique bonuses during trials.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ARCHETYPES.map(arch => (
                        <div key={arch.name} className="bg-black/40 p-6 rounded-3xl border-2 border-white/5 hover:border-blue-500 transition-all group">
                            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{arch.icon}</div>
                            <h3 className="text-white font-retro text-xs mb-1 uppercase">{arch.name}</h3>
                            <p className="text-blue-400 font-mono text-[9px] mb-3 uppercase tracking-widest">{arch.stat} Focus</p>
                            <p className="text-gray-500 text-xs font-serif italic leading-relaxed">"{arch.desc}"</p>
                        </div>
                    ))}
                </div>
             </div>
           )}

           {/* PROGRESSION SECTION */}
           {activeTab === 'progression' && (
              <div className="space-y-12 animate-slide-up">
                 <div className="text-center">
                    <h2 className="text-4xl md:text-7xl font-retro text-blue-500 mb-2 uppercase tracking-tighter">Soul Registry</h2>
                    <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.6em]">LIVE_TELEMETRY_FEED</p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-black p-8 rounded-[2.5rem] border-t-4 border-blue-500 shadow-2xl text-center group hover:-translate-y-2 transition-transform">
                       <div className="text-4xl font-mono text-white mb-2">{registryStats.users.toLocaleString()}</div>
                       <div className="text-[10px] text-blue-400 uppercase font-retro tracking-widest">Global Pilgrims</div>
                    </div>
                    <div className="bg-black p-8 rounded-[2.5rem] border-t-4 border-green-500 shadow-2xl text-center group hover:-translate-y-2 transition-transform">
                       <div className="text-4xl font-mono text-white mb-2">{(registryStats.xp / 1000).toFixed(1)}k</div>
                       <div className="text-[10px] text-green-400 uppercase font-retro tracking-widest">Total Spirit XP</div>
                    </div>
                    <div className="bg-black p-8 rounded-[2.5rem] border-t-4 border-yellow-500 shadow-2xl text-center group hover:-translate-y-2 transition-transform">
                       <div className="text-4xl font-mono text-white mb-2">{registryStats.achievements.toLocaleString()}</div>
                       <div className="text-[10px] text-yellow-400 uppercase font-retro tracking-widest">Honors Bestowed</div>
                    </div>
                 </div>

                 <div className="bg-black/50 p-8 rounded-[3rem] border border-white/5 shadow-inner">
                    <h4 className="text-gray-400 font-retro text-[10px] mb-8 uppercase tracking-widest">Rank Distribution (%)</h4>
                    <div className="h-48 w-full">
                        <BarChart data={chartData} />
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-white font-retro text-xs uppercase mb-4 tracking-widest">Ranks & XP Thresholds</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {PLAYER_LEVELS.slice(0, 9).map(lvl => (
                            <div key={lvl.level} className="bg-white/5 p-4 rounded-2xl flex justify-between items-center border border-white/5">
                                <span className="text-gray-300 font-serif italic text-sm">{lvl.title}</span>
                                <span className="text-yellow-600 font-mono text-xs">{lvl.xp}</span>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>
           )}

           {/* FAQ SECTION */}
           {activeTab === 'faq' && (
             <div className="space-y-10 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-gray-400 drop-shadow-md uppercase tracking-tighter">Support & FAQ</h2>
                
                <div className="space-y-6">
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5 hover:border-yellow-600/30 transition-all">
                        <h4 className="text-yellow-500 font-bold text-lg mb-2 font-serif">Is my progress saved?</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">Guest (Wanderer) progress is saved locally to your browser. To ensure your soul record is permanent and synced across devices, convert your guest account to a Spirit Registry (Supabase) account in the Profile tab.</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5 hover:border-yellow-600/30 transition-all">
                        <h4 className="text-yellow-500 font-bold text-lg mb-2 font-serif">How do I earn the 'Creator' badge?</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">The 'Forged Identity' (Creator) badge is awarded after you successfully manifest your first artifact in the Sacred Forge. This requires 1,000 XP and a synced account.</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5 hover:border-yellow-600/30 transition-all">
                        <h4 className="text-yellow-500 font-bold text-lg mb-2 font-serif">What is the daily XP limit?</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">To encourage consistent walk rather than spiritual burnout, the Spirit Network has a soft limit of 1,000 XP per 24-hour cycle. Most major rewards still apply, but grind-based XP is scaled down once reached.</p>
                    </div>
                    <div className="bg-black/40 p-6 rounded-3xl border border-white/5 hover:border-yellow-600/30 transition-all">
                        <h4 className="text-yellow-500 font-bold text-lg mb-2 font-serif">My video isn't playing?</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">Some YouTube videos have restriction protocols (Error 153). If the internal player fails, use the 'Open External Sanctuary' button to watch directly on the platform and return to the app for chat interaction.</p>
                    </div>
                </div>

                <div className="pt-10 text-center">
                    <p className="text-gray-500 text-xs font-mono mb-4 uppercase">Need more personal guidance?</p>
                    <button 
                        onClick={() => onNavigate?.(AppView.SUPPORT)}
                        className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 px-10 rounded-full font-retro text-[10px] shadow-xl uppercase"
                    >
                        Create Support Ticket
                    </button>
                </div>
             </div>
           )}

           {/* ACTIVITIES SECTION */}
           {activeTab === 'activities' && (
             <div className="space-y-10 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-teal-400 drop-shadow-md uppercase tracking-tighter">Disciplines</h2>
                <p className="text-gray-300 font-serif text-lg leading-relaxed">Interactive spiritual practices designed to strengthen your fellowship and deepen your scriptural insight.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-teal-900/30">
                        <h4 className="text-white font-retro text-xs mb-4 uppercase">Lectio Divina</h4>
                        <p className="text-gray-400 text-sm">A four-step meditation process: Read, Reflect, Respond, and Rest. Focuses on hearing God's voice through a single word or phrase.</p>
                    </div>
                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-teal-900/30">
                        <h4 className="text-white font-retro text-xs mb-4 uppercase">Verse Mapping</h4>
                        <p className="text-gray-400 text-sm">Visualizing the connections between verses. Analyze Greek/Hebrew root words and cross-reference themes to build a mental map of truth.</p>
                    </div>
                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-teal-900/30">
                        <h4 className="text-white font-retro text-xs mb-4 uppercase">Prayer Walking</h4>
                        <p className="text-gray-400 text-sm">Physically walking your neighborhood while interceding for the families and spirits within. Transforms physical space into spiritual ground.</p>
                    </div>
                    <div className="bg-black/40 p-8 rounded-[2.5rem] border border-teal-900/30">
                        <h4 className="text-white font-retro text-xs mb-4 uppercase">Scavenger Hunt</h4>
                        <p className="text-gray-400 text-sm">Connecting everyday physical objects to biblical metaphors. A powerful discipline for families and new seekers.</p>
                    </div>
                </div>
             </div>
           )}

           {/* VAULT SECTION */}
           {activeTab === 'vault' && (
             <div className="space-y-10 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-amber-500 drop-shadow-md uppercase tracking-tighter">Personal Vault</h2>
                <div className="bg-black/40 p-8 rounded-[2.5rem] border border-amber-900/30 text-gray-300 font-serif text-lg leading-relaxed italic">
                    The Vault is your personal gallery of forged artifacts. Access it via the 'Studio' tab within your Profile.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-black/50 p-6 rounded-3xl border border-white/5">
                        <span className="text-4xl block mb-4">👤</span>
                        <h4 className="text-white font-retro text-[10px] mb-2 uppercase">Identity</h4>
                        <p className="text-gray-500 text-xs">Profile avatars that represent your spiritual standing and archetype.</p>
                    </div>
                    <div className="bg-black/50 p-6 rounded-3xl border border-white/5">
                        <span className="text-4xl block mb-4">🏞️</span>
                        <h4 className="text-white font-retro text-[10px] mb-2 uppercase">Sanctuary</h4>
                        <p className="text-gray-500 text-xs">Environment artifacts that can be applied sitewide as your personal background.</p>
                    </div>
                    <div className="bg-black/50 p-6 rounded-3xl border border-white/5">
                        <span className="text-4xl block mb-4">📜</span>
                        <h4 className="text-white font-retro text-[10px] mb-2 uppercase">Scripture</h4>
                        <p className="text-gray-500 text-xs">Manifestations of holy verses that serve as medals of your growth.</p>
                    </div>
                </div>
             </div>
           )}

           {/* TV SECTION */}
           {activeTab === 'tv' && (
             <div className="space-y-10 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-red-500 drop-shadow-md uppercase tracking-tighter">Journey TV</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <div className="bg-black/40 p-6 rounded-3xl border border-red-900/30">
                            <h4 className="text-white font-retro text-[10px] mb-2 uppercase">Live Broadcasting</h4>
                            <p className="text-gray-400 text-sm">The community hub for shared worship, sermons, and faith-based lofi. Anyone with 1,000 XP can 'Start a Broadcast'.</p>
                        </div>
                        <div className="bg-black/40 p-6 rounded-3xl border border-red-900/30">
                            <h4 className="text-white font-retro text-[10px] mb-2 uppercase">Sanctuary Chat</h4>
                            <p className="text-gray-400 text-sm">Participate in live fellowship. Chatting during a live broadcast grants small amounts of XP (+5) to encourage community.</p>
                        </div>
                    </div>
                    <div className="bg-black p-6 rounded-3xl border border-white/5 flex items-center justify-center italic text-gray-500 text-sm font-serif">
                        <div className="text-center">
                            <div className="text-6xl mb-4 grayscale opacity-20 animate-pulse">📡</div>
                            "Broadcasting the light across the digital veil."
                        </div>
                    </div>
                </div>
             </div>
           )}

           {/* LORE SECTION */}
           {activeTab === 'lore' && (
             <div className="space-y-10 animate-slide-up">
                <h2 className="text-4xl md:text-7xl font-retro text-stone-400 drop-shadow-md uppercase tracking-tighter">Realms & Lore</h2>
                <div className="space-y-12">
                    <div className="border-l-4 border-yellow-600 pl-6">
                        <h3 className="text-white font-retro text-sm mb-4 uppercase">The 9 Circles of Pilgrim</h3>
                        <p className="text-gray-400 text-base font-serif leading-relaxed italic mb-4">The core journey consists of 9 distinct realms of overcoming. Each represents a fundamental trial of the human soul—from the Valley of Doubt to the Gates of Grace.</p>
                        <div className="flex flex-wrap gap-2">
                            {['Doubt', 'Fear', 'Pride', 'Greed', 'Lust', 'Anger', 'Envy', 'Sloth', 'Sovereignty'].map((realm, i) => (
                                <span key={realm} className="bg-black/40 border border-white/5 px-3 py-1 rounded-full text-[9px] font-mono text-gray-500 uppercase">Circle {i+1}: {realm}</span>
                            ))}
                        </div>
                    </div>
                    
                    <div className="border-l-4 border-blue-600 pl-6">
                        <h3 className="text-white font-retro text-sm mb-4 uppercase">The Davidic Path</h3>
                        <p className="text-gray-400 text-base font-serif leading-relaxed italic">A campaign focusing on the transition from humility to kingship. It explores the themes of giant-slaying, friendship (Jonathan), and repentant leadership.</p>
                    </div>

                    <div className="border-l-4 border-green-600 pl-6">
                        <h3 className="text-white font-retro text-sm mb-4 uppercase">The Pauline Journey</h3>
                        <p className="text-gray-400 text-base font-serif leading-relaxed italic">An odyssey through the Mediterranean, focusing on transformation, resilience, and the birth of the global community of faith.</p>
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
