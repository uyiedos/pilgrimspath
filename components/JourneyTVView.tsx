
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Button from './Button';
import { User, VideoContent, VideoPlatform } from '../types';
import { LanguageCode, UI_TEXT } from '../translations';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { AudioSystem } from '../utils/audio';

interface JourneyTVViewProps {
  user: User | null;
  onBack: () => void;
  onChat?: () => void;
  language?: LanguageCode;
  onSocialAction?: (action: 'like' | 'pray' | 'comment' | 'share') => void;
  spendPoints?: (amount: number) => Promise<boolean>;
}

interface ChatMessage {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  created_at: string;
  is_me?: boolean;
  reply_to_id?: string;
  reply_context?: { username: string, message: string };
  type?: 'chat' | 'milestone';
}

const CATEGORIES = ['All', 'Live', 'Worship', 'Music', 'Sermons', 'Movies', 'Events', 'Lofi', 'Testimonies'];
const SORT_OPTIONS = [
    { label: 'Recently Broadcasted', value: 'recent' },
    { label: 'Most Viewed', value: 'popular' }
];

const DEFAULT_VIDEO: VideoContent = {
  id: 'preview',
  user_id: 'preview',
  username: 'Preview',
  avatar: '',
  title: 'Preview',
  category: 'General',
  platform: 'youtube',
  youtube_id: '',
  views: 0,
  likes: 0,
  created_at: new Date().toISOString()
};

