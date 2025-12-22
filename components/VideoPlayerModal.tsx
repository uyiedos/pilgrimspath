
import React from 'react';
import { VideoContent } from '../types';
import Button from './Button';
import { AudioSystem } from '../utils/audio';
import YouTubePlayer from './YouTubePlayer';

interface VideoPlayerModalProps {
  video: VideoContent;
  onClose: () => void;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  
  const getEmbedUrl = () => {
    const { platform, youtube_id } = video;
    const hostname = window.location.hostname;

    switch (platform) {
      case 'twitch_stream':
        return `https://player.twitch.tv/?channel=${youtube_id}&parent=${hostname}&autoplay=true`;
      case 'twitch_clip':
        return `https://clips.twitch.tv/embed?clip=${youtube_id}&parent=${hostname}&autoplay=true`;
      case 'vimeo':
        return `https://player.vimeo.com/video/${youtube_id}?autoplay=1&title=0&byline=0&portrait=0`;
      default:
        return null;
    }
  };

  const openInYoutube = () => {
      window.open(`https://www.youtube.com/watch?v=${video.youtube_id}`, '_blank');
      AudioSystem.playVoxelTap();
  };

  const embedUrl = getEmbedUrl();

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 animate-fade-in overflow-y-auto custom-scroll bg-black/95">
      {/* Background Aura */}
      <div className="absolute inset-0 bg-blue-900/10 blur-[150px] animate-pulse"></div>

      <div className="relative w-full max-w-5xl bg-gray-900 border-4 border-yellow-600 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden flex flex-col animate-slide-up">
        
        {/* Header Bar */}
        <div className="bg-gray-800 border-b-2 border-yellow-600 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
                <h3 className="text-white font-retro text-[10px] md:text-sm uppercase tracking-tighter truncate max-w-[200px] md:max-w-md">
                    {video.title}
                </h3>
            </div>
            <button 
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors text-xl p-1"
            >
                ✕
            </button>
        </div>

        {/* Player Container */}
        <div className="aspect-video bg-black relative flex items-center justify-center group/player">
            {video.platform === 'youtube' ? (
                <YouTubePlayer videoId={video.youtube_id} title={video.title} />
            ) : embedUrl ? (
                <iframe
                    src={embedUrl}
                    className="w-full h-full border-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    title={video.title}
                ></iframe>
            ) : (
                <div className="text-center p-10">
                    <div className="text-6xl mb-4">📱</div>
                    <h4 className="text-white font-retro text-sm mb-4">External Protocol Required</h4>
                    <p className="text-gray-400 text-xs mb-6 max-w-xs mx-auto font-serif">
                        This content platform requires a direct connection to their mobile sanctuary.
                    </p>
                    <a 
                        href={video.platform === 'tiktok' ? `https://www.tiktok.com/video/${video.youtube_id}` : `https://www.youtube.com/watch?v=${video.youtube_id}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white text-black font-bold py-3 px-8 rounded font-retro text-[10px] hover:bg-gray-200 transition-all inline-block"
                    >
                        OPEN EXTERNAL LINK ↗️
                    </a>
                </div>
            )}
            
            {video.platform === 'youtube' && (
                <div className="absolute top-4 right-4 opacity-0 group-hover/player:opacity-100 transition-opacity z-20">
                    <button 
                        onClick={openInYoutube}
                        className="bg-black/80 hover:bg-red-600 text-white font-retro text-[8px] px-3 py-1.5 rounded border border-white/20 transition-all uppercase tracking-widest shadow-xl"
                    >
                        Repair: Open in YouTube ↗️
                    </button>
                </div>
            )}
        </div>

        {/* Info & Interaction Bar */}
        <div className="bg-gray-850 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <img src={video.avatar} className="w-12 h-12 rounded-xl border-2 border-gray-700 shadow-lg object-cover" alt="" />
                <div>
                    <p className="text-yellow-500 font-retro text-[9px] uppercase tracking-widest leading-tight">Broadcaster</p>
                    <p className="text-white font-bold text-lg font-cinzel">{video.username}</p>
                </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <Button onClick={onClose} variant="secondary" className="flex-1 md:flex-none py-3 px-8 text-[10px]">
                    DISMISS
                </Button>
            </div>
        </div>

        {/* Description / Metadata (Hidden on Mobile) */}
        {video.description && (
            <div className="hidden md:block p-6 pt-0 bg-gray-850">
                <div className="border-t border-gray-800 pt-4">
                    <p className="text-gray-400 text-sm font-serif italic leading-relaxed">
                        "{video.description}"
                    </p>
                    {video.source_reference && (
                        <p className="text-blue-400 text-[10px] font-mono mt-3 uppercase tracking-widest">
                            Source: {video.source_reference}
                        </p>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayerModal;
