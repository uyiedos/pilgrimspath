
import React, { useEffect, useRef, useState } from 'react';
import { AudioSystem } from '../utils/audio';

interface YouTubePlayerProps {
  videoId: string;
  title: string;
  onReady?: () => void;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, title, onReady }) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || !playerRef.current) return;

      // Clean up previous instance if exists
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
      }

      try {
        playerInstanceRef.current = new window.YT.Player(playerRef.current, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          host: 'https://www.youtube.com', // Force HTTPS
          playerVars: {
            autoplay: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
            widget_referrer: window.location.origin,
            enablejsapi: 1
          },
          events: {
            onReady: (event: any) => {
              if (isMounted) {
                setIsLoaded(true);
                if (onReady) onReady();
              }
            },
            onError: (event: any) => {
              console.warn('YT Player Error:', event.data);
              let msg = 'Spiritual signal blocked by the realm host.';
              
              if (event.data === 150 || event.data === 101 || event.data === 153) {
                  msg = 'This broadcast is restricted from embedding. Please open the external sanctuary.';
              } else if (event.data === 100) {
                  msg = 'This video has been removed or is private.';
              }
              
              if (isMounted) setError(msg);
            }
          }
        });
      } catch (e) {
        console.error("Failed to initialize YouTube player", e);
        if (isMounted) setError("Player initialization failed.");
      }
    };

    if (!window.YT) {
      // Load the API script if not already loaded
      const existingScript = document.getElementById('youtube-api-script');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        
        window.onYouTubeIframeAPIReady = () => {
          initPlayer();
        };
      } else {
        // Script exists but YT object might not be ready, poll for it
        const checkYT = setInterval(() => {
            if (window.YT && window.YT.Player) {
                clearInterval(checkYT);
                initPlayer();
            }
        }, 100);
      }
    } else {
      initPlayer();
    }

    return () => {
      isMounted = false;
      if (playerInstanceRef.current && playerInstanceRef.current.destroy) {
        try {
            playerInstanceRef.current.destroy();
        } catch (e) {
            // Ignore destruction errors
        }
      }
    };
  }, [videoId]);

  return (
    <div className="w-full h-full bg-black relative flex items-center justify-center overflow-hidden">
      <div ref={playerRef} className="w-full h-full" />
      
      {!isLoaded && !error && (
        <div className="absolute inset-0 z-10 bg-black flex flex-col items-center justify-center gap-4">
           <div className="relative">
              <div className="w-20 h-20 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">📡</div>
           </div>
           <p className="font-retro text-yellow-500 text-[9px] uppercase tracking-[0.3em] animate-pulse">Syncing Sanctuary Stream...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-20 bg-gray-900 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <div className="text-5xl mb-4">🧱</div>
            <h4 className="text-white font-retro text-sm mb-4">Frequency Mismatch</h4>
            <p className="text-gray-400 text-xs mb-6 font-serif italic max-w-md">"{error}"</p>
            <button 
                onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')}
                className="bg-white text-black font-bold py-3 px-8 rounded-xl font-retro text-[10px] hover:bg-gray-200 transition-all shadow-xl active:scale-95"
            >
                OPEN EXTERNAL SANCTUARY ↗️
            </button>
        </div>
      )}
    </div>
  );
};

export default YouTubePlayer;
