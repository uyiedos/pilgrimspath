
import React, { useState, useEffect, useMemo } from 'react';
import Button from './Button';
import { User, Community, CommunityType, CommunityPost, CommunityComment, PostType } from '../types';
import { supabase } from '../lib/supabase';
import { LanguageCode, UI_TEXT } from '../translations';
import { AudioSystem } from '../utils/audio';

interface CommunityViewProps {
  user: User | null;
  onBack: () => void;
  language: LanguageCode;
  onAddPoints: (amount: number) => void;
  onUnlockAchievement?: (id: string) => void;
  onConvertGuest?: () => void;
  spendPoints?: (amount: number) => Promise<boolean>;
  initialCommunityId?: string | null;
}

const CommunityView: React.FC<CommunityViewProps> = ({ user, onBack, language, onAddPoints, onUnlockAchievement, onConvertGuest, spendPoints, initialCommunityId }) => {
  const [activeTab, setActiveTab] = useState<'find' | 'my' | 'create'>('find');
  const [innerTab, setInnerTab] = useState<'sanctuary' | 'altar' | 'treasury' | 'elders'>('sanctuary');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedCommunity, setSelectedCommunity] = useState<any | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<PostType>('general');
  const [isTithing, setIsTithing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [titheAmount, setTitheAmount] = useState(100);

  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT[language][key] || UI_TEXT['en'][key];

  useEffect(() => {
    fetchCommunities();
    if (user) fetchMyCommunities();
  }, [user]);

  // Handle Deep Linking
  useEffect(() => {
      if (initialCommunityId) {
          const fetchSpecific = async () => {
              const { data } = await supabase.from('communities').select('*').eq('id', initialCommunityId).single();
              if (data) setSelectedCommunity(data);
          };
          fetchSpecific();
      }
  }, [initialCommunityId]);

  useEffect(() => {
      if (selectedCommunity) {
          fetchPosts(selectedCommunity.id);
      }
  }, [selectedCommunity, innerTab]);

  const fetchCommunities = async () => {
    setLoading(true);
    const { data } = await supabase.from('communities').select('*').order('level', { ascending: false });
    if (data) setCommunities(data);
    setLoading(false);
  };

  const fetchMyCommunities = async () => {
    if (!user || user.id.startsWith('offline-')) return;
    const { data } = await supabase.from('community_members').select('community_id, communities(*)').eq('user_id', user.id);
    if (data) setMyCommunities(data.map((item: any) => item.communities));
  };

  const fetchPosts = async (communityId: string) => {
      let query = supabase
        .from('community_posts')
        .select(`*, users:user_id (username, avatar), community_post_likes!left(user_id)`)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (innerTab === 'altar') {
          query = query.eq('type', 'prayer');
      }

      const { data } = await query;
      if (data) {
          setPosts(data.map((p: any) => ({
              ...p,
              has_liked: user ? p.community_post_likes.some((l: any) => l.user_id === user.id) : false
          })));
      }
  };

  const handleCreatePost = async () => {
      if (!user) return alert("You must be signed in to post.");
      if (user.id.startsWith('offline-')) { onConvertGuest?.(); return; }
      if (!selectedCommunity || !newPostContent.trim()) return;

      setIsPosting(true);
      try {
          const { data, error } = await supabase.from('community_posts').insert({
              community_id: selectedCommunity.id,
              user_id: user.id,
              content: newPostContent.trim(),
              type: newPostType
          }).select('*, users:user_id (username, avatar), community_post_likes!left(user_id)').single();

          if (error) throw error;

          if (data) {
              setPosts([data, ...posts]);
              setNewPostContent('');
              AudioSystem.playMessage();
              alert("Message Scribed Successfully ✓");
          }
      } catch (e: any) {
          alert("Failed to scribe message: " + e.message);
      } finally {
          setIsPosting(false);
      }
  };

  // Helper for Reward Logic
  const processShareReward = async (activityType: string, detailName: string) => {
      if (!user || user.id.startsWith('offline-')) return;

      const todayStr = new Date().toISOString().split('T')[0];
      const storageKey = `journey_last_share_${activityType}_${user.id}`;
      const lastShare = localStorage.getItem(storageKey);

      if (lastShare !== todayStr) {
          // Grant Reward
          onAddPoints(20); // Community Share Reward
          if (onUnlockAchievement) onUnlockAchievement('evangelist');
          
          // Log to Supabase
          supabase.from('activity_feed').insert({
              user_id: user.id,
              activity_type: 'share',
              details: { 
                  target: activityType, 
                  name: detailName,
                  reward: 20 
              }
          }).then(() => console.log("Community Share Logged"));

          localStorage.setItem(storageKey, todayStr);
          AudioSystem.playAchievement();
          alert("Shared! +20 XP Bonus earned.");
      }
  };

  const handleShareCommunity = async () => {
      if (!selectedCommunity) return;
      AudioSystem.playVoxelTap();

      const shareUrl = `${window.location.origin}${window.location.pathname}?community_id=${selectedCommunity.id}`;
      const shareText = `Join the ${selectedCommunity.name} Fellowship on The Journey!\nLevel ${selectedCommunity.level || 1} | ${selectedCommunity.member_count} Pilgrims`;

      let shared = false;
      if (navigator.share) {
          try {
              await navigator.share({
                  title: selectedCommunity.name,
                  text: shareText,
                  url: shareUrl
              });
              shared = true;
          } catch (e) { console.log('Share cancelled'); }
      }

      if (!shared) {
          try {
              await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
              alert("Community Invite Link copied to clipboard!");
              shared = true;
          } catch (e) { alert("Failed to copy."); }
      }

      if (shared) {
          processShareReward('community', selectedCommunity.name);
      }
  };

  const handleSharePost = async (post: CommunityPost) => {
      AudioSystem.playVoxelTap();
      // For posts, we share the community link but with post context in text
      const shareUrl = `${window.location.origin}${window.location.pathname}?community_id=${selectedCommunity.id}`;
      const shareText = `"${post.content}"\n- ${post.users?.username} in ${selectedCommunity.name}\n\nThe Journey App`;

      let shared = false;
      if (navigator.share) {
          try {
              await navigator.share({
                  title: `Post by ${post.users?.username}`,
                  text: shareText,
                  url: shareUrl
              });
              shared = true;
          } catch (e) { console.log('Share cancelled'); }
      }

      if (!shared) {
          try {
              await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
              alert("Post content copied to clipboard!");
              shared = true;
          } catch (e) { alert("Failed to copy."); }
      }

      if (shared) {
          processShareReward('post', `Post by ${post.users?.username}`);
      }
  };

  const handleTithe = async () => {
      if (!user || !selectedCommunity) return;
      if (user.id.startsWith('offline-')) { onConvertGuest?.(); return; }
      
      setIsTithing(true);
      try {
          const { data, error } = await supabase.rpc('tithe_to_community', {
              p_user_id: user.id,
              p_community_id: selectedCommunity.id,
              p_amount: titheAmount
          });

          if (error || !data) throw new Error("XP Sacrifice rejected.");

          AudioSystem.playLevelComplete();
          alert(` XP TITHED: The ${selectedCommunity.name} treasury has been strengthened.`);
          onAddPoints(0); // Refresh XP display
          // Refresh community data
          const { data: updated } = await supabase.from('communities').select('*').eq('id', selectedCommunity.id).single();
          if (updated) setSelectedCommunity(updated);
          await supabase.rpc('sync_community_level', { p_community_id: selectedCommunity.id });
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsTithing(false);
      }
  };

  const handleJoin = async (community: Community) => {
    if (!user) return;
    if (user.id.startsWith('offline-')) { onConvertGuest?.(); return; }
    await supabase.from('community_members').insert({ community_id: community.id, user_id: user.id });
    AudioSystem.playAchievement();
    fetchMyCommunities();
  };

  const getLevelColor = (level: number) => {
      if (level >= 10) return 'text-purple-400 border-purple-500';
      if (level >= 5) return 'text-yellow-500 border-yellow-600';
      return 'text-blue-400 border-blue-500';
  };

  return (
    <div className="min-h-screen p-2 pt-16 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20holy%20landscape%20misty%20temple?width=1200&height=800&nologo=true')] bg-cover bg-fixed bg-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        
        <div className="relative z-10 w-full max-w-6xl">
            {selectedCommunity ? (
                <div className="animate-fade-in space-y-6">
                    {/* ENHANCED COMMUNITY HEADER */}
                    <div className="bg-black/60 backdrop-blur-3xl border-4 border-white/10 p-6 md:p-10 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                            <span className="text-9xl grayscale">🔥</span>
                        </div>
                        
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="relative group">
                                <img src={selectedCommunity.image} className="w-24 h-24 md:w-36 md:h-36 rounded-[2rem] border-4 border-yellow-500 shadow-2xl transform group-hover:scale-105 transition-transform" />
                                <div className={`absolute -bottom-2 -right-2 bg-black border-2 ${getLevelColor(selectedCommunity.level || 1)} px-3 py-1 rounded-full font-retro text-xs shadow-xl`}>
                                    LVL {selectedCommunity.level || 1}
                                </div>
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-6xl font-retro text-white drop-shadow-2xl uppercase tracking-tighter">{selectedCommunity.name}</h1>
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="text-yellow-400 font-retro text-[9px] uppercase tracking-[0.2em]">{selectedCommunity.type}</span>
                                    
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                                    <span className="text-gray-400 font-mono text-[10px] uppercase tracking-widest">{selectedCommunity.member_count} Pilgrims</span>
                                    
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                                    <button 
                                      onClick={handleShareCommunity} 
                                      className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 border border-blue-500/50 px-3 py-1 rounded-full transition-all active:scale-95 group"
                                    >
                                        <span className="text-sm group-hover:animate-bounce">↗</span> 
                                        <span className="font-retro text-[9px] uppercase tracking-wider">Share</span>
                                    </button>

                                    <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                                    <span className="text-green-400 font-mono text-[10px] uppercase tracking-widest">{selectedCommunity.treasury_balance?.toLocaleString()} XP</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 relative z-10">
                            <Button onClick={() => setSelectedCommunity(null)} variant="secondary" className="px-8 py-3 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10">← LEAVE SANCTUARY</Button>
                            <Button onClick={onBack} variant="secondary" className="px-8 py-2 rounded-2xl text-[10px] bg-black/40 border-white/5">🏠 HOME</Button>
                        </div>
                    </div>

                    {/* INNER NAVIGATION */}
                    <div className="flex justify-center gap-2 bg-black/40 p-2 rounded-3xl border border-white/5 backdrop-blur-xl">
                        {[
                            { id: 'sanctuary', label: 'Sanctuary Feed', icon: '🕊️' },
                            { id: 'altar', label: 'Prayer Wall', icon: '🙏' },
                            { id: 'treasury', label: 'Treasury', icon: '🪙' },
                            { id: 'elders', label: 'Hall of Elders', icon: '🏛️' }
                        ].map(t => (
                            <button 
                                key={t.id}
                                onClick={() => { AudioSystem.playVoxelTap(); setInnerTab(t.id as any); }}
                                className={`flex-1 md:flex-none px-6 py-2.5 rounded-2xl font-retro text-[9px] uppercase transition-all flex items-center justify-center gap-2 ${innerTab === t.id ? 'bg-yellow-600 text-white shadow-xl scale-105 border-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <span>{t.icon}</span> {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {innerTab === 'sanctuary' || innerTab === 'altar' ? (
                                <>
                                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] shadow-xl">
                                        <div className="flex justify-between mb-4">
                                            <span className="text-[10px] font-retro text-gray-500 uppercase tracking-widest">Scribe your heart</span>
                                            <div className="flex gap-2">
                                                {(['general', 'prayer', 'testimony'] as PostType[]).map(pt => (
                                                    <button 
                                                        key={pt}
                                                        onClick={() => setNewPostType(pt)}
                                                        className={`px-3 py-1 rounded-full text-[8px] font-retro uppercase transition-all ${newPostType === pt ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-500'}`}
                                                    >
                                                        {pt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea 
                                            value={newPostContent} 
                                            onChange={e => setNewPostContent(e.target.value)}
                                            placeholder={innerTab === 'altar' ? "Humble your request here..." : "Share a word or testimony..."}
                                            className="w-full bg-white/5 border border-white/10 p-6 rounded-3xl text-white outline-none focus:border-yellow-500 font-serif h-32 resize-none text-lg italic shadow-inner"
                                        />
                                        <div className="flex justify-end mt-4">
                                            <Button 
                                                onClick={handleCreatePost} 
                                                disabled={isPosting}
                                                className="px-10 py-3 rounded-2xl animate-glow"
                                            >
                                                {isPosting ? 'SCRIBING...' : 'SCRIBE MESSAGE'}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pb-24">
                                        {posts.length === 0 ? (
                                            <div className="py-20 text-center border-4 border-dashed border-white/5 rounded-[3rem] opacity-30">
                                                <div className="text-6xl mb-4">🕊️</div>
                                                <p className="font-serif italic text-xl text-white">The wall is silent. Be the first to speak.</p>
                                            </div>
                                        ) : posts.map(post => (
                                            <div key={post.id} className="bg-gray-900 border border-gray-800 p-8 rounded-[3rem] shadow-lg animate-slide-up hover:border-yellow-600/30 transition-colors">
                                                <div className="flex items-start gap-5">
                                                    <img src={post.users?.avatar} className="w-12 h-12 rounded-2xl border-2 border-white/20 shadow-xl" />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <span className="text-yellow-500 font-retro text-[10px] uppercase tracking-widest">{post.users?.username}</span>
                                                            <span className={`text-[8px] px-3 py-1 rounded-full font-mono font-bold border ${post.type === 'prayer' ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>{post.type.toUpperCase()}</span>
                                                        </div>
                                                        <p className="text-white font-serif text-xl leading-relaxed italic drop-shadow-md">"{post.content}"</p>
                                                        <div className="flex gap-6 mt-8 border-t border-white/5 pt-6">
                                                            <button className="flex items-center gap-2 text-[10px] font-retro text-gray-500 hover:text-red-500 transition-all">❤️ {post.likes_count}</button>
                                                            {post.type === 'prayer' && (
                                                                <button className="flex items-center gap-2 text-[10px] font-retro text-blue-400 animate-pulse">🙏 I PRAYED</button>
                                                            )}
                                                            <button className="flex items-center gap-2 text-[10px] font-retro text-gray-500 hover:text-blue-400 transition-all">💬 {post.comments_count}</button>
                                                            <button 
                                                              onClick={() => handleSharePost(post)} 
                                                              className="flex items-center gap-2 text-[10px] font-retro text-gray-500 hover:text-green-400 transition-all ml-auto uppercase tracking-wide group"
                                                            >
                                                                <span className="group-hover:animate-bounce">↗️</span> SHARE
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : innerTab === 'treasury' ? (
                                <div className="animate-fade-in space-y-8">
                                    <div className="bg-gradient-to-br from-green-900/30 to-black p-10 rounded-[3.5rem] border-4 border-green-800/30 shadow-2xl text-center relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent"></div>
                                        <div className="text-7xl mb-6 drop-shadow-2xl">🪙</div>
                                        <h2 className="text-4xl font-retro text-green-400 mb-2 uppercase tracking-tighter">Sacred Stewardship</h2>
                                        <p className="text-gray-400 font-serif italic text-base max-w-md mx-auto mb-10">"Honor the Lord with your wealth, with the firstfruits of all your crops."</p>
                                        
                                        <div className="bg-black/60 backdrop-blur-md p-8 rounded-[2.5rem] border-2 border-white/5 inline-block min-w-[280px] shadow-inner mb-10">
                                            <p className="text-[9px] font-retro text-gray-500 uppercase tracking-widest mb-2">Community Balance</p>
                                            <p className="text-5xl font-mono text-white font-bold tracking-tighter">{selectedCommunity.treasury_balance?.toLocaleString()} <span className="text-xs text-green-600">XP</span></p>
                                        </div>

                                        <div className="max-w-xs mx-auto space-y-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-retro text-green-600 uppercase tracking-widest">XP Tithe Amount</label>
                                                <input 
                                                    type="number" 
                                                    value={titheAmount} 
                                                    onChange={e => setTitheAmount(parseInt(e.target.value))}
                                                    className="bg-black border-2 border-green-900 rounded-2xl p-4 text-center text-2xl font-mono text-white outline-none focus:border-green-400 transition-all shadow-inner" 
                                                />
                                            </div>
                                            <Button 
                                                onClick={handleTithe} 
                                                disabled={isTithing}
                                                className="w-full bg-green-600 hover:bg-green-500 border-green-400 py-5 text-lg shadow-2xl animate-glow rounded-2xl"
                                            >
                                                {isTithing ? 'OFFERING...' : 'SACRIFICE XP'}
                                            </Button>
                                            <p className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">XP Tithed increases Ministry Level & Power</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 text-center bg-black/40 border border-white/5 rounded-[3rem] animate-fade-in">
                                    <div className="text-6xl mb-6">🏛️</div>
                                    <h3 className="text-2xl font-retro text-white uppercase tracking-tighter mb-4">Hall of Elders</h3>
                                    <p className="text-gray-500 font-serif italic text-lg max-w-sm mx-auto">This sanctum is reserved for those who have walked long with this fellowship.</p>
                                    <div className="mt-8 grid grid-cols-2 gap-4 max-w-md mx-auto p-4">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <span className="text-[8px] font-retro text-gray-600 block mb-1">LEADER</span>
                                            <span className="text-yellow-500 font-bold">FaithfulElder</span>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <span className="text-[8px] font-retro text-gray-600 block mb-1">DEACON</span>
                                            <span className="text-blue-400 font-bold">PrayerWarrior</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SIDEBAR: COMMUNITY STATS */}
                        <div className="space-y-6">
                            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-8 rounded-[3rem] shadow-2xl">
                                <h4 className="text-white font-retro text-[10px] uppercase mb-6 tracking-widest border-b border-white/10 pb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                                    Fellowship Lore
                                </h4>
                                <p className="text-gray-300 text-sm font-serif italic leading-relaxed mb-6">"{selectedCommunity.description}"</p>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <span className="text-[8px] font-retro text-gray-500 uppercase">Collective Deeds</span>
                                        <span className="text-white font-mono font-bold">{selectedCommunity.total_achievements || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                        <span className="text-[8px] font-retro text-gray-600 uppercase">Power Transfer Fee</span>
                                        <span className="text-green-500 font-mono font-bold">30%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-b from-blue-900/20 to-black p-8 rounded-[3rem] border border-blue-800/30 shadow-2xl text-center">
                                <div className="text-4xl mb-4">⚓</div>
                                <h4 className="text-blue-400 font-retro text-[9px] uppercase tracking-widest mb-6">Ministry Rank</h4>
                                <div className="relative h-20 w-20 mx-auto flex items-center justify-center">
                                    <div className={`absolute inset-0 border-4 ${getLevelColor(selectedCommunity.level || 1)} rounded-full opacity-20 animate-ping`}></div>
                                    <div className={`text-3xl font-retro ${getLevelColor(selectedCommunity.level || 1)}`}>{selectedCommunity.level || 1}</div>
                                </div>
                                <p className="text-gray-500 font-mono text-[8px] mt-4 uppercase">Total Ascension XP: {selectedCommunity.total_xp?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* DEFAULT VIEW (LISTINGS) */
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-black/40 backdrop-blur-2xl p-8 md:p-12 rounded-[4rem] border-4 border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none transform rotate-12">
                             <span className="text-[12rem]">🔥</span>
                        </div>
                        <div className="flex items-center gap-8 relative z-10">
                            <div className="text-7xl md:text-9xl animate-float drop-shadow-2xl">🔥</div>
                            <div>
                                <h1 className="text-4xl md:text-8xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 uppercase tracking-tighter leading-none mb-3">Fellowship</h1>
                                <p className="text-gray-400 font-mono text-[10px] md:text-lg mt-1 uppercase tracking-[0.4em] drop-shadow-md">Nexus_Communion_Protocol_v5</p>
                            </div>
                        </div>
                        <div className="flex gap-3 bg-white/5 p-3 rounded-[2rem] border border-white/10 backdrop-blur-md relative z-10">
                            <button onClick={() => setActiveTab('find')} className={`px-8 py-3 rounded-2xl font-retro text-[10px] uppercase transition-all ${activeTab === 'find' ? 'bg-yellow-600 text-white shadow-xl border-2 border-yellow-400 scale-105' : 'text-gray-500 hover:text-gray-300'}`}>Find Ministries</button>
                            <button onClick={() => setActiveTab('my')} className={`px-8 py-3 rounded-2xl font-retro text-[10px] uppercase transition-all ${activeTab === 'my' ? 'bg-yellow-600 text-white shadow-xl border-2 border-yellow-400 scale-105' : 'text-gray-500 hover:text-gray-300'}`}>My Covenant</button>
                            <Button onClick={onBack} variant="secondary" className="px-6 rounded-2xl">🏠 Home</Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32">
                        {(activeTab === 'find' ? communities : myCommunities).map(comm => (
                            <div key={comm.id} onClick={() => setSelectedCommunity(comm)} className="bg-black/60 backdrop-blur-xl border-2 border-white/5 rounded-[3rem] overflow-hidden group hover:border-yellow-500 hover:scale-[1.03] transition-all cursor-pointer shadow-2xl relative">
                                <div className="aspect-square bg-black relative overflow-hidden">
                                    <img src={comm.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                                    <div className="absolute bottom-6 left-6">
                                        <span className="bg-yellow-600 text-black text-[9px] px-3 py-1 rounded-lg border-2 border-white font-retro uppercase shadow-xl font-bold">{comm.type}</span>
                                    </div>
                                    <div className={`absolute top-4 right-4 bg-black/60 border-2 ${getLevelColor(comm.level || 1)} px-2 py-1 rounded-lg text-[10px] font-retro`}>LVL {comm.level || 1}</div>
                                </div>
                                <div className="p-8">
                                    <h3 className="text-white font-retro text-sm mb-3 truncate uppercase tracking-tight group-hover:text-yellow-400 transition-colors">{comm.name}</h3>
                                    <p className="text-gray-400 text-xs font-serif line-clamp-2 italic leading-relaxed mb-8">"{comm.description}"</p>
                                    <div className="flex justify-between items-center text-[8px] font-retro text-gray-500 uppercase tracking-widest border-t border-white/5 pt-6">
                                        <span className="flex items-center gap-2"><span className="w-1 h-1 bg-blue-500 rounded-full"></span> {comm.member_count} Pilgrims</span>
                                        <span className="text-green-500">{comm.treasury_balance?.toLocaleString()} XP</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default CommunityView;
