
import React, { useState, useEffect, useRef } from 'react';
import { AppView, VideoContent } from '../types';
import { AudioSystem } from '../utils/audio';
import { supabase } from '../lib/supabase';
import { GoogleGenAI } from "@google/genai";
import { fetchWebContent } from '../services/geminiService';
import YouTubePlayer from './YouTubePlayer';

interface BrowserViewProps {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
  onAddPoints: (amount: number) => void;
  initialUrl?: string | null;
  activeVideo?: VideoContent | null;
}

const WISDOM_SITES = [
  { name: 'Bible Gateway', url: 'https://www.biblegateway.com' },
  { name: 'Bible Project', url: 'https://bibleproject.com' },
  { name: 'Sermon Index', url: 'https://www.sermonindex.net' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Bible' },
  { name: 'Google Search', url: 'google.com' }
];

const BrowserView: React.FC<BrowserViewProps> = ({ onBack, onNavigate, onAddPoints, initialUrl, activeVideo }) => {
  const [url, setUrl] = useState(initialUrl || 'https://bibleproject.com');
  const [inputUrl, setInputUrl] = useState(initialUrl || 'https://bibleproject.com');
  const [wisdomXP, setWisdomXP] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([initialUrl || 'https://bibleproject.com']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [suggestedVideos, setSuggestedVideos] = useState<VideoContent[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoContent | null>(activeVideo || null);
  
  // Media & Mode States
  const [mediaMode, setMediaMode] = useState<'web' | 'video' | 'audio' | 'manifest' | 'search_home' | 'relay'>('web');
  const [manifestContent, setManifestContent] = useState<{ text: string, sources: any[] } | null>(null);
  const [relayVideoId, setRelayVideoId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // UI State
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isSmartMode, setIsSmartMode] = useState(true); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [showIframeWarning, setShowIframeWarning] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const xpIntervalRef = useRef<any>(null);

  // Check if a site is likely to block iframes
  const isLikelyBlocked = (targetUrl: string) => {
      const blocked = ['google.com', 'wikipedia.org', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'nytimes.com', 'amazon.com'];
      return blocked.some(domain => targetUrl.toLowerCase().includes(domain));
  };

  useEffect(() => {
    fetchSuggestions();
    fetchActivity();
    if (initialUrl && initialUrl !== url) {
        checkAndSetUrl(initialUrl);
    }
    if (activeVideo) {
        setCurrentVideo(activeVideo);
        setMediaMode('web');
    }
  }, [initialUrl, activeVideo]);

  const fetchSuggestions = async () => {
    const { data } = await supabase.from('videos').select('*').order('created_at', { ascending: false }).limit(6);
    if (data) setSuggestedVideos(data);
  };

  const fetchActivity = async () => {
      const { data } = await supabase.from('activity_feed').select('*').order('created_at', { ascending: false }).limit(10);
      if (data) setActivityFeed(data);
  };

  useEffect(() => {
    xpIntervalRef.current = setInterval(() => {
        setWisdomXP(prev => {
            const next = prev + 1;
            if (next % 5 === 0) { 
                onAddPoints(5);
                AudioSystem.playVoxelTap();
            }
            return next;
        });
    }, 60000);

    return () => {
        if (xpIntervalRef.current) clearInterval(xpIntervalRef.current);
    };
  }, []);

  const detectMediaType = (targetUrl: string): 'web' | 'video' | 'audio' => {
      const videoExts = ['.mp4', '.webm', '.ogv', '.mov'];
      const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
      const lowercase = targetUrl.toLowerCase();
      
      if (videoExts.some(ext => lowercase.endsWith(ext) || lowercase.includes(ext + '?'))) return 'video';
      if (audioExts.some(ext => lowercase.endsWith(ext) || lowercase.includes(ext + '?'))) return 'audio';
      return 'web';
  };

  const extractYoutubeId = (targetUrl: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = targetUrl.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleManifestExtraction = async (targetUrl: string) => {
      setIsLoading(true);
      setMediaMode('manifest');
      setShowIframeWarning(false);
      AudioSystem.playVoxelTap();
      
      const result = await fetchWebContent(targetUrl);
      if (result) {
          setManifestContent(result);
          onAddPoints(15); 
          AudioSystem.playLevelComplete();
      } else {
          setManifestContent({ text: "The Nexus was unable to manifest this realm. The spiritual barrier is too strong.", sources: [] });
      }
      setIsLoading(false);
  };

  const checkAndSetUrl = (target: string) => {
      const lower = target.toLowerCase();

      // 0. Search Home Interception
      if (lower === 'google.com' || lower === 'https://google.com' || lower === 'http://google.com') {
          setMediaMode('search_home');
          setUrl(target);
          setInputUrl(target);
          setIsTheaterMode(false);
          return;
      }

      // 1. Direct File Check (Highest Priority)
      const type = detectMediaType(target);
      if (type !== 'web') {
          setMediaMode(type);
          setUrl(target);
          setInputUrl(target);
          setIsTheaterMode(true);
          analyzeMediaMetadata(target, type);
          return;
      }

      // 2. Smart Mode Processing
      if (isSmartMode) {
          const ytId = extractYoutubeId(target);
          if (ytId) {
              setRelayVideoId(ytId);
              setMediaMode('relay');
              setUrl(target);
              setInputUrl(target); 
              setIsTheaterMode(true);
              return;
          }
          
          if (isLikelyBlocked(target)) {
              handleManifestExtraction(target);
              return;
          }
      }

      // 3. Fallback Web
      setMediaMode('web');
      setUrl(target);
      setInputUrl(target);
      setIsLoading(true);
      setShowIframeWarning(true);
  };

  const analyzeMediaMetadata = async (fileUrl: string, type: string) => {
      const fileName = fileUrl.split('/').pop() || 'Sacred Media';
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Analyze this media filename: "${fileName}". Type: ${type}. Provide a 1-sentence "Spiritual Context" for this content.`,
              config: { systemInstruction: "You are the Nexus Media Chaplain." }
          });
          setAnalysisResult(`[AUTO_ANALYSIS]: ${response.text}`);
      } catch (e) {
          setAnalysisResult(`[SIGNAL_LOCKED]: Manifesting direct ${type} stream...`);
      }
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let target = inputUrl.trim();
    
    if (target.startsWith('journey://')) {
        const viewName = target.replace('journey://', '').toUpperCase();
        const foundView = (AppView as any)[viewName];
        if (foundView) {
            AudioSystem.playLevelComplete();
            onNavigate(foundView);
            return;
        }
    }

    if (!target.startsWith('http') && !target.startsWith('blob:')) {
        if (target.includes('.') && !target.includes(' ')) {
            target = 'https://' + target;
        } else {
            // It's a search query
            handleManifestExtraction(target);
            return;
        }
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setManifestContent(null);
    
    checkAndSetUrl(target);
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(target);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const analyzeResonance = async () => {
      setIsAnalyzing(true);
      setAnalysisResult(null);
      AudioSystem.playVoxelTap();

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const contentToAnalyze = mediaMode === 'manifest' ? manifestContent?.text : (currentVideo ? `Video Title: ${currentVideo.title}` : `URL: ${url}`);
          
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Analyze the following content for spiritual resonance and biblical themes: ${contentToAnalyze}. Provide a concise 2-sentence "Spiritual Insight" and a "Soul Takeaway". Format as: INSIGHT: [text] TAKEAWAY: [text]`,
              config: {
                  systemInstruction: "You are the Nexus Spiritual Intelligence. You analyze secular and sacred content to find God's fingerprints."
              }
          });

          setAnalysisResult(response.text);
          AudioSystem.playMessage();
          onAddPoints(10);
      } catch (e) {
          setAnalysisResult("The archives are clouded. Spiritual signal weak.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  const selectVideo = (video: VideoContent) => {
      AudioSystem.playVoxelTap();
      setRelayVideoId(video.youtube_id);
      setMediaMode('relay');
      setUrl(`https://youtube.com/watch?v=${video.youtube_id}`);
      setInputUrl(`https://youtube.com/watch?v=${video.youtube_id}`);
      setCurrentVideo(video);
      setAnalysisResult(null);
      setManifestContent(null);
      setIsLoading(true);
      setIsTheaterMode(true);
  };

  const openExternal = () => {
      if (inputUrl) {
          window.open(inputUrl, '_blank');
          AudioSystem.playVoxelTap();
      }
  };

  return (
    <div className={`min-h-screen bg-black flex flex-col pt-16 md:pt-20 animate-fade-in relative overflow-hidden transition-all duration-700 ${isFocusMode ? 'brightness-75' : ''}`}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,100,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,100,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-0"></div>
        <div className={`absolute inset-0 bg-gradient-to-tr pointer-events-none z-0 transition-colors duration-1000 ${mediaMode === 'audio' ? 'from-amber-900/20' : mediaMode === 'video' ? 'from-teal-900/20' : mediaMode === 'manifest' || mediaMode === 'search_home' ? 'from-green-900/20' : 'from-blue-900/10'} via-transparent to-purple-900/10`}></div>

        {!isFocusMode && (
            <div className="relative z-20 w-full bg-black/80 backdrop-blur-3xl border-b border-white/10 p-3 md:p-4 flex flex-col md:flex-row items-center gap-4 shadow-2xl transition-all duration-500">
                <div className="flex gap-2 shrink-0">
                    <button onClick={onBack} className="p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 border border-white/10 transition-all shadow-lg active:scale-90" title="Sanctuary Home">🏠</button>
                    <button onClick={() => historyIndex > 0 && checkAndSetUrl(history[historyIndex - 1])} disabled={historyIndex === 0} className="p-3 bg-white/5 text-white rounded-xl hover:bg-white/10 border border-white/10 disabled:opacity-10 transition-all">◀</button>
                </div>

                <form onSubmit={handleNavigate} className="flex-1 flex gap-2 w-full">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-0 bg-blue-500/10 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700"></div>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 font-mono text-[10px] opacity-40 uppercase">NEXUS://</div>
                        <input 
                            type="text" 
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            placeholder="Type URL, Query, or local file..."
                            className="relative w-full bg-black border-2 border-blue-900/50 rounded-xl p-3 pl-20 text-blue-300 text-sm font-mono outline-none focus:border-blue-400 transition-all shadow-inner"
                        />
                        {isLoading && <div className="absolute right-12 top-3 animate-spin text-blue-500 text-xl">💠</div>}
                        
                        <button 
                            type="button" 
                            onClick={openExternal}
                            title="Open Direct Link Externally"
                            className="absolute right-2 top-2 p-1.5 hover:bg-blue-900/50 rounded text-blue-400 hover:text-white transition-colors text-xs"
                        >
                            ↗️
                        </button>
                    </div>
                </form>

                <div className="flex items-center gap-4 bg-white/5 px-5 py-2 rounded-2xl border border-white/10 shrink-0">
                    <div className="flex flex-col items-end">
                        <span className="text-blue-400 font-retro text-[7px] uppercase tracking-[0.3em] opacity-60">Insight</span>
                        <span className="text-white font-mono font-bold text-sm tracking-widest animate-pulse">+{wisdomXP} <span className="text-[10px] text-blue-400/60">XP</span></span>
                    </div>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl animate-float border border-white/20 shadow-[0_0_15px_rgba(37,99,235,0.4)]">💠</div>
                </div>
            </div>
        )}

        <div className={`flex-1 flex flex-col lg:flex-row min-h-0 relative z-10 ${isFocusMode ? 'p-0' : 'p-2 md:p-4'} transition-all duration-500`}>
            
            <div className="flex-1 flex flex-col min-h-0 relative group">
                <div className="absolute top-4 right-4 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                        onClick={() => setIsSmartMode(!isSmartMode)}
                        className={`p-2 rounded-lg backdrop-blur-md border border-white/20 text-white text-[10px] font-retro flex items-center gap-2 ${isSmartMode ? 'bg-green-600 shadow-lg border-green-400' : 'bg-black/60 opacity-60'}`}
                    >
                        {isSmartMode ? '🧠 Smart Mode: ON' : '🧠 Smart Mode: OFF'}
                    </button>
                    <button onClick={() => setIsTheaterMode(!isTheaterMode)} className={`p-2 rounded-lg backdrop-blur-md border border-white/20 text-white text-[10px] font-retro flex items-center gap-2 ${isTheaterMode ? 'bg-blue-600 shadow-lg' : 'bg-black/60'}`}>
                        {isTheaterMode ? '🎞️ Theater' : '🎞️ Default'}
                    </button>
                    <button onClick={analyzeResonance} disabled={isAnalyzing || isLoading} className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg border border-white/20 text-white text-[10px] font-retro flex items-center gap-2">
                        {isAnalyzing ? '⚡ Scanning...' : '🔭 Resonance'}
                    </button>
                </div>

                <div className={`flex-1 relative bg-black shadow-2xl transition-all duration-1000 ${isFocusMode || isTheaterMode ? '' : 'rounded-[3rem] border border-white/10 overflow-hidden'}`}>
                    
                    {/* SEARCH HOME MODE */}
                    {mediaMode === 'search_home' && (
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden bg-gray-950">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full animate-pulse pointer-events-none"></div>
                            
                            <div className="relative z-10 text-center space-y-8 max-w-2xl w-full">
                                <div className="mb-4">
                                    <h1 className="text-5xl md:text-7xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400 drop-shadow-2xl">NEXUS SEARCH</h1>
                                    <p className="text-gray-500 font-mono text-xs uppercase tracking-[0.5em] mt-4">Powered by Spirit Intelligence</p>
                                </div>
                                
                                <form onSubmit={(e) => { e.preventDefault(); handleManifestExtraction(inputUrl); }} className="w-full relative group">
                                    <input 
                                        type="text" 
                                        value={inputUrl === 'google.com' ? '' : inputUrl} 
                                        onChange={(e) => setInputUrl(e.target.value)} 
                                        placeholder="Search the archives..."
                                        className="w-full bg-black/50 border-2 border-white/10 rounded-full p-5 pl-8 text-white text-lg font-serif shadow-2xl focus:border-blue-500 outline-none transition-all placeholder:text-gray-600"
                                        autoFocus
                                    />
                                    <button type="submit" className="absolute right-3 top-2.5 bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-full shadow-lg transition-all active:scale-95">
                                        🔍
                                    </button>
                                </form>

                                <div className="flex gap-4 justify-center text-xs text-gray-500 font-mono">
                                    <button onClick={() => checkAndSetUrl('https://bibleproject.com')} className="hover:text-blue-400 transition-colors">Bible Project</button>
                                    <span>•</span>
                                    <button onClick={() => checkAndSetUrl('https://www.biblegateway.com')} className="hover:text-blue-400 transition-colors">Bible Gateway</button>
                                    <span>•</span>
                                    <button onClick={() => checkAndSetUrl('https://www.gotquestions.org')} className="hover:text-blue-400 transition-colors">GotQuestions</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {mediaMode === 'relay' && relayVideoId && (
                        <div className="w-full h-full bg-black relative flex items-center justify-center">
                            <YouTubePlayer videoId={relayVideoId} title="Nexus Broadcaster" onReady={() => setIsLoading(false)} />
                            <div className="absolute bottom-4 right-4 z-20">
                                <button 
                                    onClick={openExternal}
                                    className="bg-black/60 hover:bg-red-600 text-white font-retro text-[8px] px-3 py-1.5 rounded-lg border border-white/20 transition-all uppercase tracking-widest shadow-xl backdrop-blur-md"
                                >
                                    ⚠️ Video failing? Open External ↗️
                                </button>
                            </div>
                        </div>
                    )}

                    {mediaMode === 'web' && (
                        <div className="w-full h-full relative">
                            {showIframeWarning && (
                                <div className="absolute inset-x-0 top-0 z-20 p-2 text-center animate-fade-in pointer-events-none">
                                    <div className="inline-block bg-yellow-900/80 backdrop-blur-md border border-yellow-500/50 px-4 py-2 rounded-xl text-[9px] text-white font-retro uppercase shadow-2xl pointer-events-auto">
                                        ⚠️ Site refusing connection? 
                                        <button onClick={() => handleManifestExtraction(inputUrl)} className="ml-3 text-yellow-400 underline hover:text-white transition-colors">IGNITE SPIRITUAL PROXY</button>
                                        <button onClick={openExternal} className="ml-3 text-blue-400 underline hover:text-white transition-colors">OPEN EXTERNAL ↗️</button>
                                    </div>
                                </div>
                            )}
                            <iframe 
                                src={url}
                                className="w-full h-full border-none transition-all duration-700 opacity-90 brightness-95"
                                onLoad={() => { setIsLoading(false); setShowIframeWarning(false); }}
                                title="Nexus Viewport"
                                allow="autoplay; fullscreen; picture-in-picture"
                            />
                        </div>
                    )}

                    {mediaMode === 'manifest' && (
                        <div className="w-full h-full bg-stone-950 p-8 md:p-16 overflow-y-auto no-scrollbar selection:bg-green-500 selection:text-black scroll-smooth">
                            <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20">
                                <div className="flex justify-between items-center mb-8 pb-4 border-b border-white/10">
                                    <span className="bg-green-900/40 text-green-400 font-retro text-[9px] px-4 py-2 rounded-full border border-green-600/30 uppercase tracking-[0.4em] animate-pulse">
                                        {manifestContent?.sources && manifestContent.sources.length > 0 ? "NEXUS SEARCH RESULTS" : "SPECTRAL REALM MANIFESTED"}
                                    </span>
                                    <button onClick={() => checkAndSetUrl('google.com')} className="text-gray-500 hover:text-white font-mono text-xs">[ NEW SEARCH ]</button>
                                </div>

                                {/* Search Results Layout (SERP) */}
                                {manifestContent?.sources && manifestContent.sources.length > 0 ? (
                                    <div className="space-y-8">
                                        {manifestContent.sources.map((s: any, i: number) => (
                                            <div key={i} className="group bg-white/5 p-6 rounded-2xl border border-white/5 hover:border-blue-500/50 transition-all hover:bg-white/10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-6 h-6 bg-blue-900/50 rounded-full flex items-center justify-center text-xs">🌐</div>
                                                    <a href={s.web?.uri} target="_blank" rel="noreferrer" className="text-xs text-gray-400 font-mono truncate hover:underline hover:text-blue-300">
                                                        {s.web?.uri}
                                                    </a>
                                                </div>
                                                <a href={s.web?.uri} target="_blank" rel="noreferrer" className="block">
                                                    <h3 className="text-xl text-blue-400 font-serif font-bold group-hover:underline mb-2">{s.web?.title}</h3>
                                                </a>
                                                <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                                                    {(manifestContent.text.includes(s.web?.title) ? 
                                                        manifestContent.text.split(s.web?.title)[1]?.substring(0, 150) + "..." : 
                                                        "Content manifested from the spectral web.")}
                                                </p>
                                            </div>
                                        ))}
                                        
                                        <div className="mt-8 bg-black/40 p-6 rounded-2xl border border-white/10">
                                            <h4 className="text-green-500 font-retro text-xs mb-4 uppercase tracking-widest">AI Synthesis</h4>
                                            <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                                                {manifestContent.text.split('\n').map((p, i) => (
                                                    <p key={i}>{p}</p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Single Page Manifest Layout */
                                    <>
                                        <div className="text-center mb-8">
                                            <h2 className="text-3xl md:text-5xl font-serif text-white leading-tight font-bold">{url}</h2>
                                        </div>
                                        <div className="prose prose-invert prose-lg max-w-none">
                                            {manifestContent?.text.split('\n').map((p, i) => {
                                                if (!p.trim()) return <br key={i} />;
                                                if (p.startsWith('#')) return <h3 key={i} className="text-2xl font-retro text-yellow-500 mt-8 mb-4 uppercase tracking-tight">{p.replace(/#/g, '').trim()}</h3>;
                                                return <p key={i} className="text-gray-300 leading-relaxed font-serif text-lg md:text-xl mb-6">{p}</p>;
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {mediaMode === 'video' && (
                        <div className="w-full h-full relative bg-black flex items-center justify-center">
                            <video ref={videoRef} src={url} className="max-w-full max-h-full" onPlay={() => { setIsPlaying(true); setIsLoading(false); }} onPause={() => setIsPlaying(false)} controls autoPlay />
                        </div>
                    )}

                    {mediaMode === 'audio' && (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 p-12 text-center relative overflow-hidden">
                            <div className={`w-48 h-48 md:w-64 md:h-64 bg-amber-900/10 border-4 border-amber-600/50 rounded-full flex items-center justify-center mb-8 relative ${isPlaying ? 'animate-spin-slow' : ''}`}>
                                <div className="w-16 h-16 bg-black border-4 border-amber-600 rounded-full flex items-center justify-center text-4xl">🎵</div>
                                <div className="absolute inset-[-20px] border-2 border-amber-500/20 rounded-full animate-pulse"></div>
                            </div>
                            <h3 className="text-amber-500 font-retro text-sm uppercase tracking-widest mb-2">Nexus Audio Sanctum</h3>
                            <audio ref={audioRef} src={url} className="w-full max-w-md filter invert hue-rotate-180 brightness-200 contrast-150 shadow-2xl" onPlay={() => { setIsPlaying(true); setIsLoading(false); }} onPause={() => setIsPlaying(false)} controls autoPlay />
                        </div>
                    )}
                    
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center gap-6 animate-fade-in z-40">
                            <div className="relative">
                                <div className="w-32 h-32 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">💠</div>
                            </div>
                            <p className="font-retro text-blue-400 text-[10px] tracking-[0.8em] animate-pulse uppercase">Syncing_Frequencies...</p>
                        </div>
                    )}

                    {analysisResult && (
                        <div className="absolute bottom-6 left-6 right-6 z-50 animate-slide-up max-w-2xl mx-auto">
                            <div className="bg-black/90 backdrop-blur-2xl border-2 border-blue-500/50 p-6 rounded-3xl shadow-2xl relative overflow-hidden group/analysis">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-blue-400 font-retro text-[8px] uppercase tracking-widest">Spectral Log // Nexus AI</span>
                                    <button onClick={() => setAnalysisResult(null)} className="text-gray-500 hover:text-white transition-colors">✕</button>
                                </div>
                                <p className="text-gray-200 font-serif text-base italic leading-relaxed">{analysisResult.split('TAKEAWAY:')[0].replace('INSIGHT:', '').replace('[AUTO_ANALYSIS]:', '').trim()}</p>
                                {analysisResult.includes('TAKEAWAY:') && (
                                    <div className="mt-4 pt-4 border-t border-white/10 font-mono text-[11px] text-blue-300 uppercase tracking-tight">{analysisResult.split('TAKEAWAY:')[1]?.trim()}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {(!isFocusMode && !isTheaterMode) && (
                <div className="w-full lg:w-96 bg-black/40 backdrop-blur-2xl border-l border-white/5 flex flex-col min-h-0 overflow-y-auto no-scrollbar pb-20 lg:pb-0 animate-slide-in ml-0 lg:ml-4 rounded-[2.5rem] border border-white/5 shadow-inner">
                    <div className="p-6 sticky top-0 bg-black/40 backdrop-blur-xl z-20 border-b border-white/5">
                        <h3 className="text-gray-500 font-retro text-[9px] uppercase tracking-[0.5em] mb-4">Web Archives</h3>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                            {WISDOM_SITES.map(site => (
                                <button key={site.url} onClick={() => checkAndSetUrl(site.url)} className="whitespace-nowrap px-4 py-2.5 bg-blue-900/20 hover:bg-blue-600 hover:text-white text-blue-400 rounded-xl text-[8px] font-retro border border-blue-500/20 transition-all uppercase tracking-widest shadow-md">
                                    {site.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <span className="text-blue-500 font-retro text-[8px] uppercase tracking-[0.3em]">Network Feed</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            </div>
                            <div className="bg-white/5 rounded-3xl p-4 border border-white/5 space-y-3">
                                {activityFeed.length > 0 ? activityFeed.slice(0, 3).map((act, i) => (
                                    <div key={act.id || i} className="flex gap-3 items-center opacity-80 group/act cursor-default">
                                        <img src={act.avatar} className="w-6 h-6 rounded-full border border-white/10 group-hover/act:scale-110 transition-transform" alt="" />
                                        <div className="min-w-0">
                                            <p className="text-gray-300 text-[10px] font-mono leading-tight truncate">
                                                <span className="text-blue-400">{act.username}</span> {act.activity_type === 'achievement' ? 'ascended' : 'joined'}
                                            </p>
                                        </div>
                                    </div>
                                )) : <p className="text-center text-[9px] text-gray-600 font-mono italic">Polling signal...</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 pb-10">
                            <h4 className="text-[10px] text-gray-600 font-retro uppercase tracking-widest px-1">Sacred Broadcasts</h4>
                            {suggestedVideos.map(v => (
                                <div key={v.id} onClick={() => selectVideo(v)} className="group cursor-pointer rounded-[2rem] overflow-hidden border-2 border-white/5 bg-white/5 hover:border-blue-500 transition-all shadow-xl">
                                    <div className="aspect-video relative overflow-hidden">
                                        <img src={`https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" alt="" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80"></div>
                                        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                                            <span className="bg-black/60 text-white text-[7px] px-2 py-0.5 rounded font-bold uppercase border border-white/10 shadow-lg">{v.category || 'General'}</span>
                                            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white opacity-0 group-hover:opacity-100 transition-all shadow-blue-500/50 shadow-lg">▶</div>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h4 className="text-[11px] font-bold text-gray-200 group-hover:text-blue-400 line-clamp-2 leading-snug">{v.title}</h4>
                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                            <span className="text-[9px] text-gray-500 font-mono uppercase truncate tracking-tighter">{v.username}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="bg-black border-t border-white/10 p-2 px-6 flex justify-between items-center relative z-20 shadow-2xl">
            <div className="flex items-center gap-4">
                <p className="text-[8px] text-blue-500 font-mono animate-pulse uppercase tracking-[0.4em]">
                    &gt;&gt; SPIRIT_LINK_ACTIVE // NEXUS_SPECTRAL_PROXY_v8.1_STABLE
                </p>
                <div className="h-1 w-24 bg-gray-900 rounded-full overflow-hidden hidden md:block border border-white/5">
                    <div className="h-full bg-blue-500 w-1/3 animate-width-grow"></div>
                </div>
            </div>
            <div className="flex gap-6">
                <span className={`text-[8px] font-mono uppercase tracking-widest hidden sm:block ${mediaMode === 'manifest' || mediaMode === 'search_home' ? 'text-green-500 animate-pulse' : 'text-gray-500'}`}>
                    MODE: {mediaMode.toUpperCase()}
                </span>
                {mediaMode === 'manifest' && <span className="text-[8px] text-yellow-500 font-mono uppercase tracking-widest animate-glow">Bypass: spectral_success</span>}
            </div>
        </div>
    </div>
  );
};

export default BrowserView;
