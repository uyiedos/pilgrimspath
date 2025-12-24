
import React, { useState, useEffect, useRef } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean; // If true, eager loads (good for hero images)
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, className = '', priority = false, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState(src);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Reset state when src changes
    setIsLoaded(false);
    setHasError(false);

    // Optimize URL for Pollinations (AI Generation)
    if (src && src.includes('image.pollinations.ai')) {
      try {
        const url = new URL(src);
        if (!url.searchParams.has('width')) {
            url.searchParams.set('width', '400');
            url.searchParams.set('height', '400');
            url.searchParams.set('nologo', 'true');
        }
        setOptimizedSrc(url.toString());
      } catch (e) {
        setOptimizedSrc(src);
      }
    } else {
        setOptimizedSrc(src);
    }
  }, [src]);

  useEffect(() => {
      // 1. Check if already complete (Cached)
      if (imgRef.current && imgRef.current.complete) {
          setIsLoaded(true);
          return;
      }

      // 2. Safety Timeout: Force show after 1.5s if onLoad doesn't trigger
      // This prevents "infinite loader" on some browsers/network conditions
      const timer = setTimeout(() => {
          if (!isLoaded && !hasError) {
              setIsLoaded(true);
          }
      }, 1500);

      return () => clearTimeout(timer);
  }, [src, isLoaded, hasError]);

  return (
    <div className={`relative overflow-hidden ${className} bg-gray-900`}>
      {/* Skeleton Loading State */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center z-0 bg-gray-900">
           <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black animate-pulse flex items-center justify-center">
              <span className="text-gray-700 text-2xl animate-float">❖</span>
           </div>
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-2 text-center z-10">
           <span className="text-red-900 text-3xl mb-2">⚠️</span>
           <span className="text-gray-600 text-[8px] font-mono uppercase">Image Lost</span>
        </div>
      )}

      {/* Actual Image */}
      <img
        ref={imgRef}
        src={hasError ? 'https://image.pollinations.ai/prompt/pixel%20art%20static%20glitch%20noise?width=200&height=200&nologo=true' : optimizedSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-700 ease-in-out transform ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading={priority ? "eager" : "lazy"}
        decoding="sync" // Force synchronous decoding for UI stability
        {...props}
      />
    </div>
  );
};

export default LazyImage;
