
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { GAMES, BADGES, ACHIEVEMENTS, PLAYER_LEVELS, ARCHETYPES } from '../constants';
import { AppView, User } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { BarChart, LineChart, DonutChart, ChartDataPoint } from './Charts';

export type WikiTab = 'guide' | 'economy' | 'lore' | 'archetypes' | 'progression' | 'faq' | 'tv' | 'activities' | 'vault' | 'community';

interface WikiViewProps {
  onBack: () => void;
  onNavigate?: (view: AppView) => void;
  user: User | null;
  onUpdateUser?: (user: User) => void;
  onAddPoints?: (points: number) => void;
  initialTab?: WikiTab;
}

interface ArchiveImage {
    name: string;
    url: string;
    type: 'Avatar' | 'Plan';
    createdAt: string;
}

interface ActivityItem {
    id: string;
    username: string;
    avatar: string;
    activity_type: 'levelup' | 'achievement' | 'badge' | 'join' | 'broadcast';
    details: any;
    created_at: string;
}

const WIKI_TABS: { id: WikiTab; label: string; icon: string }[] = [
  { id: 'guide', label: 'Gameplay Guide', icon: '🎮' },
  { id: 'economy', label: 'XP & Rewards', icon: '🪙' },
  { id: 'community', label: 'Community', icon: '🔥' },
  { id: 'tv', label: 'Journey TV', icon: '📺' },
  { id: 'activities', label: 'Spiritual Disciplines', icon: '🧩' },
  { id: 'vault', label: "Personal Vault", icon: '🔐' },
  { id: 'progression', label: 'Global Registry', icon: '⚡' },
  { id: 'lore', label: 'Realms & Lore', icon: '🗺️' },
  { id: 'archetypes', label: 'Archetypes', icon: '🛡️' },
  { id: 'faq', label: 'Support / FAQ', icon: '❓' },
];