const JourneyTVView: React.FC<JourneyTVViewProps> = ({ user, onBack, onChat, language = 'en', onSocialAction, spendPoints }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  
  // UI State
  const [showChat, setShowChat] = useState(false); // Floating chat toggle
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Video State
  const [videoList, setVideoList] = useState<VideoContent[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('recent');

  // Broadcast Form
  const [broadcastUrl, setBroadcastUrl] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastDesc, setBroadcastDesc] = useState(''); // New: Description
  const [broadcastSource, setBroadcastSource] = useState(''); // New: Source Reference
  const [broadcastCategory, setBroadcastCategory] = useState('Worship');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<VideoPlatform>('youtube');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[language][key] || UI_TEXT['en'][key];
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    fetchChatHistory();
    fetchVideos();
    setupRealtime();

    return () => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user]);

  // Auto scroll chat
  useEffect(() => {
    if (showChat) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setUnreadCount(0);
    }
  }, [messages, showChat]);

  // Auto-slide Carousel
  useEffect(() => {
      const interval = setInterval(() => {
          if (!isBroadcasting) {
              setCurrentSlide(prev => (prev + 1) % Math.min(5, videoList.length || 1));
          }
      }, 6000);
      return () => clearInterval(interval);
  }, [videoList.length, isBroadcasting]);

  // --- FILTERING LOGIC ---
  const filteredAndSortedVideos = useMemo(() => {
      let filtered = [...videoList];
      
      // Filter by Category
      if (selectedCategory !== 'All') {
          filtered = filtered.filter(v => 
              v.category === selectedCategory || 
              (!v.category && selectedCategory === 'General') // Handle legacy/null category
          );
      }

      // Sort
      filtered.sort((a, b) => {
          if (sortBy === 'popular') {
              return b.views - a.views;
          } else {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
      });

      return filtered;
  }, [videoList, selectedCategory, sortBy]);


  // --- DATA FETCHING ---
  const fetchChatHistory = async () => {
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
    
    if (data && !error) {
        const history = data.reverse().map((msg: any) => ({
            id: msg.id,
            user: msg.username,
            avatar: msg.avatar,
            text: msg.message,
            created_at: msg.created_at,
            is_me: user ? msg.user_id === user.id : false,
            reply_to_id: msg.reply_to_id,
            reply_context: msg.reply_context,
            type: msg.type || 'chat'
        }));
        setMessages(history);
    }
  };

  const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data && !error && data.length > 0) {
          const mapped: VideoContent[] = data.map((v: any) => ({
              id: v.id,
              user_id: v.user_id,
              username: v.username,
              avatar: v.avatar,
              title: v.title,
              description: v.description, // New Field
              source_reference: v.source_reference, // New Field
              category: v.category || 'General',
              platform: parseVideoUrl(v.youtube_id ? `youtube.com/watch?v=${v.youtube_id}` : '').platform || 'youtube', // Fallback for legacy
              youtube_id: v.youtube_id, // This field re-purposed for generic ID
              views: v.views,
              likes: v.likes,
              created_at: v.created_at
          }));
          setVideoList(mapped);
      }
  };

  const setupRealtime = () => {
    const channel = supabase.channel('public:chat_messages')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_messages' },
            (payload) => {
                const newMsg = payload.new;
                setMessages((prev) => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    
                    // Increment unread if chat is closed
                    if (!showChat) {
                        setUnreadCount(c => c + 1);
                        AudioSystem.playMessage();
                    }

                    return [...prev, {
                        id: newMsg.id,
                        user: newMsg.username,
                        avatar: newMsg.avatar,
                        text: newMsg.message,
                        created_at: newMsg.created_at,
                        is_me: user ? newMsg.user_id === user.id : false,
                        reply_to_id: newMsg.reply_to_id,
                        reply_context: newMsg.reply_context,
                        type: newMsg.type || 'chat'
                    }];
                });
            }
        )
        .subscribe();
    channelRef.current = channel;
  };

  // --- VIDEO PARSING UTILS ---
  const parseVideoUrl = (url: string): { platform: VideoPlatform, id: string } | null => {
      // YouTube
      const ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
      if (ytMatch && ytMatch[2].length === 11) return { platform: 'youtube', id: ytMatch[2] };

      // Twitch Stream: twitch.tv/username
      const twitchStreamMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)$/);
      if (twitchStreamMatch) return { platform: 'twitch_stream', id: twitchStreamMatch[1] };

      // Twitch Clip: twitch.tv/username/clip/id
      if (url.includes('twitch.tv') && url.includes('/clip/')) {
          const parts = url.split('/clip/');
          const id = parts[1].split('?')[0];
          return { platform: 'twitch_clip', id };
      }

      // Vimeo: vimeo.com/id
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) return { platform: 'vimeo', id: vimeoMatch[1] };

      // TikTok: tiktok.com/@user/video/id
      const tiktokMatch = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
      if (tiktokMatch) return { platform: 'tiktok', id: tiktokMatch[1] };

      return null;
  };

  const getVideoUrl = (video: VideoContent): string => {
      // If we start storing full URLs in future, handle it
      if (video.youtube_id.startsWith('http')) return video.youtube_id;

      const { platform, youtube_id } = video;
      switch (platform) {
          case 'youtube': return `https://www.youtube.com/watch?v=${youtube_id}`;
          case 'twitch_stream': return `https://www.twitch.tv/${youtube_id}`;
          case 'twitch_clip': return `https://clips.twitch.tv/${youtube_id}`;
          case 'vimeo': return `https://vimeo.com/${youtube_id}`;
          case 'tiktok': return `https://www.tiktok.com/video/${youtube_id}`; // Generic link attempt
          default: return `https://www.youtube.com/watch?v=${youtube_id}`;
      }
  };

  const getThumbnail = (video: VideoContent) => {
      const platform = video.platform || 'youtube';
      const id = video.youtube_id;

      if (platform === 'youtube') return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
      if (platform === 'vimeo') return `https://vumbnail.com/${id}.jpg`;
      
      return `https://image.pollinations.ai/prompt/pixel%20art%20${platform}%20video%20placeholder?width=480&height=360&nologo=true`;
  }

  // --- ACTIONS ---

  const handleOpenLink = (video: VideoContent) => {
      const url = getVideoUrl(video);
      window.open(url, '_blank');
      // Still count view
      if (video.user_id !== user?.id) {
          supabase.rpc('increment_video_likes', { vid_id: video.id }).catch(console.error); // Reuse increment logic or create view RPC
      }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const messageText = input.trim();
    const replyContext = replyTo ? { username: replyTo.user, message: replyTo.text.substring(0, 50) + (replyTo.text.length > 50 ? '...' : '') } : null;
    const replyId = replyTo ? replyTo.id : null;

    setInput('');
    setReplyTo(null);
    
    try {
        await supabase.from('chat_messages').insert({
            user_id: user.id,
            username: user.username,
            avatar: user.avatar,
            message: messageText,
            reply_to_id: replyId,
            reply_context: replyContext,
            type: 'chat'
        });
        if (onChat) onChat();
    } catch (err) {
        console.error("Failed to send message", err);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setBroadcastUrl(url);
      const parsed = parseVideoUrl(url);
      
      if (parsed) {
          setPreviewId(parsed.id);
          setPreviewPlatform(parsed.platform);
          // Auto-select 'Live' category for Twitch streams
          if (parsed.platform === 'twitch_stream') {
              setBroadcastCategory('Live');
          }
      } else {
          setPreviewId(null);
      }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      
      const parsed = parseVideoUrl(broadcastUrl);
      if (!parsed) {
          alert("Invalid URL. Supported: YouTube, Twitch, Vimeo, TikTok.");
          return;
      }
      
      if (!broadcastTitle.trim()) {
          alert("Please enter a title for your broadcast.");
          return;
      }

      // Check Cost - 1000 XP
      if (spendPoints) {
          const success = await spendPoints(1000);
          if (!success) return;
      }

      setIsSubmitting(true);
      try {
          // Store ID in youtube_id field
          const { data, error } = await supabase.from('videos').insert({
              user_id: user.id,
              username: user.username,
              avatar: user.avatar,
              title: broadcastTitle,
              description: broadcastDesc, // New field
              source_reference: broadcastSource, // New field (renamed to avoid SQL conflict with 'source')
              category: broadcastCategory,
              youtube_id: parsed.id, 
              views: 0,
              likes: 0
          }).select().single();

          if (error) throw error;

          if (data) {
              const newVideo: VideoContent = {
                  id: data.id,
                  user_id: user.id,
                  username: user.username,
                  avatar: user.avatar,
                  title: data.title,
                  description: data.description,
                  source_reference: data.source_reference,
                  category: data.category,
                  platform: parsed.platform,
                  youtube_id: data.youtube_id,
                  views: 0,
                  likes: 0,
                  created_at: data.created_at
              };
              setVideoList([newVideo, ...videoList]);
              setIsBroadcasting(false);
              setBroadcastUrl('');
              setBroadcastTitle('');
              setBroadcastDesc('');
              setBroadcastSource('');
              setPreviewId(null);
              
              // Reward Broadcaster
              if (onSocialAction) onSocialAction('share');
              AudioSystem.playAchievement();
              alert("Broadcast Listed! Users can now find your link on Journey TV.");
          }
      } catch (e: any) {
          console.error("Broadcast failed:", e);
          alert("Failed to broadcast: " + e.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleLikeVideo = async (e: React.MouseEvent, video: VideoContent) => {
      e.stopPropagation();
      if (!user) {
          alert("Login to support creators.");
          return;
      }
      if (onSocialAction) onSocialAction('like');
      
      // Optimistic Update
      const updatedList = videoList.map(v => v.id === video.id ? { ...v, likes: v.likes + 1 } : v);
      setVideoList(updatedList);

      try {
          const { error: likeError } = await supabase.from('video_likes').insert({
              user_id: user.id,
              video_id: video.id
          });

          if (!likeError) {
              await supabase.rpc('increment_video_likes', { vid_id: video.id });
              if (video.user_id !== user.id) {
                  await supabase.rpc('award_creator_xp', { creator_id: video.user_id, amount: 25 });
              }
          }
      } catch (e) {
          // Already liked or network error
      }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-black relative pt-14 md:pt-16 pb-20">
      
      {/* --- BROADCAST MODAL --- */}
      {isBroadcasting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-gray-800 border-4 border-red-600 rounded-xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scroll">
                  <div className="absolute -top-4 -left-4 bg-red-600 text-white font-bold px-3 py-1 font-retro text-xs border-2 border-white transform -rotate-3">
                      ON AIR
                  </div>
                  <h2 className="text-2xl font-retro text-white mb-4">Start Broadcast</h2>
                  <p className="text-gray-400 text-xs mb-6">
                      Share a link from YouTube, Twitch, Vimeo, or TikTok.
                  </p>
                  
                  <form onSubmit={handleBroadcast} className="space-y-4">
                      <div>
                          <label className="block text-gray-400 text-xs uppercase mb-1">Video/Stream URL *</label>
                          <input 
                              type="url" 
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="w-full bg-black border border-gray-600 p-2 text-white rounded focus:border-red-500 outline-none"
                              value={broadcastUrl}
                              onChange={handleUrlChange}
                              required
                          />
                      </div>

                      {/* Preview for Broadcast */}
                      {previewId && (
                          <div className="rounded overflow-hidden border border-gray-600 bg-black aspect-video relative group animate-slide-up flex flex-col items-center justify-center">
                              {/* Static Preview using Thumbnail logic */}
                              <img 
                                src={getThumbnail({ ...DEFAULT_VIDEO, youtube_id: previewId, platform: previewPlatform })}
                                className="w-full h-full object-cover opacity-60"
                                alt="Preview"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="bg-black/80 px-4 py-2 rounded border border-gray-500 text-center">
                                      <p className="text-green-400 font-bold text-xs mb-1">LINK VERIFIED</p>
                                      <p className="text-white text-[10px]">{previewPlatform.toUpperCase()}</p>
                                  </div>
                              </div>
                          </div>
                      )}

                      <div>
                          <label className="block text-gray-400 text-xs uppercase mb-1">Broadcast Title *</label>
                          <input 
                              type="text" 
                              placeholder="Sunday Service Live..."
                              className="w-full bg-black border border-gray-600 p-2 text-white rounded focus:border-red-500 outline-none"
                              value={broadcastTitle}
                              onChange={(e) => setBroadcastTitle(e.target.value)}
                              maxLength={50}
                              required
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-gray-400 text-xs uppercase mb-1">Category *</label>
                              <select
                                  value={broadcastCategory}
                                  onChange={(e) => setBroadcastCategory(e.target.value)}
                                  className="w-full bg-black border border-gray-600 p-2 text-white rounded focus:border-red-500 outline-none appearance-none"
                              >
                                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-gray-400 text-xs uppercase mb-1">Original Source</label>
                              <input 
                                  type="text" 
                                  placeholder="e.g. The Bible Project"
                                  className="w-full bg-black border border-gray-600 p-2 text-white rounded focus:border-red-500 outline-none"
                                  value={broadcastSource}
                                  onChange={(e) => setBroadcastSource(e.target.value)}
                                  maxLength={30}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-gray-400 text-xs uppercase mb-1">Description (Optional)</label>
                          <textarea 
                              placeholder="What is this broadcast about?"
                              className="w-full bg-black border border-gray-600 p-2 text-white rounded focus:border-red-500 outline-none h-20 resize-none text-sm"
                              value={broadcastDesc}
                              onChange={(e) => setBroadcastDesc(e.target.value)}
                              maxLength={200}
                          />
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                          <Button type="button" variant="secondary" onClick={() => setIsBroadcasting(false)} className="flex-1">Cancel</Button>
                          <Button type="submit" disabled={isSubmitting || !previewId} className="flex-1 bg-red-600 hover:bg-red-500 border-red-800">
                              {isSubmitting ? 'Posting...' : 'Go Live (-1000 XP)'}
                          </Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- HERO CAROUSEL (Updated Layout) --- */}
      <div className="w-full bg-gray-900 border-b border-gray-800 relative overflow-hidden group">
          {videoList.length > 0 ? (
              <div className="relative w-full h-full min-h-[500px] md:h-[60vh] flex items-center">
                  
                  {/* Background Blur Layer */}
                  <div className="absolute inset-0 bg-black z-0">
                      <img 
                        src={getThumbnail(videoList[currentSlide])} 
                        className="w-full h-full object-cover opacity-40 blur-2xl scale-110 transition-all duration-1000"
                        alt=""
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-black/20"></div>
                  </div>

                  {/* Featured Content Container */}
                  <div className="container mx-auto px-6 relative z-10 py-12 md:py-0 w-full">
                      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 max-w-6xl mx-auto">
                          
                          {/* Poster Image */}
                          <div 
                            onClick={() => handleOpenLink(videoList[currentSlide])}
                            className="w-full max-w-sm md:w-[500px] shrink-0 perspective-1000"
                          >
                              <div className="aspect-video rounded-xl shadow-2xl border-4 border-white/10 hover:border-yellow-500 transition-all cursor-pointer group/poster relative overflow-hidden bg-black transform hover:scale-[1.02] hover:rotate-1">
                                  <img 
                                    src={getThumbnail(videoList[currentSlide])} 
                                    className="w-full h-full object-cover" 
                                    alt={videoList[currentSlide].title}
                                  />
                                  {/* Play Button Overlay */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/poster:opacity-100 transition-opacity bg-black/40">
                                      <div className="bg-red-600 text-white rounded-full p-4 shadow-lg scale-0 group-hover/poster:scale-100 transition-transform duration-300">
                                          <span className="text-3xl pl-1">▶</span>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Info Column */}
                          <div className="flex-1 text-center md:text-left space-y-4 w-full">
                              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded uppercase animate-pulse shadow-red-500/50 shadow-sm">
                                      FEATURED
                                  </span>
                                  <span className="text-gray-300 text-xs font-mono border border-gray-500 bg-gray-800/50 px-2 py-1 rounded">
                                      {videoList[currentSlide].platform?.replace('_stream', '').toUpperCase() || 'YOUTUBE'}
                                  </span>
                                  {videoList[currentSlide].source_reference && (
                                      <span className="text-yellow-400 text-xs font-bold border border-yellow-600/50 bg-yellow-900/20 px-2 py-1 rounded">
                                          {videoList[currentSlide].source_reference}
                                      </span>
                                  )}
                              </div>
                              
                              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold font-retro text-white leading-tight text-shadow-lg line-clamp-3">
                                  {videoList[currentSlide].title}
                              </h2>
                              
                              {videoList[currentSlide].description && (
                                <p className="text-gray-300 text-sm md:text-base font-serif italic line-clamp-3 max-w-xl mx-auto md:mx-0 border-l-4 border-yellow-500/50 pl-4">
                                    "{videoList[currentSlide].description}"
                                </p>
                              )}
                              
                              <div className="flex items-center justify-center md:justify-start gap-3 pt-2">
                                  <img src={videoList[currentSlide].avatar} className="w-8 h-8 rounded-full border border-gray-500" alt="" />
                                  <div className="text-left">
                                      <p className="text-gray-400 text-xs uppercase tracking-widest">Broadcast By</p>
                                      <p className="text-white text-sm font-bold">{videoList[currentSlide].username}</p>
                                  </div>
                              </div>

                              <div className="flex justify-center md:justify-start gap-3 pt-4">
                                  <button 
                                    onClick={() => handleOpenLink(videoList[currentSlide])}
                                    className="bg-white text-black font-bold py-3 px-8 rounded hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm uppercase tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 transform duration-200"
                                  >
                                      <span>▶</span> Watch Now
                                  </button>
                                  <button 
                                    onClick={(e) => handleLikeVideo(e, videoList[currentSlide])}
                                    className="bg-gray-800/80 backdrop-blur text-white font-bold py-3 px-6 rounded hover:bg-gray-700 border border-gray-600 transition-colors flex items-center gap-2 text-sm hover:border-red-500 hover:text-red-400"
                                  >
                                      <span>❤️</span> {videoList[currentSlide].likes}
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Dots Navigation */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                      {videoList.slice(0, 5).map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-yellow-500 w-8' : 'bg-gray-600 w-2 hover:bg-gray-400'}`}
                          />
                      ))}
                  </div>
              </div>
          ) : (
              <div className="h-[50vh] flex items-center justify-center text-gray-500 bg-gray-900">
                  <div className="text-center animate-pulse">
                      <div className="text-5xl mb-4">📡</div>
                      <p className="font-retro">Scanning Frequencies...</p>
                  </div>
              </div>
          )}
      </div>

      {/* --- PROGRAM GUIDE & CONTROLS --- */}
      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6">
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4 sticky top-14 z-40 bg-black/80 backdrop-blur-md -mx-4 px-4 py-2 md:mx-0 md:px-0 md:bg-transparent">
              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scroll no-scrollbar">
                  {CATEGORIES.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                            selectedCategory === cat 
                            ? 'bg-yellow-500 text-black border-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.4)]' 
                            : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                          {cat}
                      </button>
                  ))}
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <Button onClick={() => setIsBroadcasting(true)} className="bg-red-600 hover:bg-red-500 border-red-800 py-1.5 px-4 text-xs whitespace-nowrap shadow-lg shadow-red-900/20">
                      Start Broadcast
                  </Button>
                  <Button onClick={onBack} variant="secondary" className="py-1.5 px-4 text-xs">
                      Back
                  </Button>
              </div>
          </div>

          {/* Video Grid - 3 Columns on Mobile (Compact) */}
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-6">
              {filteredAndSortedVideos.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                      <div className="text-4xl mb-4 opacity-50">📺</div>
                      <p>No broadcasts found in this category.</p>
                      <button 
                        onClick={() => setIsBroadcasting(true)} 
                        className="text-blue-400 hover:underline mt-2 text-sm"
                      >
                        Be the first to broadcast!
                      </button>
                  </div>
              ) : (
                  filteredAndSortedVideos.map(video => (
                  <div 
                    key={video.id}
                    onClick={() => handleOpenLink(video)}
                    className="bg-gray-800 rounded-lg md:rounded-xl overflow-hidden border border-gray-700 hover:border-yellow-500 transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-xl relative"
                  >
                      {/* Thumbnail Container */}
                      <div className="aspect-video bg-black relative overflow-hidden">
                          <img 
                            src={getThumbnail(video)} 
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            alt={video.title}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                          
                          {/* Top Badge */}
                          <div className="absolute top-1 left-1 md:top-2 md:left-2 flex gap-1">
                              {video.category && (
                                <span className={`text-[8px] md:text-[9px] px-1 md:px-1.5 py-0.5 rounded border backdrop-blur-sm uppercase font-bold ${video.category === 'Live' ? 'bg-red-600 border-red-400 text-white' : 'bg-blue-900/80 text-blue-200 border-blue-700'}`}>
                                    {video.category === 'Live' ? 'LIVE' : video.category.substring(0,4)}
                                </span>
                              )}
                          </div>

                          {/* Link Icon Overlay */}
                          <div className="absolute top-1 right-1 md:top-2 md:right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="bg-black/60 text-white rounded p-1">
                                  <span className="text-xs">↗️</span>
                              </div>
                          </div>

                          {/* Mobile Only Title Overlay */}
                          <div className="absolute bottom-0 left-0 p-1 w-full md:hidden">
                              <h4 className="text-white text-[9px] font-bold leading-tight line-clamp-2 drop-shadow-md">
                                  {video.title}
                              </h4>
                              <div className="flex items-center gap-1 mt-0.5 opacity-80">
                                  <span className="text-[8px] text-gray-300">{video.views > 1000 ? `${(video.views/1000).toFixed(1)}k` : video.views} views</span>
                              </div>
                          </div>
                      </div>

                      {/* Desktop Details */}
                      <div className="p-3 hidden md:block">
                          <h4 className="text-white text-sm font-bold line-clamp-2 mb-2 group-hover:text-yellow-400 transition-colors">
                              {video.title}
                          </h4>
                          <div className="flex items-center gap-2">
                              <img src={video.avatar} className="w-6 h-6 rounded-full border border-gray-600" alt="" />
                              <div className="min-w-0 flex-1">
                                  <p className="text-gray-400 text-xs truncate">{video.username}</p>
                                  <div className="flex justify-between items-center w-full mt-1">
                                      <p className="text-gray-600 text-[10px]">{new Date(video.created_at).toLocaleDateString()}</p>
                                      <button 
                                        onClick={(e) => handleLikeVideo(e, video)}
                                        className="text-gray-500 hover:text-red-500 text-[10px] flex items-center gap-1 transition-colors"
                                      >
                                          ❤️ {video.likes}
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )))}
          </div>
      </div>

      {/* --- FLOATING CHAT --- */}
      
      {/* 1. Toggle Button */}
      <button 
        onClick={() => { setShowChat(!showChat); setUnreadCount(0); }}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 bg-blue-600 hover:bg-blue-500 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-2 border-white"
        title="Live Chat"
      >
          <span className="text-2xl">💬</span>
          {unreadCount > 0 && !showChat && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-black animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
              </div>
          )}
      </button>

      {/* 2. Chat Overlay Window */}
      <div 
        className={`
            fixed bottom-24 right-4 md:right-6 z-[60] 
            w-[calc(100%-2rem)] md:w-80 h-[50vh] md:h-[60vh] 
            bg-gray-900 border-2 border-blue-500 rounded-xl shadow-2xl flex flex-col overflow-hidden
            transition-all duration-300 origin-bottom-right
            ${showChat ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none translate-y-10'}
        `}
      >
          {/* Chat Header */}
          <div className="bg-blue-600 p-3 flex justify-between items-center text-white cursor-pointer" onClick={() => setShowChat(false)}>
              <div className="flex items-center gap-2">
                  <span className="text-sm font-bold font-retro">LIVE CHAT</span>
                  <span className="flex items-center gap-1 bg-black/20 px-2 py-0.5 rounded text-[9px]">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                      ONLINE
                  </span>
              </div>
              <button className="text-white/80 hover:text-white text-lg">✕</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs custom-scroll bg-gray-950/90">
              {messages.length === 0 && (
                  <div className="text-center text-gray-600 mt-10">
                      <p>No messages yet.</p>
                      <p className="text-[10px]">Be the first to say hello!</p>
                  </div>
              )}
              {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.is_me ? 'flex-row-reverse text-right' : ''}`}>
                      {msg.avatar && (
                          <div className="w-6 h-6 rounded border border-gray-700 overflow-hidden shrink-0">
                              <img src={msg.avatar} className="w-full h-full object-cover" />
                          </div>
                      )}
                      <div className={`flex flex-col ${msg.is_me ? 'items-end' : 'items-start'} max-w-[85%]`}>
                          <span className={`font-bold text-[10px] mb-0.5 ${msg.is_me ? 'text-yellow-500' : 'text-blue-400'}`}>
                              {msg.user}
                          </span>
                          <div className={`px-2 py-1.5 rounded break-words ${msg.is_me ? 'bg-blue-900/40 text-blue-100' : 'bg-gray-800 text-gray-300'}`}>
                              {msg.text}
                          </div>
                      </div>
                  </div>
              ))}
              <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendChat} className="p-2 bg-gray-900 border-t border-gray-800">
              <div className="flex gap-2">
                  <input 
                      type="text" 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={user ? "Type a message..." : "Login to chat"}
                      disabled={!user}
                      className="flex-1 bg-black text-white p-2 rounded border border-gray-700 focus:border-yellow-500 outline-none text-xs"
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded text-xs font-bold" disabled={!user || !input.trim()}>
                      ➤
                  </button>
              </div>
          </form>
      </div>

    </div>
  );
};

export default JourneyTVView;
