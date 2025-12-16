
import React, { useState, useEffect } from 'react';
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
  onConvertGuest?: () => void;
  spendPoints?: (amount: number) => Promise<boolean>;
}

const COMMUNITY_TYPES: CommunityType[] = ['Church', 'Fellowship', 'Cell Group', 'Study Group', 'Mission'];

const CommunityView: React.FC<CommunityViewProps> = ({ user, onBack, language, onAddPoints, onConvertGuest, spendPoints }) => {
  const [activeTab, setActiveTab] = useState<'find' | 'my' | 'create'>('find');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('All');
  
  // Feed State
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostType, setNewPostType] = useState<PostType>('general');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null); // Which post is showing comments
  const [postComments, setPostComments] = useState<Record<string, CommunityComment[]>>({});
  const [newCommentContent, setNewCommentContent] = useState('');

  // Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<CommunityType>('Fellowship');
  const [isCreating, setIsCreating] = useState(false);

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[language][key] || UI_TEXT['en'][key];
  };

  useEffect(() => {
    fetchCommunities();
    if (user) fetchMyCommunities();
  }, [user]);

  useEffect(() => {
      if (selectedCommunity) {
          fetchPosts(selectedCommunity.id);
      }
  }, [selectedCommunity]);

  const fetchCommunities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('member_count', { ascending: false });
    
    if (data && !error) {
      setCommunities(data);
    }
    setLoading(false);
  };

  const fetchMyCommunities = async () => {
    if (!user || user.id.startsWith('offline-')) return;
    
    const { data, error } = await supabase
      .from('community_members')
      .select('community_id, communities(*)')
      .eq('user_id', user.id);

    if (data && !error) {
      const myComms = data.map((item: any) => item.communities) as Community[];
      setMyCommunities(myComms);
    }
  };

  const fetchPosts = async (communityId: string) => {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
            *,
            users:user_id (username, avatar),
            community_post_likes!left(user_id)
        `)
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });

      if (data && !error) {
          const formatted: CommunityPost[] = data.map((p: any) => ({
              ...p,
              // Check if current user liked it based on join results
              has_liked: user ? p.community_post_likes.some((l: any) => l.user_id === user.id) : false
          }));
          setPosts(formatted);
      }
  };

  const fetchComments = async (postId: string) => {
      const { data, error } = await supabase
        .from('community_comments')
        .select(`*, users:user_id (username, avatar)`)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
        
      if (data && !error) {
          setPostComments(prev => ({ ...prev, [postId]: data }));
      }
  };

  // --- ACTIONS ---

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (user.id.startsWith('offline-')) {
        if (onConvertGuest) onConvertGuest();
        return;
    }

    // Check Cost - 500 XP
    if (spendPoints) {
        const success = await spendPoints(500);
        if (!success) return;
    }

    setIsCreating(true);
    
    try {
        // Generate Image
        const prompt = `pixel art ${newType.toLowerCase()} building icon, spiritual, holy, game asset, isometric`;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=250&height=250&nologo=true`;

        // Insert Community
        const { data: commData, error: commError } = await supabase.from('communities').insert({
            name: newName,
            description: newDesc,
            type: newType,
            leader_id: user.id,
            image: imageUrl,
            member_count: 1
        }).select().single();

        if (commError) throw commError;

        // Add Leader as Member
        await supabase.from('community_members').insert({
            community_id: commData.id,
            user_id: user.id,
            role: 'leader'
        });

        onAddPoints(50); // XP for the action itself (separate from cost)
        AudioSystem.playAchievement();
        alert("Ministry started! +50 XP");
        
        // Reset and Refresh
        setNewName('');
        setNewDesc('');
        setActiveTab('my');
        fetchCommunities();
        fetchMyCommunities();

    } catch (err: any) {
        console.error("Creation failed", err);
        alert("Failed to create group: " + err.message);
    } finally {
        setIsCreating(false);
    }
  };

  const handleJoin = async (comm: Community) => {
      if (!user) return;
      if (user.id.startsWith('offline-')) {
          if (onConvertGuest) onConvertGuest();
          return;
      }

      // Check if already member locally
      if (myCommunities.some(c => c.id === comm.id)) {
          // Already member, just enter
          setSelectedCommunity(comm);
          return;
      }

      try {
          const { error } = await supabase.from('community_members').insert({
              community_id: comm.id,
              user_id: user.id,
              role: 'member'
          });

          if (error) throw error;

          onAddPoints(10);
          AudioSystem.playVoxelTap();
          
          // Update local state
          setMyCommunities([...myCommunities, comm]);
          setCommunities(communities.map(c => c.id === comm.id ? { ...c, member_count: c.member_count + 1 } : c));
          
          // Auto enter
          setSelectedCommunity(comm);

      } catch (err) {
          console.error("Join failed", err);
      }
  };

  const handleLeave = async (commId: string) => {
      if (!user || !confirm("Are you sure you want to leave this group?")) return;

      try {
          await supabase.from('community_members').delete().eq('community_id', commId).eq('user_id', user.id);
          setMyCommunities(myCommunities.filter(c => c.id !== commId));
          setCommunities(communities.map(c => c.id === commId ? { ...c, member_count: Math.max(0, c.member_count - 1) } : c));
          setSelectedCommunity(null); // Exit if looking at it
      } catch (err) {
          console.error("Leave failed", err);
      }
  };

  const handlePost = async () => {
      if (!user || !selectedCommunity || !newPostContent.trim()) return;
      
      const content = newPostContent.trim();
      const type = newPostType;
      
      // Optimistic UI update
      const tempPost: CommunityPost = {
          id: `temp-${Date.now()}`,
          community_id: selectedCommunity.id,
          user_id: user.id,
          content,
          type,
          created_at: new Date().toISOString(),
          likes_count: 0,
          comments_count: 0,
          users: { username: user.username, avatar: user.avatar },
          has_liked: false
      };
      
      setPosts([tempPost, ...posts]);
      setNewPostContent('');
      
      try {
          const { data, error } = await supabase.from('community_posts').insert({
              community_id: selectedCommunity.id,
              user_id: user.id,
              content,
              type
          }).select('*, users:user_id(username, avatar)').single();
          
          if (data && !error) {
              // Replace temp post
              setPosts(prev => prev.map(p => p.id === tempPost.id ? { ...data, has_liked: false } : p));
              onAddPoints(5);
              AudioSystem.playMessage();
          }
      } catch (e) {
          console.error("Post failed", e);
      }
  };

  const handleLikePost = async (post: CommunityPost) => {
      if (!user || post.has_liked) return;
      
      // Optimistic
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes_count: p.likes_count + 1, has_liked: true } : p));
      AudioSystem.playVoxelTap();
      
      try {
          await supabase.from('community_post_likes').insert({ post_id: post.id, user_id: user.id });
          await supabase.rpc('increment_post_likes', { post_row_id: post.id });
          onAddPoints(2);
      } catch (e) {
          console.error("Like failed", e);
      }
  };

  const toggleComments = (postId: string) => {
      if (activeCommentId === postId) {
          setActiveCommentId(null);
      } else {
          setActiveCommentId(postId);
          fetchComments(postId);
      }
  };

  const handleComment = async (postId: string) => {
      if (!user || !newCommentContent.trim()) return;
      
      const content = newCommentContent.trim();
      
      try {
          const { data, error } = await supabase.from('community_comments').insert({
              post_id: postId,
              user_id: user.id,
              content
          }).select('*, users:user_id(username, avatar)').single();
          
          if (data && !error) {
              setPostComments(prev => ({
                  ...prev,
                  [postId]: [...(prev[postId] || []), data]
              }));
              setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
              setNewCommentContent('');
              onAddPoints(5);
              AudioSystem.playMessage();
          }
      } catch (e) {
          console.error("Comment failed", e);
      }
  };

  const handleSharePost = async (post: CommunityPost) => {
      const text = `"${post.content}" - posted in ${selectedCommunity?.name}`;
      if (navigator.share) {
          try {
              await navigator.share({
                  title: 'Journey Community Post',
                  text: text,
                  url: window.location.href
              });
              onAddPoints(5);
          } catch(e) {}
      } else {
          navigator.clipboard.writeText(text);
          alert("Copied to clipboard!");
      }
  };

  const filteredCommunities = filterType === 'All' 
    ? communities 
    : communities.filter(c => c.type === filterType);

  // --- RENDER ---

  if (selectedCommunity) {
      return (
          <div className="min-h-screen bg-gray-900 p-4 pt-20 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] animate-fade-in">
              <div className="w-full max-w-2xl bg-gray-900 border-x-2 border-gray-800 min-h-[90vh] shadow-2xl relative">
                  
                  {/* Community Header */}
                  <div className="bg-gray-800 p-4 border-b border-yellow-600 sticky top-0 z-20 shadow-md">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-3">
                              <img src={selectedCommunity.image} className="w-12 h-12 rounded border border-gray-600 object-cover" />
                              <div>
                                  <h2 className="text-white font-retro text-lg leading-tight">{selectedCommunity.name}</h2>
                                  <div className="flex gap-2 items-center mt-1">
                                      <span className="text-[10px] bg-blue-900 text-blue-200 px-1.5 py-0.5 rounded">{selectedCommunity.type}</span>
                                      <span className="text-gray-400 text-xs font-mono">{selectedCommunity.member_count} Members</span>
                                  </div>
                              </div>
                          </div>
                          <Button onClick={() => setSelectedCommunity(null)} variant="secondary" className="text-xs px-2 py-1">Back</Button>
                      </div>
                      
                      {/* Post Composer */}
                      <div className="bg-black/30 p-3 rounded border border-gray-700">
                          <textarea 
                              className="w-full bg-transparent text-white text-sm outline-none resize-none h-16 placeholder-gray-500 font-serif"
                              placeholder={`Share with the group...`}
                              value={newPostContent}
                              onChange={(e) => setNewPostContent(e.target.value)}
                          />
                          <div className="flex justify-between items-center mt-2 border-t border-gray-700 pt-2">
                              <div className="flex gap-2">
                                  <button onClick={() => setNewPostType('general')} className={`text-[10px] px-2 py-1 rounded-full border ${newPostType === 'general' ? 'bg-gray-700 text-white border-gray-500' : 'text-gray-500 border-transparent hover:bg-gray-800'}`}>General</button>
                                  <button onClick={() => setNewPostType('prayer')} className={`text-[10px] px-2 py-1 rounded-full border ${newPostType === 'prayer' ? 'bg-yellow-900/50 text-yellow-200 border-yellow-600' : 'text-gray-500 border-transparent hover:bg-gray-800'}`}>🙏 Prayer</button>
                                  <button onClick={() => setNewPostType('testimony')} className={`text-[10px] px-2 py-1 rounded-full border ${newPostType === 'testimony' ? 'bg-blue-900/50 text-blue-200 border-blue-600' : 'text-gray-500 border-transparent hover:bg-gray-800'}`}>🙌 Testimony</button>
                              </div>
                              <button 
                                onClick={handlePost}
                                disabled={!newPostContent.trim()}
                                className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-black font-bold text-xs px-4 py-1.5 rounded transition-colors"
                              >
                                  Post
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* Feed */}
                  <div className="p-4 space-y-4 pb-20">
                      {posts.length === 0 && (
                          <div className="text-center text-gray-500 py-10 font-serif italic">
                              Be the first to share in this group.
                          </div>
                      )}
                      
                      {posts.map(post => (
                          <div key={post.id} className={`bg-gray-800 rounded border p-4 ${post.type === 'prayer' ? 'border-l-4 border-l-yellow-500' : post.type === 'testimony' ? 'border-l-4 border-l-blue-500' : 'border-gray-700'}`}>
                              <div className="flex items-start gap-3 mb-2">
                                  <img src={post.users?.avatar || 'https://image.pollinations.ai/prompt/pixel%20art%20avatar?width=50&height=50&nologo=true'} className="w-8 h-8 rounded-full border border-gray-600" />
                                  <div>
                                      <div className="flex items-center gap-2">
                                          <span className="text-white font-bold text-sm">{post.users?.username}</span>
                                          {post.type === 'prayer' && <span className="text-[9px] bg-yellow-900 text-yellow-200 px-1 rounded uppercase">Prayer Request</span>}
                                          {post.type === 'testimony' && <span className="text-[9px] bg-blue-900 text-blue-200 px-1 rounded uppercase">Testimony</span>}
                                      </div>
                                      <span className="text-gray-500 text-[10px]">{new Date(post.created_at).toLocaleDateString()}</span>
                                  </div>
                              </div>
                              
                              <p className="text-gray-200 text-sm font-serif leading-relaxed whitespace-pre-wrap mb-4">
                                  {post.content}
                              </p>
                              
                              <div className="flex items-center gap-6 border-t border-gray-700 pt-3">
                                  <button 
                                    onClick={() => handleLikePost(post)}
                                    className={`flex items-center gap-1 text-xs transition-colors ${post.has_liked ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}
                                  >
                                      <span>{post.has_liked ? '❤️' : '♡'}</span> {post.likes_count}
                                  </button>
                                  <button 
                                    onClick={() => toggleComments(post.id)}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                                  >
                                      <span>💬</span> {post.comments_count}
                                  </button>
                                  <button 
                                    onClick={() => handleSharePost(post)}
                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors ml-auto"
                                  >
                                      <span>↗️</span> Share
                                  </button>
                              </div>

                              {/* Comments Section */}
                              {activeCommentId === post.id && (
                                  <div className="mt-4 bg-black/20 p-3 rounded border border-gray-700 animate-slide-up">
                                      <div className="space-y-3 mb-3 max-h-40 overflow-y-auto custom-scroll">
                                          {postComments[post.id]?.map(comment => (
                                              <div key={comment.id} className="flex gap-2">
                                                  <img src={comment.users?.avatar} className="w-5 h-5 rounded-full border border-gray-600" />
                                                  <div className="flex-1">
                                                      <div className="bg-gray-700/50 p-2 rounded text-xs text-gray-300">
                                                          <span className="font-bold text-white mr-1">{comment.users?.username}</span>
                                                          {comment.content}
                                                      </div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                      <div className="flex gap-2">
                                          <input 
                                              type="text" 
                                              placeholder="Write a comment..." 
                                              className="flex-1 bg-black text-white text-xs p-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
                                              value={newCommentContent}
                                              onChange={(e) => setNewCommentContent(e.target.value)}
                                              onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                                          />
                                          <button 
                                            onClick={() => handleComment(post.id)}
                                            className="text-blue-400 hover:text-white text-xs font-bold px-2"
                                          >
                                              Send
                                          </button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] animate-fade-in">
      
      <div className="w-full max-w-6xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-800/90 p-6 rounded-xl border-b-4 border-yellow-600 shadow-xl backdrop-blur-sm relative z-50">
         <div className="flex items-center gap-4">
            <div className="text-4xl animate-float">🔥</div>
            <div>
               <h1 className="text-3xl md:text-4xl font-retro text-yellow-500 text-shadow-md">{t('community')}</h1>
               <p className="text-gray-400 font-mono text-sm mt-1">Gather. Worship. Grow together.</p>
            </div>
         </div>
         <div className="flex gap-2">
             <Button onClick={() => setActiveTab('find')} variant={activeTab === 'find' ? 'primary' : 'secondary'} className="text-xs">{t('find_groups')}</Button>
             <Button onClick={() => setActiveTab('my')} variant={activeTab === 'my' ? 'primary' : 'secondary'} className="text-xs">{t('my_groups')}</Button>
             <Button onClick={() => setActiveTab('create')} variant={activeTab === 'create' ? 'primary' : 'secondary'} className="text-xs">+ {t('create')}</Button>
             <Button onClick={onBack} variant="secondary" className="text-xs ml-2">🏠</Button>
         </div>
      </div>

      <div className="w-full max-w-6xl">
         
         {/* CREATE TAB */}
         {activeTab === 'create' && (
             <div className="max-w-xl mx-auto bg-gray-800 border-4 border-yellow-700 p-8 rounded-xl pixel-shadow animate-slide-up">
                 <h2 className="text-2xl font-retro text-white mb-6 text-center">{t('create_community')}</h2>
                 
                 <form onSubmit={handleCreate} className="space-y-4">
                     <div>
                         <label className="block text-yellow-500 font-retro text-xs uppercase mb-2">{t('group_name')}</label>
                         <input 
                           type="text" 
                           value={newName} 
                           onChange={(e) => setNewName(e.target.value)}
                           className="w-full bg-black border-2 border-gray-600 text-white p-3 rounded focus:border-yellow-500 outline-none"
                           placeholder="e.g. Zion Warriors"
                           maxLength={30}
                           required
                         />
                     </div>
                     
                     <div>
                         <label className="block text-yellow-500 font-retro text-xs uppercase mb-2">{t('group_type')}</label>
                         <div className="grid grid-cols-2 gap-2">
                             {COMMUNITY_TYPES.map(type => (
                                 <button
                                   key={type}
                                   type="button"
                                   onClick={() => setNewType(type)}
                                   className={`p-2 text-xs border-2 rounded ${newType === type ? 'bg-yellow-600 border-yellow-400 text-black font-bold' : 'bg-gray-900 border-gray-700 text-gray-400'}`}
                                 >
                                     {type}
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div>
                         <label className="block text-yellow-500 font-retro text-xs uppercase mb-2">{t('description')}</label>
                         <textarea 
                           value={newDesc}
                           onChange={(e) => setNewDesc(e.target.value)}
                           className="w-full bg-black border-2 border-gray-600 text-white p-3 rounded focus:border-yellow-500 outline-none h-24"
                           placeholder="What is the mission of this group?"
                           maxLength={150}
                           required
                         />
                     </div>

                     <Button type="submit" className="w-full mt-4" disabled={isCreating}>
                         {isCreating ? 'Forging...' : `${t('create_community')} (-500 XP)`}
                     </Button>
                 </form>
             </div>
         )}

         {/* LIST TABS */}
         {(activeTab === 'find' || activeTab === 'my') && (
             <>
                {activeTab === 'find' && (
                    <div className="sticky top-14 z-30 bg-gray-900/95 backdrop-blur-sm py-3 -mx-4 px-4 md:mx-0 md:px-0 border-b border-gray-700 mb-6 shadow-md transition-all">
                        <div className="flex gap-2 overflow-x-auto custom-scroll no-scrollbar items-center">
                            <button 
                              onClick={() => setFilterType('All')}
                              className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filterType === 'All' ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white'}`}
                            >
                                All
                            </button>
                            {COMMUNITY_TYPES.map(type => (
                                <button 
                                  key={type}
                                  onClick={() => setFilterType(type)}
                                  className={`px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${filterType === type ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700 hover:text-white'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                    {(activeTab === 'find' ? filteredCommunities : myCommunities).map(comm => {
                        const isMember = myCommunities.some(c => c.id === comm.id);
                        
                        return (
                            <div key={comm.id} className="bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-600 hover:border-yellow-500 transition-all hover:translate-y-[-2px] group pixel-shadow flex flex-col h-full">
                                <div className="h-32 bg-black relative border-b-2 border-black overflow-hidden">
                                    <img src={comm.image} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt={comm.name} />
                                    <div className="absolute top-2 right-2">
                                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase border shadow-sm ${comm.type === 'Church' ? 'bg-purple-900 text-purple-200 border-purple-500' : 'bg-blue-900 text-blue-200 border-blue-500'}`}>
                                            {comm.type}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-white font-bold text-lg leading-tight font-retro truncate w-full">{comm.name}</h3>
                                    </div>
                                    <p className="text-gray-400 text-xs mb-4 line-clamp-2 flex-grow font-serif">{comm.description}</p>
                                    
                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-700">
                                        <span className="text-xs text-yellow-500 font-mono">👥 {comm.member_count} {t('members')}</span>
                                        
                                        {isMember ? (
                                            <div className="flex gap-2">
                                                <button 
                                                  onClick={() => setSelectedCommunity(comm)}
                                                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded font-bold uppercase"
                                                >
                                                    Enter
                                                </button>
                                                <button 
                                                  onClick={() => handleLeave(comm.id)}
                                                  className="text-red-400 hover:text-red-300 text-[10px] uppercase border border-red-900/50 px-2 py-1 rounded"
                                                >
                                                    {t('leave')}
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                              onClick={() => handleJoin(comm)}
                                              className="bg-green-700 hover:bg-green-600 text-white text-xs px-4 py-2 rounded font-bold uppercase shadow-md transition-transform active:scale-95"
                                            >
                                                {t('join')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {(activeTab === 'find' ? filteredCommunities : myCommunities).length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-500">
                            <div className="text-4xl mb-2">🏕️</div>
                            <p className="font-serif italic">No communities found here.</p>
                            {activeTab === 'my' && <p className="text-xs mt-2">Go to "Find Groups" to join one!</p>}
                        </div>
                    )}
                </div>
             </>
         )}

      </div>
    </div>
  );
};

export default CommunityView;
