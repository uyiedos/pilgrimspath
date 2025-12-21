
import React, { useState, useEffect, useMemo } from 'react';
import Button from './Button';
import { User, VideoContent, VideoPlatform } from '../types';
import { LanguageCode, UI_TEXT } from '../translations';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import VideoPlayerModal from './VideoPlayerModal';

interface JourneyTVViewProps {
  user: User | null;
  onBack: () => void;
  onChat?: () => void;
  language?: LanguageCode;
  spendPoints?: (amount: number, type?: string) => Promise<boolean>;
}

const CATEGORIES = ['All', 'Live', 'Worship', 'Music', 'Sermons', 'Movies', 'Events', 'Lofi', 'Testimonies'];

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

const JourneyTVView: React.FC<JourneyTVViewProps> = ({ user, onBack, language = 'en', spendPoints }) => {
  const [videoList, setVideoList] = useState<VideoContent[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Filters & Sorting
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('recent');

  // Broadcast Form
  const [broadcastUrl, setBroadcastUrl] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastDesc, setBroadcastDesc] = useState('');
  const [broadcastSource, setBroadcastSource] = useState('');
  const [broadcastCategory, setBroadcastCategory] = useState('Worship');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<VideoPlatform>('youtube');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT.en[key];

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
      const interval = setInterval(() => {
          if (!isBroadcasting && videoList.length > 0) {
              setCurrentSlide(prev => (prev + 1) % Math.min(5, videoList.length));
          }
      }, 8000);
      return () => clearInterval(interval);
  }, [videoList.length, isBroadcasting]);

  const filteredAndSortedVideos = useMemo(() => {
      let filtered = [...videoList];
      if (selectedCategory !== 'All') {
          filtered = filtered.filter(v => v.category === selectedCategory || (!v.category && selectedCategory === 'General'));
      }
      filtered.sort((a, b) => {
          if (sortBy === 'popular') return b.views - a.views;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      return filtered;
  }, [videoList, selectedCategory, sortBy]);

  const fetchVideos = async () => {
      const { data, error } = await supabase.from('videos').select('*').order('created_at', { ascending: false }).limit(50);
      if (data && !error && data.length > 0) {
          const mapped: VideoContent[] = data.map((v: any) => ({
              id: v.id, user_id: v.user_id, username: v.username, avatar: v.avatar, title: v.title,
              description: v.description, source_reference: v.source_reference, category: v.category || 'General',
              platform: parseVideoUrl(v.youtube_id ? `youtube.com/watch?v=${v.youtube_id}` : '')?.platform || 'youtube',
              youtube_id: v.youtube_id, views: v.views, likes: v.likes, created_at: v.created_at
          }));
          setVideoList(mapped);
      }
  };

  const parseVideoUrl = (url: string): { platform: VideoPlatform, id: string } | null => {
      const ytMatch = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
      if (ytMatch && ytMatch[2].length === 11) return { platform: 'youtube', id: ytMatch[2] };
      const twitchStreamMatch = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)$/);
      if (twitchStreamMatch) return { platform: 'twitch_stream', id: twitchStreamMatch[1] };
      if (url.includes('twitch.tv') && url.includes('/clip/')) {
          const parts = url.split('/clip/');
          const id = parts[1].split('?')[0];
          return { platform: 'twitch_clip', id };
      }
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) return { platform: 'vimeo', id: vimeoMatch[1] };
      const tiktokMatch = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
      if (tiktokMatch) return { platform: 'tiktok', id: tiktokMatch[1] };
      return null;
  };

  const getThumbnail = (video: VideoContent) => {
      if (!video) return '';
      const platform = video.platform || 'youtube';
      const id = video.youtube_id;
      if (platform === 'youtube') return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
      if (platform === 'vimeo') return `https://vumbnail.com/${id}.jpg`;
      return `https://image.pollinations.ai/prompt/pixel%20art%20${platform}%20video%20placeholder?width=480&height=360&nologo=true`;
  }

  const handleOpenVideo = (video: VideoContent) => {
      AudioSystem.playVoxelTap();
      setSelectedVideo(video);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setBroadcastUrl(url);
      const parsed = parseVideoUrl(url);
      if (parsed) {
          setPreviewId(parsed.id);
          setPreviewPlatform(parsed.platform);
          if (parsed.platform === 'twitch_stream') setBroadcastCategory('Live');
      } else { setPreviewId(null); }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      const parsed = parseVideoUrl(broadcastUrl);
      if (!parsed) { alert("Invalid URL. Supported: YouTube, Twitch, Vimeo, TikTok."); return; }
      if (!broadcastTitle.trim()) { alert("Please enter a title for your broadcast."); return; }
      if (spendPoints) {
          const success = await spendPoints(1000, 'broadcast_fee');
          if (!success) return;
      }
      setIsSubmitting(true);
      try {
          const { data, error } = await supabase.from('videos').insert({ user_id: user.id, username: user.username, avatar: user.avatar, title: broadcastTitle, description: broadcastDesc, source_reference: broadcastSource, category: broadcastCategory, youtube_id: parsed.id, views: 0, likes: 0 }).select().single();
          if (error) throw error;
          if (data) {
              const newVideo: VideoContent = { id: data.id, user_id: user.id, username: user.username, avatar: user.avatar, title: data.title, description: data.description, source_reference: data.source_reference, category: data.category, platform: parsed.platform, youtube_id: data.youtube_id, views: 0, likes: 0, created_at: data.created_at };
              setVideoList([newVideo, ...videoList]);
              setIsBroadcasting(false);
              setBroadcastUrl('');
              setBroadcastTitle('');
              setBroadcastDesc('');
              setBroadcastSource('');
              setPreviewId(null);
              AudioSystem.playAchievement();
              alert("Broadcast Listed!");
          }
      } catch (e: any) { alert("Failed to broadcast: " + e.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-black/60 backdrop-blur-xl relative pt-14 md:pt-16 pb-20 overflow-x-hidden">
      {selectedVideo && <VideoPlayerModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />}
      
      {/* BROADCAST MODAL */}
      {isBroadcasting && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-gray-800 border-4 border-red-600 rounded-xl max-w-md w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scroll">
                  <div className="absolute -top-4 -left-4 bg-red-600 text-white font-bold px-3 py-1 font-retro text-xs border-2 border-white transform -rotate-3">ON AIR</div>
                  <h2 className="text-2xl font-retro text-white mb-4">Start Broadcast</h2>
                  <p className="text-gray-400 text-xs mb-6">Share a link from YouTube, Twitch, Vimeo, or TikTok.</p>
                  <form onSubmit={handleBroadcast} className="space-y-4">
                      <div>
                          <label className="block text-gray-400 text-xs uppercase mb-1">Video/Stream URL *</label>
                          <input type="url" placeholder="https://www.youtube.com/watch?v=..." className="w-full bg-black border border-gray-600 p-2 text-white rounded focus:border-red-500 outline-none" value={broadcastUrl} onChange={handleUrlChange} required />
                      </div>
                      {previewId && (
                          <div className="rounded overflow-hidden border border-gray-600 bg-black aspect-video relative group animate-slide-up flex flex-col items-center justify-center">
                              <img src={getThumbnail({ ...DEFAULT_VIDEO, youtube_id: previewId, platform: previewPlatform })} className="w-full h-full object-cover opacity-60" alt="Preview" />
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
                          <input type="text" placeholder="Sunday Service Live..." className="w-full bg-black border border-gray-600 p-2 text-white rounded focus:border-red-500 outline-none" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} maxLength={50} required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-gray-400 text-xs uppercase mb-1">Category *</label>
                              <select value={broadcastCategory} onChange={(e) => setBroadcastCategory(e.target.value)} className="w-full bg-black border border-gray-600 p-2 text-white rounded focus:border-red-500 outline-none appearance-none">
                                  {CATEGORIES.filter(c => c !== 'All').map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-gray-400 text-xs uppercase mb-1">Original Source</label>
                              <input type="text" placeholder="e.g. The Bible Project" className="w-full bg-black border border-gray-600 p-2 text-white rounded focus:border-red-500 outline-none" value={broadcastSource} onChange={(e) => setBroadcastSource(e.target.value)} maxLength={30} />
                          </div>
                      </div>
                      <div>
                          <label className="block text-gray-400 text-xs uppercase mb-1">Description (Optional)</label>
                          <textarea placeholder="What is this broadcast about?" className="w-full bg-black border border-gray-600 p-2 text-white rounded focus:border-red-500 outline-none h-20 resize-none text-sm" value={broadcastDesc} onChange={(e) => setBroadcastDesc(e.target.value)} maxLength={200} />
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

      {/* HERO CAROUSEL */}
      <div className="w-full relative overflow-hidden group">
          {videoList.length > 0 ? (
              <div className="relative w-full h-full min-h-[300px] md:h-[40vh] flex items-center">
                  <div className="absolute inset-0 bg-black/60 z-0">
                      <img src={getThumbnail(videoList[currentSlide])} className="w-full h-full object-cover opacity-30 blur-xl scale-110 transition-all duration-1000" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                  </div>
                  <div className="container mx-auto px-6 relative z-10 py-6 md:py-0 w-full">
                      <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 max-w-6xl mx-auto">
                          <div onClick={() => handleOpenVideo(videoList[currentSlide])} className="w-full max-w-[280px] md:w-[380px] shrink-0 perspective-1000">
                              <div className="aspect-video rounded-3xl shadow-2xl border-4 border-white/10 hover:border-yellow-500 transition-all cursor-pointer group/poster relative overflow-hidden bg-black transform hover:scale-[1.02]">
                                  <img src={getThumbnail(videoList[currentSlide])} className="w-full h-full object-cover" alt={videoList[currentSlide].title} />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/poster:opacity-100 transition-opacity bg-black/40">
                                      <div className="bg-red-600 text-white rounded-full p-3 shadow-lg scale-0 group-hover/poster:scale-100 transition-transform duration-300"><span className="text-xl pl-1">▶</span></div>
                                  </div>
                              </div>
                          </div>
                          <div className="flex-1 text-center md:text-left space-y-2 w-full">
                              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                                  <span className="bg-red-600 text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase animate-pulse shadow-red-500/50 shadow-sm">FEATURED</span>
                                  <span className="text-gray-300 text-[9px] font-mono border border-white/10 backdrop-blur-md px-2 py-1 rounded-full uppercase">{videoList[currentSlide].platform?.replace('_stream', '').toUpperCase() || 'YOUTUBE'}</span>
                              </div>
                              <h2 className="text-xl md:text-3xl lg:text-4xl font-bold font-retro text-white leading-tight drop-shadow-md line-clamp-2">{videoList[currentSlide].title}</h2>
                              <div className="flex justify-center md:justify-start gap-3 pt-4">
                                  <button onClick={() => handleOpenVideo(videoList[currentSlide])} className="bg-white text-black font-bold py-3 px-8 rounded-full hover:bg-gray-200 transition-all flex items-center gap-2 text-[10px] uppercase tracking-wide shadow-xl hover:scale-105 active:scale-95"><span>▶</span> WATCH NOW</button>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
                      {videoList.slice(0, 5).map((_, idx) => (<button key={idx} onClick={() => setCurrentSlide(idx)} className={`h-1 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-yellow-500 w-6' : 'bg-white/20 w-1.5 hover:bg-white/40'}`} />))}
                  </div>
              </div>
          ) : (
              <div className="h-[30vh] flex items-center justify-center text-gray-500">
                  <div className="text-center animate-pulse">
                      <div className="text-4xl mb-4">📡</div>
                      <p className="font-retro text-[10px] uppercase tracking-widest">Scanning Frequencies...</p>
                  </div>
              </div>
          )}
      </div>

      {/* PROGRAM GUIDE */}
      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 space-y-6 relative z-30">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4 sticky top-14 z-40 backdrop-blur-xl -mx-4 px-4 py-2 md:mx-0 md:px-0">
              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scroll no-scrollbar">
                  {CATEGORIES.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${selectedCategory === cat ? 'bg-yellow-500 text-black border-yellow-400 shadow-lg' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'}`}>{cat}</button>))}
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <Button onClick={() => setIsBroadcasting(true)} className="bg-red-600 hover:bg-red-500 border-red-400 py-2 px-6 text-[10px] whitespace-nowrap shadow-lg">Start Broadcast</Button>
                  <Button onClick={onBack} variant="secondary" className="py-2 px-6 text-[10px] bg-white/5 border-white/10">Back</Button>
              </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {filteredAndSortedVideos.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-gray-500 bg-white/5 backdrop-blur-md rounded-[2.5rem] border-4 border-dashed border-white/10"><div className="text-5xl mb-4 opacity-40">📺</div><p className="font-serif italic text-xl">The airwaves are silent in this sector.</p></div>
              ) : (
                  filteredAndSortedVideos.map(video => (
                  <div key={video.id} onClick={() => handleOpenVideo(video)} className="bg-black/30 backdrop-blur-md rounded-3xl overflow-hidden border-2 border-white/5 border-white/5 transition-all cursor-pointer group hover:-translate-y-2 hover:shadow-2xl relative">
                      <div className="aspect-video bg-black relative overflow-hidden">
                          <img src={getThumbnail(video)} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt={video.title} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                          <div className="absolute top-2 left-2 flex gap-1">
                              {video.category && (<span className={`text-[7px] md:text-[8px] px-2 py-0.5 rounded-full border backdrop-blur-md uppercase font-bold shadow-lg ${video.category === 'Live' ? 'bg-red-600 border-red-400 text-white' : 'bg-blue-900/80 text-blue-200 border-blue-800'}`}>{video.category === 'Live' ? 'LIVE' : video.category}</span>)}
                          </div>
                      </div>
                      <div className="p-4">
                          <h4 className="text-white text-[11px] md:text-sm font-bold line-clamp-2 mb-3 transition-colors leading-tight h-8 md:h-10">{video.title}</h4>
                          <div className="flex items-center gap-2 border-t border-white/5 pt-3">
                              <img src={video.avatar} className="w-6 h-6 rounded-full border-2 border-white/10 shadow-lg object-cover" alt="" />
                              <div className="min-w-0 flex-1">
                                  <p className="text-gray-400 text-[9px] md:text-[10px] truncate font-mono uppercase tracking-tighter">{video.username}</p>
                                  <div className="flex justify-between items-center w-full mt-0.5"><p className="text-gray-600 text-[8px] md:text-[9px]">{new Date(video.created_at).toLocaleDateString()}</p></div>
                              </div>
                          </div>
                      </div>
                  </div>
              )))}
          </div>
          <div className="h-20"></div>
      </div>
    </div>
  );
};

export default JourneyTVView;