const WikiView: React.FC<WikiViewProps> = ({ onBack, onNavigate, user, onUpdateUser, onAddPoints, initialTab = 'guide' }) => {
  const [activeTab, setActiveTab] = useState<WikiTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [archiveImages, setArchiveImages] = useState<ArchiveImage[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  
  // Registry Feed
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (activeTab === 'vault' && user) {
        fetchArchive();
    }
  }, [activeTab, user]);

  const fetchArchive = async () => {
    if (!user) return;
    setLoadingArchive(true);
    const images: ArchiveImage[] = [];
    
    try {
        const { data: avatars } = await supabase.storage.from('journey_assets').list(`avatars/${user.id}`);
        if (avatars) {
            avatars.forEach(file => {
                const { data } = supabase.storage.from('journey_assets').getPublicUrl(`avatars/${user.id}/${file.name}`);
                images.push({ 
                    name: file.name, 
                    url: data.publicUrl, 
                    type: 'Avatar',
                    createdAt: file.created_at || new Date().toISOString()
                });
            });
        }

        const { data: plans } = await supabase.storage.from('journey_assets').list(`plans/${user.id}`);
        if (plans) {
            plans.forEach(file => {
                const { data } = supabase.storage.from('journey_assets').getPublicUrl(`plans/${user.id}/${file.name}`);
                images.push({ 
                    name: file.name, 
                    url: data.publicUrl, 
                    type: 'Plan',
                    createdAt: file.created_at || new Date().toISOString()
                });
            });
        }
    } catch (e) {
        console.error("Error fetching archive:", e);
    }
    
    const isCurrentInList = images.some(img => img.url === user.avatar);
    if (!isCurrentInList && user.avatar) {
        images.unshift({ 
            name: `Current Identity`, 
            url: user.avatar, 
            type: 'Avatar',
            createdAt: new Date().toISOString()
        });
    }

    images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setArchiveImages(images);
    setLoadingArchive(false);
  };

  const handleEquip = async (img: ArchiveImage) => {
      if (!user || !onUpdateUser) return;
      if (!window.confirm("Do you want to restore this avatar?")) return;

      onUpdateUser({ ...user, avatar: img.url });
      try {
          await supabase.from('users').update({ avatar: img.url }).eq('id', user.id);
          alert("Avatar equipped successfully!");
      } catch (e) {
          console.error("Failed to equip avatar", e);
      }
  };

  // Helper for Desktop Sidebar Buttons
  const renderDesktopTabButton = (tab: typeof WIKI_TABS[0]) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`
        w-full text-left p-3 rounded-lg mb-2 flex items-center gap-3 transition-all
        ${activeTab === tab.id 
          ? 'bg-yellow-600 text-white shadow-lg border-l-4 border-white' 
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}
      `}
    >
      <span className="text-xl">{tab.icon}</span>
      <span className="font-retro text-xs uppercase tracking-wider">{tab.label}</span>
    </button>
  );

  // Registry Component
  const RegistryTab = () => {
      const [registryData, setRegistryData] = useState({ users: 0, verses: 0, achievements: 0, loaded: false });
      const [feed, setFeed] = useState<ActivityItem[]>([]);
      const [charts, setCharts] = useState({
          rankDist: [] as ChartDataPoint[],
          activityTrend: [] as ChartDataPoint[],
          activityType: [] as ChartDataPoint[]
      });

      useEffect(() => {
          const load = async () => {
              const [userReq, verseReq, achReq] = await Promise.all([
                    supabase.from('users').select('*', { count: 'exact', head: true }),
                    supabase.from('collected_verses').select('*', { count: 'exact', head: true }),
                    supabase.from('unlocked_achievements').select('*', { count: 'exact', head: true })
              ]);
              
              setRegistryData({
                  users: userReq.count || 0,
                  verses: verseReq.count || 0,
                  achievements: achReq.count || 0,
                  loaded: true
              });

              const { data: usersSample } = await supabase.from('users').select('total_points').limit(500);
              const buckets = { 'Seeker': 0, 'Disciple': 0, 'Guardian': 0, 'Mystic': 0, 'Saint': 0 };
              
              if (usersSample) {
                  usersSample.forEach(u => {
                      const xp = u.total_points || 0;
                      if (xp < 2000) buckets['Seeker']++;
                      else if (xp < 6800) buckets['Disciple']++;
                      else if (xp < 16000) buckets['Guardian']++;
                      else if (xp < 36000) buckets['Mystic']++;
                      else buckets['Saint']++;
                  });
              }

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

              const rankChartData = [
                  { label: 'Seeker', value: buckets['Seeker'], color: '#9ca3af' },
                  { label: 'Disciple', value: buckets['Disciple'], color: '#60a5fa' },
                  { label: 'Guardian', value: buckets['Guardian'], color: '#a855f7' },
                  { label: 'Mystic', value: buckets['Mystic'], color: '#eab308' },
                  { label: 'Saint', value: buckets['Saint'], color: '#ef4444' },
              ];

              const days = [];
              for(let i=6; i>=0; i--) {
                  const d = new Date();
                  d.setDate(d.getDate() - i);
                  days.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
              }
              const trendChartData = days.map(d => ({ label: d, value: trendMap[d] || 0 }));

              const typeChartData = [
                  { label: 'Level Up', value: typeMap['levelup'], color: '#fbbf24' },
                  { label: 'Badge', value: typeMap['badge'], color: '#8b5cf6' },
                  { label: 'Achieve', value: typeMap['achievement'], color: '#10b981' },
                  { label: 'Join', value: typeMap['join'], color: '#3b82f6' },
                  { label: 'Live', value: typeMap['broadcast'], color: '#ef4444' }
              ];

              setCharts({
                  rankDist: rankChartData,
                  activityTrend: trendChartData,
                  activityType: typeChartData
              });

              const { data: feedData } = await supabase
                  .from('activity_feed')
                  .select('*')
                  .order('created_at', { ascending: false })
                  .limit(20);
              
              if (feedData) setFeed(feedData);
          };
          load();

          const sub = supabase.channel('global-feed')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, payload => {
                setFeed(prev => [payload.new as ActivityItem, ...prev].slice(0, 20));
            })
            .subscribe();

          return () => { supabase.removeChannel(sub); };
      }, []);

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
              case 'levelup': return `reached Level ${d.level}: ${d.title}`;
              case 'achievement': return `unlocked achievement: ${d.title}`;
              case 'badge': return `earned the ${d.name} Badge`;
              case 'join': return `joined the pilgrimage`;
              case 'broadcast': return `went live on Journey TV`;
              default: return 'made progress';
          }
      };

      return (
          <div className="space-y-8 animate-fade-in pb-12">
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

              {/* Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 shadow-lg">
                      <h3 className="text-gray-400 text-xs font-bold uppercase mb-4 flex items-center gap-2">
                          <span>📊</span> Pilgrim Rank Distribution
                      </h3>
                      <div className="h-48 w-full">
                          <BarChart data={charts.rankDist} />
                      </div>
                  </div>
                  <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 shadow-lg">
                      <h3 className="text-gray-400 text-xs font-bold uppercase mb-4 flex items-center gap-2">
                          <span>📈</span> Activity Trends (7 Days)
                      </h3>
                      <div className="h-48 w-full">
                          <LineChart data={charts.activityTrend} color="#3b82f6" />
                      </div>
                  </div>
                  <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-700 shadow-lg lg:col-span-2 flex flex-col md:flex-row gap-8 items-center">
                      <div className="w-full md:w-1/3 h-48">
                          <h3 className="text-gray-400 text-xs font-bold uppercase mb-4 text-center">Event Breakdown</h3>
                          <DonutChart data={charts.activityType} />
                      </div>
                      <div className="flex-1 space-y-3 w-full">
                          <h4 className="text-gray-300 font-bold text-sm mb-2">Live Analysis</h4>
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

              {/* Live Feed */}
              <div className="bg-black/30 border border-gray-700 rounded-xl overflow-hidden shadow-2xl">
                  <div className="bg-gray-900 p-3 border-b border-gray-700 flex justify-between items-center">
                      <h3 className="text-white font-retro text-xs uppercase">Live Activity Feed</h3>
                      <span className="text-[10px] text-green-400 animate-pulse">● Live</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto custom-scroll p-2 space-y-2">
                      {feed.length === 0 ? (
                          <div className="text-center text-gray-500 text-xs py-8">Waiting for signals...</div>
                      ) : (
                          feed.map(item => (
                              <div key={item.id} className="flex items-center gap-3 bg-gray-800/50 p-2 rounded border border-gray-700 animate-slide-in hover:bg-gray-800 transition-colors">
                                  <div className="text-xl">{getActivityIcon(item.activity_type)}</div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                          <img src={item.avatar || 'https://image.pollinations.ai/prompt/pixel%20art%20avatar?width=50&height=50&nologo=true'} className="w-4 h-4 rounded-full border border-gray-600" />
                                          <span className="text-yellow-500 font-bold text-xs truncate">{item.username}</span>
                                          <span className="text-gray-500 text-[10px] ml-auto">{new Date(item.created_at).toLocaleTimeString()}</span>
                                      </div>
                                      <p className="text-gray-300 text-xs mt-0.5 truncate">{getActivityText(item)}</p>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] animate-fade-in">
      
      {/* Search & Header Bar */}
      <div className="max-w-6xl w-full mb-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-800 p-4 rounded-xl border-b-4 border-yellow-600 shadow-xl relative z-50">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded flex items-center justify-center text-2xl border-2 border-white shadow-inner">
              📘
            </div>
            <div>
               <h1 className="text-2xl md:text-3xl font-retro text-white leading-none">THE CODEX</h1>
               <p className="text-gray-400 text-xs font-mono mt-1">v4.5 Knowledge Base</p>
            </div>
         </div>

         <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <input 
                 type="text" 
                 placeholder="Search database..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-black border-2 border-gray-600 rounded p-2 pl-8 text-white text-xs font-mono focus:border-yellow-500 outline-none"
               />
               <span className="absolute left-2 top-2 text-gray-500">🔍</span>
            </div>
            <Button onClick={onBack} variant="secondary" className="text-xs px-3 py-2">
              ✖
            </Button>
         </div>
      </div>

      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-4 gap-6 h-full min-h-[600px] relative">
        
        {/* MOBILE SLIDER MENU (Sticky) */}
        <div className="md:hidden col-span-1 sticky top-14 z-40 bg-gray-900/95 backdrop-blur border-b border-yellow-600/30 py-2 -mx-4 px-4 mb-4 shadow-lg">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {WIKI_TABS.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap border text-xs font-bold transition-colors
                        ${activeTab === t.id 
                          ? 'bg-yellow-600 border-yellow-400 text-white shadow-[0_0_10px_rgba(234,179,8,0.3)]' 
                          : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}
                      `}
                    >
                      <span>{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* DESKTOP SIDEBAR (Hidden on Mobile) */}
        <div className="hidden md:block md:col-span-1 bg-gray-900/50 p-4 rounded-xl border-2 border-gray-700 h-fit sticky top-24">
           <h3 className="text-gray-500 text-[10px] font-mono uppercase mb-4 ml-2">Categories</h3>
           <nav>
             {WIKI_TABS.map(tab => renderDesktopTabButton(tab))}
           </nav>

           <div className="mt-8 bg-blue-900/20 p-4 rounded border border-blue-800/50">
             <h4 className="text-blue-400 text-xs font-bold mb-2">New Feature!</h4>
             <p className="text-gray-400 text-[10px] italic">
               "Join a <strong>Fellowship</strong> or start your own Ministry in the new Community tab."
             </p>
           </div>
        </div>

        {/* Main Content Area */}
        <div className="md:col-span-3 bg-gray-800 p-6 md:p-8 rounded-xl border-2 border-gray-700 shadow-2xl relative overflow-hidden">
           
           {/* Background Decoration */}
           <div className="absolute top-0 right-0 p-32 bg-yellow-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

           {/* TAB: GUIDE */}
           {activeTab === 'guide' && (
             <div className="space-y-8 animate-fade-in">
                <div>
                   <h2 className="text-3xl font-retro text-yellow-400 mb-4">The Pilgrim's Handbook</h2>
                   <p className="text-gray-300 font-serif text-lg leading-relaxed">
                     The Journey is a spiritual exercise disguised as a game. Your goal is to align your heart with the lesson God is teaching the character.
                   </p>
                </div>

                <div className="bg-gray-900/50 p-6 rounded-lg border-2 border-gray-600">
                    <h3 className="text-white font-bold mb-4 border-b border-gray-700 pb-2">Core Gameplay Loop</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/30 p-4 rounded border-l-4 border-green-500">
                            <h4 className="text-white font-bold mb-1 text-sm">1. The Encounter</h4>
                            <p className="text-xs text-gray-400">
                                You step into a biblical figure's shoes. The AI Guide sets the scene. Read the context carefully.
                            </p>
                        </div>
                        <div className="bg-black/30 p-4 rounded border-l-4 border-blue-500">
                            <h4 className="text-white font-bold mb-1 text-sm">2. The Response</h4>
                            <p className="text-xs text-gray-400">
                                Type your response naturally. Speak from the heart. Admit fear, ask for help, or quote scripture.
                            </p>
                        </div>
                        <div className="bg-black/30 p-4 rounded border-l-4 border-purple-500">
                            <h4 className="text-white font-bold mb-1 text-sm">3. The Interaction</h4>
                            <p className="text-xs text-gray-400">
                                Explore the 3D scene. Hover over blocks. Some hold hidden clues or audio cues.
                            </p>
                        </div>
                        <div className="bg-black/30 p-4 rounded border-l-4 border-yellow-500">
                            <h4 className="text-white font-bold mb-1 text-sm">4. The Revelation</h4>
                            <p className="text-xs text-gray-400">
                                Demonstrate the target Virtue (e.g., Faith) to clear the level and unlock a Collectible Verse.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Feature Manual */}
                <div>
                    <h3 className="text-2xl font-retro text-blue-400 mb-4">Feature Manual</h3>
                    <div className="space-y-4">
                        <details className="bg-gray-900 border border-gray-700 rounded-lg group">
                            <summary className="p-4 cursor-pointer font-bold text-white flex justify-between items-center">
                                <span>📖 How to use the Bible Reader</span>
                                <span className="text-yellow-500">+</span>
                            </summary>
                            <div className="p-4 pt-0 text-sm text-gray-300 border-t border-gray-700 mt-2">
                                <p className="mb-2">The Bible Reader allows you to study scripture without leaving the app.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Select Version (WEB, KJV, etc.) from the top menu.</li>
                                    <li>Navigate books and chapters using the controls.</li>
                                    <li><strong>Pro Tip:</strong> Click any verse to share it or save it directly to your Personal Journal.</li>
                                </ul>
                            </div>
                        </details>

                        <details className="bg-gray-900 border border-gray-700 rounded-lg group">
                            <summary className="p-4 cursor-pointer font-bold text-white flex justify-between items-center">
                                <span>🌱 How to Create Custom Plans</span>
                                <span className="text-yellow-500">+</span>
                            </summary>
                            <div className="p-4 pt-0 text-sm text-gray-300 border-t border-gray-700 mt-2">
                                <p className="mb-2">Go to the <strong>Plans</strong> section and select the 'Create' tab.</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Enter a topic (e.g., "Overcoming Anxiety").</li>
                                    <li>Set the duration (3-30 days).</li>
                                    <li>The AI will generate a daily schedule of scriptures and prayer focuses unique to you.</li>
                                </ul>
                            </div>
                        </details>

                        <details className="bg-gray-900 border border-gray-700 rounded-lg group">
                            <summary className="p-4 cursor-pointer font-bold text-white flex justify-between items-center">
                                <span>🎨 How to use Avatar Studio (NFTs)</span>
                                <span className="text-yellow-500">+</span>
                            </summary>
                            <div className="p-4 pt-0 text-sm text-gray-300 border-t border-gray-700 mt-2">
                                <p className="mb-2">Unlock the Avatar Studio by reaching Level 5 (5,000 XP).</p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Select a 'Protocol' (Style Tier).</li>
                                    <li>Click Generate to forge a new identity. This creates a unique image stored in your <strong>Forged Collection</strong>.</li>
                                    <li><strong>Cost:</strong> 1000 XP per generation.</li>
                                </ul>
                            </div>
                        </details>
                    </div>
                </div>
             </div>
           )}

           {/* TAB: ECONOMY / XP SYSTEM */}
           {activeTab === 'economy' && (
             <div className="space-y-8 animate-fade-in">
                <div>
                   <h2 className="text-3xl font-retro text-green-400 mb-4">The Spirit Economy</h2>
                   <p className="text-gray-300 font-serif text-lg leading-relaxed">
                     Spirit Points (XP) measure your engagement and spiritual discipline. Earning XP unlocks new titles, avatar styles, and community prestige.
                   </p>
                </div>

                {/* Earning Table */}
                <div className="bg-gray-900 border-2 border-gray-600 rounded-xl overflow-hidden">
                    <div className="bg-gray-800 p-3 border-b border-gray-600 flex justify-between items-center">
                        <h3 className="font-bold text-white uppercase tracking-wider text-sm">Earning Rates</h3>
                        <span className="text-xs text-gray-400 italic">Daily Limit: 1000 XP</span>
                    </div>
                    <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-gray-700">
                            <tr className="hover:bg-gray-800">
                                <td className="p-3 text-yellow-500 font-mono">10 XP</td>
                                <td className="p-3 text-gray-300">Daily Login</td>
                            </tr>
                            <tr className="hover:bg-gray-800">
                                <td className="p-3 text-yellow-500 font-mono">125+ XP</td>
                                <td className="p-3 text-gray-300">Clearing a Level <span className="text-gray-500 text-xs">(Scale: 100 + 25 per level)</span></td>
                            </tr>
                            <tr className="hover:bg-gray-800">
                                <td className="p-3 text-yellow-500 font-mono">5 - 10 XP</td>
                                <td className="p-3 text-gray-300">Social Interactions (Like, Pray, Share)</td>
                            </tr>
                            <tr className="hover:bg-gray-800">
                                <td className="p-3 text-yellow-500 font-mono">50 XP</td>
                                <td className="p-3 text-gray-300">Complete Reading Plan Day</td>
                            </tr>
                            <tr className="hover:bg-gray-800">
                                <td className="p-3 text-yellow-500 font-mono">100 XP</td>
                                <td className="p-3 text-gray-300">Master a Discipline (Activity)</td>
                            </tr>
                            <tr className="hover:bg-gray-800">
                                <td className="p-3 text-green-400 font-mono font-bold">500 XP</td>
                                <td className="p-3 text-gray-300">Refer a Friend (Pilgrim joins via your link)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Marketplace Mechanics */}
                <div className="bg-purple-900/20 border border-purple-500/30 p-6 rounded-xl">
                    <h3 className="font-retro text-purple-400 text-lg mb-2">Avatar Marketplace & XP Infusion</h3>
                    <p className="text-sm text-gray-300 mb-3">
                        Trade unique identities with other pilgrims.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-400">
                        <li><strong>Selling Rules:</strong> You can list any avatar from your Vault, provided you own at least <strong>two</strong> avatars (you must always keep one default identity).</li>
                        <li><strong>XP Infusion:</strong> Sellers can inject their own XP into an avatar to increase its value. This XP is deducted from the seller and transferred to the buyer upon purchase.</li>
                        <li><strong>Buying:</strong> When you buy an avatar, you receive the item PLUS any infused XP attached to it.</li>
                        <li><strong>Formula:</strong> New XP = Your XP - Price + <span className="text-yellow-500">Attached XP</span></li>
                    </ul>
                </div>

                {/* Spending */}
                <div className="bg-red-900/10 border border-red-500/30 p-6 rounded-xl">
                    <h3 className="font-retro text-red-400 text-lg mb-2">Spending Spirit Points</h3>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
                        <li>
                            <span className="text-white font-bold">Avatar Studio:</span> Cost <span className="text-red-300">1000 XP</span> to generate a new AI identity.
                        </li>
                        <li>
                            <span className="text-white font-bold">Custom Plans:</span> Cost <span className="text-red-300">50 XP</span> to forge a personalized reading schedule.
                        </li>
                        <li>
                            <span className="text-white font-bold">TV Broadcast:</span> Cost <span className="text-red-300">1000 XP</span> to share a video with the community.
                        </li>
                        <li>
                            <span className="text-white font-bold">Create Ministry:</span> Cost <span className="text-red-300">500 XP</span> to found a new group.
                        </li>
                    </ul>
                </div>
             </div>
           )}

           {/* TAB: COMMUNITY */}
           {activeTab === 'community' && (
             <div className="space-y-8 animate-fade-in">
                <div className="relative rounded-xl overflow-hidden border-4 border-yellow-600 shadow-2xl bg-black">
                   <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10"></div>
                   <img src="https://image.pollinations.ai/prompt/pixel%20art%20community%20bonfire%20gathering%20night%20stars?width=800&height=300&nologo=true" className="w-full h-48 object-cover opacity-60" />
                   <div className="absolute bottom-0 left-0 p-6 z-20">
                      <h2 className="text-3xl md:text-4xl font-retro text-white mb-2 text-shadow-md">THE FELLOWSHIP</h2>
                      <p className="text-yellow-300 font-mono text-sm">Where two or three are gathered.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-4">Why Join?</h3>
                        <ul className="space-y-3 text-sm text-gray-300">
                            <li className="flex gap-2 items-start">
                                <span className="text-green-400">⚡</span>
                                <span><strong>Shared XP:</strong> Belonging to a group boosts your spiritual growth stats.</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <span className="text-yellow-400">🛡️</span>
                                <span><strong>Accountability:</strong> Walk with others who share your specific mission or burden.</span>
                            </li>
                            <li className="flex gap-2 items-start">
                                <span className="text-blue-400">💬</span>
                                <span><strong>Private Channels:</strong> (Coming Soon) Dedicated chat spaces for your group.</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div className="bg-gray-900 p-4 rounded-lg border border-gray-600">
                        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Group Types</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-purple-300">⛪ Church</span>
                                <span className="text-gray-500">Official church bodies</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-blue-300">🔥 Fellowship</span>
                                <span className="text-gray-500">Casual gathering of believers</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-green-300">🌱 Study Group</span>
                                <span className="text-gray-500">Focused bible study</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-red-300">⛵ Mission</span>
                                <span className="text-gray-500">Specific outreach goal</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-900/20 p-6 rounded-xl border border-yellow-600/30 text-center">
                   <h3 className="font-retro text-yellow-500 mb-2">Start a Ministry</h3>
                   <p className="text-gray-400 text-sm mb-4">
                      Create your own group, invite friends with your referral code, and lead the way.
                   </p>
                   {onNavigate && (
                     <button 
                       onClick={() => onNavigate(AppView.COMMUNITY)}
                       className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded transition-colors shadow-lg"
                     >
                       Find or Create a Group →
                     </button>
                   )}
                </div>
             </div>
           )}

           {/* TAB: JOURNEY TV */}
           {activeTab === 'tv' && (
             <div className="space-y-8 animate-fade-in">
                <div className="relative rounded-xl overflow-hidden border-4 border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]">
                   <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10"></div>
                   <img src="https://image.pollinations.ai/prompt/pixel%20art%20tv%20studio%20broadcast%20christian?width=800&height=300&nologo=true" className="w-full h-48 object-cover opacity-60" />
                   <div className="absolute bottom-0 left-0 p-6 z-20">
                      <h2 className="text-3xl md:text-4xl font-retro text-white mb-2 text-shadow-md">JOURNEY TV</h2>
                      <p className="text-red-300 font-mono text-sm">Broadcast Your Faith.</p>
                   </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1">
                        <h3 className="text-2xl font-bold text-white mb-4">Now Broadcasting</h3>
                        <p className="text-gray-300 leading-relaxed font-serif text-sm mb-4">
                            Journey TV is a community-driven streaming platform. Pilgrims can share YouTube, Twitch, Vimeo, or TikTok links to edify the body of Christ.
                        </p>
                        <div className="bg-red-900/20 p-4 rounded border-l-4 border-red-500 mb-4">
                            <h4 className="text-red-400 font-bold text-sm mb-1">🔴 Live Features</h4>
                            <ul className="list-disc pl-4 text-xs text-gray-400 space-y-1">
                                <li><strong>Global Chat:</strong> Real-time fellowship with viewers.</li>
                                <li><strong>XP Rewards:</strong> Earn points for broadcasting and watching.</li>
                                <li><strong>Trending:</strong> Top-liked videos get featured on the main stage.</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div className="w-full md:w-64 shrink-0 bg-gray-900 p-4 rounded-xl border border-gray-700">
                        <h4 className="text-gray-400 text-xs font-bold uppercase mb-3">Channels</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {['Live', 'Worship', 'Sermons', 'Music', 'Lofi', 'Events'].map(cat => (
                                <div key={cat} className="bg-black/50 p-2 rounded text-center text-xs text-gray-300 border border-gray-800">
                                    {cat}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-black p-6 rounded-xl border-2 border-red-900 text-center">
                   <h3 className="font-retro text-white mb-2">GO ON AIR</h3>
                   <p className="text-gray-500 text-sm mb-6">Have a sermon, song, or testimony to share?</p>
                   
                   {onNavigate ? (
                     <button 
                       onClick={() => onNavigate(AppView.TV)}
                       className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded shadow-[0_0_15px_rgba(220,38,38,0.6)] hover:shadow-[0_0_25px_rgba(220,38,38,0.8)] transition-all transform hover:scale-105 font-retro"
                     >
                       START BROADCAST
                     </button>
                   ) : (
                     <div className="text-red-500">TV Module Unavailable</div>
                   )}
                </div>
             </div>
           )}

           {/* TAB: ACTIVITIES */}
           {activeTab === 'activities' && (
             <div className="space-y-8 animate-fade-in">
                <div className="relative rounded-xl overflow-hidden border-4 border-green-600 shadow-[0_0_30px_rgba(34,197,94,0.3)] bg-gray-900">
                   <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10"></div>
                   <img src="https://image.pollinations.ai/prompt/pixel%20art%20bible%20study%20group%20outdoor?width=800&height=300&nologo=true" className="w-full h-48 object-cover opacity-60" />
                   <div className="absolute bottom-0 left-0 p-6 z-20">
                      <h2 className="text-3xl md:text-4xl font-retro text-white mb-2 text-shadow-md">DISCIPLINES</h2>
                      <p className="text-green-300 font-mono text-sm">Interactive Spiritual Training</p>
                   </div>
                </div>

                <div className="bg-green-900/10 border border-green-500/30 p-4 rounded-lg flex items-start gap-3">
                    <span className="text-2xl">🎓</span>
                    <div>
                        <h3 className="text-green-400 font-bold text-sm">Mastery Bonus</h3>
                        <p className="text-gray-400 text-xs">
                            Complete all 4 disciplines to earn the unique <strong>Disciple of Practice</strong> badge and a large XP bonus.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Activity 1 */}
                   <div className="bg-gray-900 border border-gray-600 p-6 rounded-lg hover:border-yellow-500 transition-colors flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                         <span className="text-3xl">🕯️</span>
                         <h3 className="text-xl font-bold text-white font-serif">Lectio Divina</h3>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 flex-grow">
                        "Divine Reading" - A traditional monastic practice of scriptural reading, meditation and prayer intended to promote communion with God.
                      </p>
                   </div>

                   {/* Activity 2 */}
                   <div className="bg-gray-900 border border-gray-600 p-6 rounded-lg hover:border-yellow-500 transition-colors flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                         <span className="text-3xl">🗺️</span>
                         <h3 className="text-xl font-bold text-white font-serif">Verse Mapping</h3>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 flex-grow">
                        Deconstruct a verse to understand its deeper meaning, history, and context using Hebrew/Greek definitions.
                      </p>
                   </div>

                   {/* Activity 3 */}
                   <div className="bg-gray-900 border border-gray-600 p-6 rounded-lg hover:border-yellow-500 transition-colors flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                         <span className="text-3xl">🚶</span>
                         <h3 className="text-xl font-bold text-white font-serif">Prayer Walk</h3>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 flex-grow">
                        Intercede for your community while physically walking through it. Mark your path with prayer.
                      </p>
                   </div>

                   {/* Activity 4 */}
                   <div className="bg-gray-900 border border-gray-600 p-6 rounded-lg hover:border-yellow-500 transition-colors flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-3">
                         <span className="text-3xl">🧩</span>
                         <h3 className="text-xl font-bold text-white font-serif">Scripture Scavenger Hunt</h3>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 flex-grow">
                        Find objects in your home that represent biblical truths. Great for families!
                      </p>
                   </div>
                </div>

                <div className="bg-teal-900/20 p-6 rounded-xl border border-teal-500/30 text-center mt-6">
                   <h3 className="text-teal-300 font-retro mb-2">Ready to Practice?</h3>
                   <p className="text-gray-400 text-sm mb-4">
                      Enter the interactive simulation to log your progress.
                   </p>
                   {onNavigate && (
                     <button 
                       onClick={() => onNavigate(AppView.ACTIVITIES)}
                       className="bg-teal-700 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded transition-colors shadow-lg animate-pulse"
                     >
                       START TRAINING
                     </button>
                   )}
                </div>
             </div>
           )}

           {/* TAB: VAULT */}
           {activeTab === 'vault' && (
             <div className="space-y-8 animate-fade-in h-full flex flex-col">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-retro text-yellow-400 mb-2">Personal Vault</h2>
                        <p className="text-gray-300 text-sm">
                            Your generated assets, avatars, and plans. Stored securely.
                        </p>
                    </div>
                    <div className="bg-yellow-900/30 border border-yellow-500 px-3 py-1 rounded text-[10px] text-yellow-300 font-mono">
                        PRIVATE STORAGE
                    </div>
                </div>

                {!user ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-700 rounded-xl p-8">
                        <span className="text-4xl mb-4">🔒</span>
                        <p className="text-gray-400 font-serif">Login to access your personal vault.</p>
                    </div>
                ) : loadingArchive ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <span className="text-yellow-500 text-xl animate-pulse font-mono">Retrieving assets...</span>
                    </div>
                ) : archiveImages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-700 rounded-xl p-8">
                        <span className="text-4xl mb-4">🕸️</span>
                        <p className="text-gray-400 font-serif">Your vault is empty. Generate an avatar or plan to start collecting.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto max-h-[500px] pr-2 custom-scroll">
                        {archiveImages.map((img, idx) => {
                            const isEquipped = img.url === user.avatar;
                            
                            return (
                            <div key={idx} className={`bg-black p-2 rounded border transition-colors group relative ${isEquipped ? 'border-yellow-500' : 'border-gray-700 hover:border-blue-500'}`}>
                                <div className="aspect-square overflow-hidden rounded bg-gray-900 mb-2 relative">
                                    <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    {isEquipped && (
                                        <div className="absolute inset-0 bg-yellow-500/20 flex items-center justify-center">
                                            <span className="bg-black/80 text-yellow-500 text-[9px] px-2 py-1 rounded border border-yellow-500">EQUIPPED</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-mono text-gray-400 truncate w-20">
                                        {new Date(img.createdAt).toLocaleDateString()}
                                    </span>
                                    <span className={`text-[9px] px-1.5 rounded font-bold uppercase ${img.type === 'Avatar' ? 'bg-blue-900 text-blue-200' : 'bg-green-900 text-green-200'}`}>
                                        {img.type}
                                    </span>
                                </div>
                                
                                {img.type === 'Avatar' && !isEquipped && onUpdateUser && (
                                    <button 
                                        onClick={() => handleEquip(img)}
                                        className="w-full mt-1 bg-gray-800 hover:bg-blue-700 text-white text-[9px] py-1 rounded uppercase font-bold transition-colors"
                                    >
                                        Equip
                                    </button>
                                )}

                                {img.type === 'Avatar' && (
                                    <div className="w-full mt-1 text-center">
                                        <button 
                                            disabled={true} 
                                            className="w-full bg-gray-900 text-gray-500 text-[8px] py-1 rounded uppercase font-bold border border-gray-800 cursor-not-allowed"
                                            title="Coming Soon"
                                        >
                                            Mint (Phase 2)
                                        </button>
                                    </div>
                                )}

                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="bg-black/50 text-white p-1 rounded pointer-events-auto">
                                        <a href={img.url} target="_blank" rel="noopener noreferrer">↗️</a>
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                )}
                
                <div className="bg-gray-900 p-4 rounded border border-gray-600 flex justify-between items-center">
                   <p className="text-xs text-gray-400">Want to see the community gallery?</p>
                   {onNavigate && (
                     <button onClick={() => onNavigate(AppView.ARCHIVE)} className="text-yellow-500 text-xs hover:underline">Go to Pilgrim's Archive →</button>
                   )}
                </div>
             </div>
           )}

           {/* TAB: LORE */}
           {activeTab === 'lore' && (
             <div className="space-y-6 animate-fade-in">
                <h2 className="text-3xl font-retro text-yellow-400 mb-6">The Realms</h2>
                
                {GAMES.map(game => (
                  <div key={game.id} className="flex flex-col md:flex-row gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                     <div className="w-full md:w-32 h-32 bg-black rounded overflow-hidden shrink-0">
                        <img src={game.image} className="w-full h-full object-cover opacity-80" />
                     </div>
                     <div>
                        <h3 className="text-xl text-white font-retro mb-1">{game.title}</h3>
                        <p className="text-sm text-gray-300 font-serif mb-3">{game.description}</p>
                        <div className="flex gap-2">
                           <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-1 rounded">
                             {game.levels.length} Chapters
                           </span>
                           <span className="text-[10px] bg-purple-900 text-purple-200 px-2 py-1 rounded">
                             Difficulty: Normal
                           </span>
                        </div>
                     </div>
                  </div>
                ))}

                <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded">
                   <h3 className="font-retro text-yellow-500 text-sm mb-2">THE BACKSTORY</h3>
                   <p className="text-xs text-yellow-200/80 font-mono leading-relaxed">
                      "In the digital age, the ancient texts became fragmented data. The Journey Project was initiated to reconstruct the spiritual history of humanity within the Digital Realm. We are the digital pilgrims, re-walking the paths of the ancients to recover the lost code of the soul."
                   </p>
                </div>
             </div>
           )}

           {/* TAB: ARCHETYPES */}
           {activeTab === 'archetypes' && (
             <div className="animate-fade-in">
                <h2 className="text-3xl font-retro text-yellow-400 mb-6">Character Archetypes</h2>
                <p className="text-gray-300 mb-6">
                  Your identity in the Journey affects how you are perceived in the community.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {ARCHETYPES.map((arch) => (
                      <div key={arch.name} className="flex items-center gap-4 bg-gray-900 p-3 rounded border border-gray-700 hover:border-yellow-500 transition-colors">
                         <div className="text-3xl bg-black w-12 h-12 flex items-center justify-center rounded-full border border-gray-600">
                           {arch.icon}
                         </div>
                         <div>
                            <h4 className="text-white font-bold font-serif">{arch.name}</h4>
                            <span className="text-[10px] uppercase text-yellow-600 tracking-wider font-bold block mb-1">{arch.role}</span>
                            <p className="text-xs text-gray-400">{arch.desc}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
           )}

           {/* TAB: PROGRESSION (Global Registry + Levels) */}
           {activeTab === 'progression' && (
             // Render the enhanced Registry component
             <RegistryTab />
           )}

           {/* TAB: FAQ */}
           {activeTab === 'faq' && (
             <div className="animate-fade-in space-y-6">
                <h2 className="text-3xl font-retro text-red-400 mb-6">Support & FAQ</h2>

                <div className="space-y-4">
                   <div className="bg-gray-900 p-4 rounded border-l-2 border-gray-500">
                      <h4 className="text-white font-bold text-sm">Is this app free?</h4>
                      <p className="text-gray-400 text-xs mt-1">Yes! The core journey is completely free. We use a "Simulation Mode" if no API key is provided, or you can connect your own.</p>
                   </div>
                   <div className="bg-gray-900 p-4 rounded border-l-2 border-gray-500">
                      <h4 className="text-white font-bold text-sm">How do I save progress?</h4>
                      <p className="text-gray-400 text-xs mt-1">Progress is saved automatically to your device's local storage. Do not clear your browser cache if you want to keep your save.</p>
                   </div>
                   <div className="bg-gray-900 p-4 rounded border-l-2 border-gray-500">
                      <h4 className="text-white font-bold text-sm">Can I play offline?</h4>
                      <p className="text-gray-400 text-xs mt-1">Yes, the Simulation Mode works without an internet connection once the app is loaded.</p>
                   </div>
                </div>

                <div className="mt-8 bg-blue-900/30 p-6 rounded-xl border-2 border-blue-500 text-center">
                   <h3 className="font-retro text-white mb-2">Still need help?</h3>
                   <p className="text-sm text-blue-200 mb-4">Our prayer team and support staff are available.</p>
                   
                   <div className="flex flex-col items-center gap-4">
                       {onNavigate && (
                         <button 
                           onClick={() => onNavigate(AppView.SUPPORT)}
                           className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded transition-colors w-full md:w-auto"
                         >
                           Open Support Ticket
                         </button>
                       )}
                       
                       <div className="text-sm text-gray-400">
                           Or email us directly at: <br/>
                           <a 
                             href="mailto:journeyappmedia@gmail.com"
                             className="text-yellow-500 hover:text-yellow-400 font-mono mt-1 inline-block"
                           >
                             journeyappmedia@gmail.com
                           </a>
                       </div>
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
