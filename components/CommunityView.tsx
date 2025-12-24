import React, { useState, useEffect, useMemo } from 'react';
import Button from './Button';
import { User, Community, CommunityType, CommunityPost, CommunityComment, PostType } from '../types';
import { supabase } from '../lib/supabase';
import { UI_TEXT, LanguageCode, getTranslation } from '../translations';
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
  onSync?: () => void;
}

const CommunityView: React.FC<CommunityViewProps> = ({ user, onBack, language, onAddPoints, onUnlockAchievement, onConvertGuest, spendPoints, initialCommunityId, onSync }) => {
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

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return getTranslation(language, key);
  };

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
          onAddPoints(20);
          if(onUnlockAchievement) onUnlockAchievement('evangelist');
          AudioSystem.playAchievement();
          alert("+20 XP: Evangelist Bonus");
      }
  };

  const handleSharePost = async (post: CommunityPost) => {
      AudioSystem.playVoxelTap();
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
          onAddPoints(20);
          if(onUnlockAchievement) onUnlockAchievement('evangelist');
          AudioSystem.playAchievement();
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
          
          if (onSync) onSync(); // Refresh global balance
          
          const { data: updated } = await supabase.from('communities').select('*').eq('id', selectedCommunity.id).single();
          if (updated) setSelectedCommunity(updated);
          await supabase.rpc('sync_community_level', { p_community_id: selectedCommunity.id });
      } catch (e: any) {
          alert(e.message);
      } finally {
          setIsTithing(false);
      }
  };

  const getLevelColor = (level: number) => {
      if (level >= 10) return 'text-purple-400 border-purple-500';
      if (level >= 5) return 'text-yellow-500 border-yellow-600';
      return 'text-blue-400 border-blue-500';
  };

  return (
    <div className="min-h-screen bg-black/95 p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20holy%20landscape%20misty%20temple?width=1200&height=800&nologo=true')] bg-cover bg-fixed bg-center custom-scroll">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-6xl">
            {selectedCommunity ? (
                <div className="animate-fade-in space-y-6">
                    {/* ENHANCED COMMUNITY HEADER */}
                    <div className="bg-black/60 backdrop-blur-3xl border-4 border-white/10 p-4 md:p-8 rounded-[2rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                        
                        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                            <div className="relative group shrink-0">
                                <img src={selectedCommunity.image} className="w-20 h-20 md:w-28 md:h-28 rounded-2xl border-4 border-yellow-500 shadow-2xl transform group-hover:scale-105 transition-transform" />
                                <div className={`absolute -bottom-2 -right-2 bg-black border-2 ${getLevelColor(selectedCommunity.level || 1)} px-2 py-0.5 rounded-full font-retro text-[8px] md:text-xs shadow-xl`}>
                                    LVL {selectedCommunity.level || 1}
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl md:text-4xl font-retro text-white drop-shadow-2xl uppercase tracking-tighter truncate">{selectedCommunity.name}</h1>
                                <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                                    <span className="text-yellow-400 font-retro text-[8px] uppercase tracking-[0.2em]">{selectedCommunity.type}</span>
                                    
                                    <span className="hidden md:inline w-1 h-1 rounded-full bg-white/20"></span>
                                    <span className="text-gray-400 font-mono text-[9px] uppercase tracking-widest">{selectedCommunity.member_count} Pilgrims</span>
                                    
                                    <span className="hidden md:inline w-1 h-1 rounded-full bg-white/20"></span>
                                    <button 
                                      onClick={handleShareCommunity} 
                                      className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 hover:text-white text-blue-400 border border-blue-500/50 px-2 py-0.5 rounded-full transition-all active:scale-95 group"
                                    >
                                        <span className="text-xs group-hover:animate-bounce">↗</span> 
                                        <span className="font-retro text-[8px] uppercase tracking-wider">Share</span>
                                    </button>

                                    <span className="hidden md:inline w-1 h-1 rounded-full bg-white/20"></span>
                                    <span className="text-green-400 font-mono text-[9px] uppercase tracking-widest">{selectedCommunity.treasury_balance?.toLocaleString()} XP</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 relative z-10 w-full md:w-auto">
                            <Button onClick={() => setSelectedCommunity(null)} variant="secondary" className="w-full md:w-auto px-6 py-2 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-[10px]">← LEAVE</Button>
                            <Button onClick={onBack} variant="secondary" className="w-full md:w-auto px-6 py-2 rounded-xl text-[10px] bg-black/40 border-white/5">🏠 HOME</Button>
                        </div>
                    </div>

                    {/* INNER NAVIGATION */}
                    <div className="grid grid-cols-2 md:flex md:justify-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
                        {[
                            { id: 'sanctuary', label: 'Feed', icon: '🕊️' },
                            { id: 'altar', label: 'Prayer', icon: '🙏' },
                            { id: 'treasury', label: 'Treasury', icon: '🪙' },
                            { id: 'elders', label: 'Elders', icon: '🏛️' }
                        ].map(t => (
                            <button 
                                key={t.id}
                                onClick={() => { AudioSystem.playVoxelTap(); setInnerTab(t.id as any); }}
                                className={`px-4 py-2 rounded-xl font-retro text-[9px] uppercase transition-all flex items-center justify-center gap-2 ${innerTab === t.id ? 'bg-yellow-600 text-white shadow-xl border border-yellow-400' : 'bg-gray-800/50 text-gray-500 hover:text-gray-300 border border-transparent'}`}
                            >
                                <span className="text-sm">{t.icon}</span> {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {innerTab === 'sanctuary' || innerTab === 'altar' ? (
                                <>
                                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-[2rem] shadow-xl">
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
                                            className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-yellow-500 font-serif h-24 md:h-32 resize-none text-sm md:text-lg italic shadow-inner"
                                        />
                                        <div className="flex justify-end mt-4">
                                            <Button 
                                                onClick={handleCreatePost} 
                                                disabled={isPosting}
                                                className="px-6 py-2 rounded-xl animate-glow text-[10px]"
                                            >
                                                {isPosting ? '...' : 'SCRIBE MESSAGE'}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pb-24">
                                        {posts.length === 0 ? (
                                            <div className="py-20 text-center border-4 border-dashed border-white/5 rounded-[3rem] opacity-30">
                                                <div className="text-6xl mb-4">🕊️</div>
                                                <p className="font-serif italic text-xl text-white">The wall is silent.</p>
                                            </div>
                                        ) : posts.map(post => (
                                            <div key={post.id} className="bg-gray-900 border border-gray-800 p-6 rounded-[2rem] shadow-lg animate-slide-up hover:border-yellow-600/30 transition-colors">
                                                <div className="flex items-start gap-4">
                                                    <img src={post.users?.avatar || ''} className="w-10 h-10 rounded-xl border border-white/20 shadow-xl shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-yellow-500 font-retro text-[9px] uppercase tracking-widest truncate">{post.users?.username}</span>
                                                            <span className={`text-[7px] px-2 py-0.5 rounded-full font-mono font-bold border ${post.type === 'prayer' ? 'bg-blue-900/40 border-blue-500 text-blue-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>{post.type.toUpperCase()}</span>
                                                        </div>
                                                        <p className="text-white font-serif text-sm md:text-lg leading-relaxed italic drop-shadow-md break-words">"{post.content}"</p>
                                                        <div className="flex gap-4 mt-6 border-t border-white/5 pt-4">
                                                            <button className="flex items-center gap-1 text-[9px] font-retro text-gray-500 hover:text-red-500 transition-all">❤️ {post.likes_count}</button>
                                                            {post.type === 'prayer' && (
                                                                <button className="flex items-center gap-1 text-[9px] font-retro text-blue-400 animate-pulse">🙏 PRAY</button>
                                                            )}
                                                            <button 
                                                              onClick={() => handleSharePost(post)} 
                                                              className="flex items-center gap-1 text-[9px] font-retro text-gray-500 hover:text-green-400 transition-all ml-auto uppercase tracking-wide group"
                                                            >
                                                                <span className="group-hover:animate-bounce">↗️</span>
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
                                    <div className="bg-gradient-to-br from-green-900/30 to-black p-8 rounded-[3rem] border-4 border-green-800/30 shadow-2xl text-center relative overflow-hidden">
                                        <div className="text-6xl mb-4 drop-shadow-2xl">🪙</div>
                                        <h2 className="text-3xl font-retro text-green-400 mb-2 uppercase tracking-tighter">Sacred Stewardship</h2>
                                        
                                        <div className="bg-black/60 backdrop-blur-md p-6 rounded-[2rem] border-2 border-white/5 inline-block min-w-[240px] shadow-inner mb-8">
                                            <p className="text-[9px] font-retro text-gray-500 uppercase tracking-widest mb-1">Community Balance</p>
                                            <p className="text-4xl font-mono text-white font-bold tracking-tighter">{selectedCommunity.treasury_balance?.toLocaleString()} <span className="text-xs text-green-600">XP</span></p>
                                        </div>

                                        <div className="max-w-xs mx-auto space-y-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-retro text-green-600 uppercase tracking-widest">XP Tithe Amount</label>
                                                <input 
                                                    type="number" 
                                                    value={titheAmount} 
                                                    onChange={e => setTitheAmount(parseInt(e.target.value))}
                                                    className="bg-black border-2 border-green-900 rounded-xl p-3 text-center text-xl font-mono text-white outline-none focus:border-green-400 transition-all shadow-inner" 
                                                />
                                            </div>
                                            <Button 
                                                onClick={handleTithe} 
                                                disabled={isTithing}
                                                className="w-full bg-green-600 hover:bg-green-500 border-green-400 py-4 text-sm shadow-2xl animate-glow rounded-xl"
                                            >
                                                {isTithing ? 'OFFERING...' : 'SACRIFICE XP'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 text-center bg-black/40 border border-white/5 rounded-[3rem] animate-fade-in">
                                    <div className="text-6xl mb-6">🏛️</div>
                                    <h3 className="text-2xl font-retro text-white uppercase tracking-tighter mb-4">Hall of Elders</h3>
                                    <div className="mt-8 grid grid-cols-2 gap-4 max-w-md mx-auto p-4">
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <span className="text-[8px] font-retro text-gray-600 block mb-1">LEADER</span>
                                            <span className="text-yellow-500 font-bold text-xs">FaithfulElder</span>
                                        </div>
                                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <span className="text-[8px] font-retro text-gray-600 block mb-1">DEACON</span>
                                            <span className="text-blue-400 font-bold text-xs">PrayerWarrior</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SIDEBAR: COMMUNITY STATS */}
                        <div className="space-y-6">
                            <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] shadow-2xl">
                                <h4 className="text-white font-retro text-[10px] uppercase mb-4 tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                                    Lore
                                </h4>
                                <p className="text-gray-300 text-xs font-serif italic leading-relaxed mb-6">"{selectedCommunity.description}"</p>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                        <span className="text-[8px] font-retro text-gray-500 uppercase">Collective Deeds</span>
                                        <span className="text-white font-mono font-bold text-xs">{selectedCommunity.total_achievements || 0}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-b from-blue-900/20 to-black p-6 rounded-[2.5rem] border border-blue-800/30 shadow-2xl text-center">
                                <div className="text-4xl mb-4">⚓</div>
                                <h4 className="text-blue-400 font-retro text-[9px] uppercase tracking-widest mb-4">Ministry Rank</h4>
                                <div className="relative h-16 w-16 mx-auto flex items-center justify-center">
                                    <div className={`absolute inset-0 border-4 ${getLevelColor(selectedCommunity.level || 1)} rounded-full opacity-20 animate-ping`}></div>
                                    <div className={`text-2xl font-retro ${getLevelColor(selectedCommunity.level || 1)}`}>{selectedCommunity.level || 1}</div>
                                </div>
                                <p className="text-gray-500 font-mono text-[8px] mt-4 uppercase">Total Ascension XP: {selectedCommunity.total_xp?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* DEFAULT VIEW (LISTINGS) */
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-black/40 backdrop-blur-2xl p-6 md:p-10 rounded-[3rem] border-4 border-white/10 shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none transform rotate-12">
                             <span className="text-[8rem] md:text-[10rem]">🔥</span>
                        </div>
                        <div className="flex items-center gap-4 md:gap-6 relative z-10 text-center lg:text-left">
                            <div className="text-5xl md:text-7xl animate-float drop-shadow-2xl">🔥</div>
                            <div>
                                <h1 className="text-3xl md:text-6xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 uppercase tracking-tighter leading-none mb-2">Fellowship</h1>
                                <p className="text-gray-400 font-mono text-[9px] md:text-xs mt-1 uppercase tracking-[0.2em] drop-shadow-md">Nexus_Communion_Protocol_v5</p>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 bg-white/5 p-2 rounded-[1.5rem] border border-white/10 backdrop-blur-md relative z-10 w-full lg:w-auto">
                            <button onClick={() => setActiveTab('find')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-retro text-[9px] uppercase transition-all whitespace-nowrap ${activeTab === 'find' ? 'bg-yellow-600 text-white shadow-xl border-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}>Find Ministries</button>
                            <button onClick={() => setActiveTab('my')} className={`flex-1 sm:flex-none px-6 py-3 rounded-xl font-retro text-[9px] uppercase transition-all whitespace-nowrap ${activeTab === 'my' ? 'bg-yellow-600 text-white shadow-xl border-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}>My Covenant</button>
                            <Button onClick={onBack} variant="secondary" className="w-full sm:w-auto px-6 py-3 rounded-xl text-[9px]">🏠 Home</Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-32">
                        {(activeTab === 'find' ? communities : myCommunities).map(comm => (
                            <div key={comm.id} onClick={() => setSelectedCommunity(comm)} className="bg-black/60 backdrop-blur-xl border-2 border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-yellow-500 hover:scale-[1.03] transition-all cursor-pointer shadow-2xl relative">
                                <div className="aspect-square bg-black relative overflow-hidden">
                                    <img src={comm.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                                    <div className="absolute bottom-6 left-6">
                                        <span className="bg-yellow-600 text-black text-[9px] px-3 py-1 rounded-lg border-2 border-white font-retro uppercase shadow-xl font-bold">{comm.type}</span>
                                    </div>
                                    <div className={`absolute top-4 right-4 bg-black/60 border-2 ${getLevelColor(comm.level || 1)} px-2 py-1 rounded-lg text-[10px] font-retro`}>LVL {comm.level || 1}</div>
                                </div>
                                <div className="p-6">
                                    <h3 className="text-white font-retro text-sm mb-3 truncate uppercase tracking-tight group-hover:text-yellow-400 transition-colors">{comm.name}</h3>
                                    <p className="text-gray-400 text-xs font-serif line-clamp-2 italic leading-relaxed mb-6">"{comm.description}"</p>
                                    <div className="flex justify-between items-center text-[8px] font-retro text-gray-500 uppercase tracking-widest border-t border-white/5 pt-4">
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
