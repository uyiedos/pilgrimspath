import React, { useEffect, useRef, useState } from 'react';
import { LevelConfig } from '../types';
import { AudioSystem } from '../utils/audio';

interface VoxelSceneProps {
  level: LevelConfig;
  small?: boolean;
  isCompleted?: boolean;
}

const VoxelScene: React.FC<VoxelSceneProps> = ({ level, small = false, isCompleted = false }) => {
  const { gridPattern, colorTheme, accentColor } = level;
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [dissolvedBlocks, setDissolvedBlocks] = useState<Set<string>>(new Set());
  
  // Animation refs
  const rotationRef = useRef({ x: 60, z: 45 });
  const targetRotationRef = useRef({ x: 60, z: 45 });

  // Size of each voxel block in pixels
  const s = small ? 12 : 24; 
  const gridSize = 8;
  const totalWidth = gridSize * s;
  
  // --- Enhanced Textures via SVG Data URIs ---
  const noiseFilter = `<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3' stitchTiles='stitch'/></filter>`;
  
  // Rough Stone Texture for Walls
  const stoneTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E${noiseFilter}%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3Crect width='100%25' height='100%25' fill='black' opacity='0.1'/%3E%3Cpath d='M10 10 L30 30 M70 20 L90 40 M20 80 L50 90' stroke='black' stroke-width='2' opacity='0.2'/%3E%3C/svg%3E")`;
  
  // Smooth Path Texture
  const pathTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E${noiseFilter}%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3Crect width='100%25' height='100%25' fill='white' opacity='0.05'/%3E%3C/svg%3E")`;
  
  // Radiant Gold/Accent Texture
  const goldTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E${noiseFilter}%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.1'/%3E%3Ccircle cx='50' cy='50' r='25' fill='white' opacity='0.4' filter='blur(5px)'/%3E%3C/svg%3E")`;

  // Lighting Gradients
  const faceLightingTop = "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)";
  const faceLightingSide = "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 100%)";
  const faceLightingFront = "linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.2) 100%)";

  // Reset state when level changes
  useEffect(() => {
    setDissolvedBlocks(new Set());
    rotationRef.current = { x: 60, z: 45 };
    targetRotationRef.current = { x: 60, z: 45 };
  }, [level]);

  // Handle Level Completion Effect
  useEffect(() => {
    if (isCompleted) {
      const targetBlocks: string[] = [];
      gridPattern.forEach((row, y) => {
        row.forEach((code, x) => {
          if (code === 2 || code === 1) targetBlocks.push(`${x}-${y}`);
        });
      });

      targetBlocks.sort((a, b) => {
        const [x1, y1] = a.split('-').map(Number);
        const [x2, y2] = b.split('-').map(Number);
        const distA = Math.sqrt(Math.pow(x1 - 4, 2) + Math.pow(y1 - 4, 2));
        const distB = Math.sqrt(Math.pow(x2 - 4, 2) + Math.pow(y2 - 4, 2));
        return distA - distB;
      });

      if (targetBlocks.length > 0) {
        let i = 0;
        const interval = setInterval(() => {
          if (i >= targetBlocks.length) {
            clearInterval(interval);
            return;
          }
          const coord = targetBlocks[i];
          setDissolvedBlocks(prev => {
            const next = new Set(prev);
            next.add(coord);
            return next;
          });
          i++;
        }, 50); 
        return () => clearInterval(interval);
      }
    }
  }, [isCompleted, gridPattern]);

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      if (sceneRef.current) {
        // Smooth interpolation
        const ease = 0.1;
        const current = rotationRef.current;
        const target = targetRotationRef.current;

        if (!isHovering) {
            // Auto rotate
            target.z = (target.z + 0.1); 
        }

        // Apply easing
        current.x += (target.x - current.x) * ease;
        current.z += (target.z - current.z) * ease;

        // Apply transform
        sceneRef.current.style.transform = `rotateX(${current.x}deg) rotateZ(${current.z}deg)`;
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isHovering]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || small) return;
    setIsHovering(true);
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Calculate target rotation
    const rotateX = Math.max(20, Math.min(80, 60 - (y / rect.height) * 40)); 
    const rotateZ = rotationRef.current.z + (x / rect.width) * 10; // Additive influence
    
    targetRotationRef.current = { x: rotateX, z: rotateZ };
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    // Reset X tilt, keep Z rotation flowing
    targetRotationRef.current.x = 60;
  };

  // Map numbers in gridPattern to properties
  const getBlockProps = (code: number) => {
    switch (code) {
      // Normal path
      case 1: return { 
        class: colorTheme, 
        heightMult: 1, 
        zOff: 0,
        texture: pathTexture, 
        glow: false 
      };
      // Accent / Objective
      case 2: return { 
        class: accentColor, 
        heightMult: 1, 
        zOff: s * 0.5, // Floats slightly
        texture: goldTexture, 
        glow: true 
      };
      // Wall / Obstacle
      case 3: return { 
        class: 'bg-stone-700', 
        heightMult: 2.5, // Tall pillar
        zOff: 0,
        texture: stoneTexture, 
        glow: false 
      };
      default: return { class: 'bg-transparent', heightMult: 0, zOff: 0, texture: '', glow: false };
    }
  };

  const [particles] = useState(() => Array.from({ length: 25 }).map(() => ({
    x: (Math.random() - 0.5) * totalWidth * 2.5,
    y: (Math.random() - 0.5) * totalWidth * 2.5,
    z: Math.random() * 80,
    delay: Math.random() * 5,
    duration: 4 + Math.random() * 5,
    size: Math.random() > 0.8 ? 3 : 1.5,
    color: Math.random() > 0.6 ? 'bg-yellow-200' : 'bg-blue-200'
  })));

  // CSS for a single 3D Cube
  const Cube = ({ x, y, z, size, colorClass, heightMult, glow, texture, isCharacter = false }: any) => {
    const h = size * heightMult;
    const transform = `translate3d(${x}px, ${y}px, ${z}px)`;
    
    // Common face styles
    const faceStyle = {
      position: 'absolute' as const,
      width: size,
      height: size,
      backgroundImage: texture,
      backfaceVisibility: 'hidden' as const,
      backgroundSize: 'cover',
      boxShadow: 'inset 0 0 1px rgba(0,0,0,0.1)' // cleaner edges
    };
    
    const sideHeight = { height: h };

    return (
      <div 
        className={`absolute preserve-3d will-change-transform ${glow ? 'animate-float-voxel' : ''}`}
        style={{ 
          left: '50%',
          top: '50%',
          transform, 
          width: size, 
          height: size,
          transition: 'transform 0.5s ease-out'
        }}
        onMouseEnter={() => !small && AudioSystem.playVoxelTap()}
      >
        {/* TOP FACE */}
        <div className={`${colorClass} brightness-110`} style={{ 
          ...faceStyle, 
          transform: `translateZ(${h}px)`,
          backgroundImage: `${faceLightingTop}, ${texture}` 
        }} />
        
        {/* FRONT FACE */}
        <div className={`${colorClass} brightness-95`} style={{ 
          ...faceStyle, 
          ...sideHeight,
          transform: `translateY(${size/2}px) rotateX(-90deg) translateZ(${size/2}px) translateY(${h/2 - size/2}px)`,
          backgroundImage: `${faceLightingFront}, ${texture}`
        }} />
        
        {/* RIGHT FACE */}
        <div className={`${colorClass} brightness-75`} style={{ 
          ...faceStyle,
          ...sideHeight, 
          transform: `translateX(${size/2}px) rotateY(90deg) translateZ(${size/2}px) translateY(${h/2 - size/2}px)`,
          backgroundImage: `${faceLightingSide}, ${texture}`
        }} />
        
        {/* LEFT FACE */}
        <div className={`${colorClass} brightness-75`} style={{ 
          ...faceStyle,
          ...sideHeight, 
          transform: `translateX(-${size/2}px) rotateY(-90deg) translateZ(${size/2}px) translateY(${h/2 - size/2}px)`,
          backgroundImage: `${faceLightingSide}, ${texture}`
        }} />
        
        {/* BACK FACE */}
        <div className={`${colorClass} brightness-90`} style={{ 
          ...faceStyle, 
          ...sideHeight, 
          transform: `translateY(-${size/2}px) rotateX(90deg) translateZ(${size/2}px) translateY(${h/2 - size/2}px)`,
          backgroundImage: `${faceLightingSide}, ${texture}`
        }} />
        
        {/* BOTTOM FACE */}
        <div className={`${colorClass} brightness-50`} style={{ 
          ...faceStyle, 
          transform: `rotateX(180deg)`,
        }} />

        {/* Character Specifics: Staff and Details */}
        {isCharacter && (
            <>
               {/* The Staff - Enhanced with tip glow */}
               <div className="absolute preserve-3d" style={{
                   transform: `translate3d(${size * 0.8}px, ${size * 0.2}px, ${h}px) rotateX(-10deg)`,
                   width: 4, height: 4
               }}>
                  {/* Staff Shaft */}
                  <div className="bg-amber-800 absolute top-0 left-0 w-1 h-1 shadow-sm" style={{ height: size * 1.6, transform: `translateZ(0px) rotateX(-90deg)`, transformOrigin: 'bottom center' }}></div>
                  <div className="bg-amber-900 absolute top-0 left-0 w-1 h-1" style={{ height: size * 1.6, transform: `translateZ(0px) rotateX(-90deg) rotateY(90deg)`, transformOrigin: 'bottom center' }}></div>
                  
                  {/* Glowing Gem on Staff - Pulses */}
                  <div className={`absolute top-0 left-[-3px] w-3 h-3 bg-cyan-400 rounded-full animate-pulse`}
                       style={{ 
                         transform: `translateZ(${size * 1.6}px)`,
                         boxShadow: '0 0 15px 5px rgba(34,211,238,0.6)'
                       }}
                  ></div>
               </div>
               
               {/* Head/Hood Detail - Simple Shadow */}
               <div className="absolute bg-black/30 w-full h-1/3 top-0 left-0 backdrop-blur-[1px]" style={{ transform: `translateZ(${h + 0.1}px)` }}></div>
               
               {/* Eyes */}
               <div className="absolute top-[20%] left-[20%] w-[20%] h-[10%] bg-white" style={{ transform: `translateY(${size/2}px) rotateX(-90deg) translateZ(${size/2 + 0.1}px) translateY(${h/2 - size/2}px)` }}></div>
               <div className="absolute top-[20%] right-[20%] w-[20%] h-[10%] bg-white" style={{ transform: `translateY(${size/2}px) rotateX(-90deg) translateZ(${size/2 + 0.1}px) translateY(${h/2 - size/2}px)` }}></div>
            </>
        )}
      </div>
    );
  };

  // Center offset
  const offset = (gridSize * s) / 2;

  return (
    <div 
      ref={containerRef}
      className={`
        relative flex items-center justify-center 
        ${small ? 'w-32 h-32' : 'w-full h-80'} 
        overflow-visible select-none perspective-1000
        ${!small ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      role="img" 
      aria-label="Interactive 3D Voxel Scene"
    >
      <style>{`
        @keyframes float-voxel {
          0%, 100% { transform: translateZ(0px); }
          50% { transform: translateZ(8px); }
        }
        @keyframes character-idle {
          0%, 100% { transform: translate3d(-${s/2}px, -${s/2}px, ${s}px) rotateZ(0deg); }
          50% { transform: translate3d(-${s/2}px, -${s/2}px, ${s+4}px) rotateZ(2deg); }
        }
        @keyframes particle-drift {
          0% { transform: translate3d(0, 0, 0) scale(0); opacity: 0; }
          20% { opacity: 0.8; transform: translate3d(10px, -10px, 30px) scale(1); }
          80% { opacity: 0.4; transform: translate3d(-10px, 10px, 60px) scale(0.8); }
          100% { transform: translate3d(0, 0, 100px) scale(0); opacity: 0; }
        }
        @keyframes holy-ascension {
          0% { opacity: 1; transform: translateZ(0) scale(1); filter: brightness(100%); }
          30% { opacity: 1; transform: translateZ(40px) scale(1.2); filter: brightness(200%) drop-shadow(0 0 10px gold); }
          100% { opacity: 0; transform: translateZ(250px) scale(0); filter: brightness(300%); }
        }
        .preserve-3d { transform-style: preserve-3d; }
      `}</style>

      {/* 3D Container */}
      <div 
        ref={sceneRef}
        className="relative preserve-3d will-change-transform"
        style={{ 
          transform: `rotateX(60deg) rotateZ(45deg)`, // Initial State
          width: totalWidth,
          height: totalWidth
        }}
      >
        {/* Base Platform Shadow/Glow */}
        <div 
          className="absolute inset-0 bg-blue-900/30 blur-2xl rounded-full" 
          style={{ transform: 'translateZ(-40px) scale(1.5)' }}
        ></div>

        {/* Render Grid Blocks */}
        {gridPattern.map((row, y) => 
          row.map((code, x) => {
            if (code === 0) return null;
            
            const props = getBlockProps(code);
            const isDissolved = dissolvedBlocks.has(`${x}-${y}`);

            // Coordinates relative to center
            const xPos = x * s - offset;
            const yPos = y * s - offset;

            if (isDissolved) {
               // Render rising holy light effect when destroyed
               return (
                 <div 
                    key={`${x}-${y}`}
                    className="absolute preserve-3d"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: s, 
                      height: s,
                      transform: `translate3d(${xPos}px, ${yPos}px, ${props.zOff}px)`,
                    }}
                 >
                   <div 
                      className="w-full h-full bg-yellow-100 blur-sm rounded-full absolute top-0 left-0"
                      style={{
                        animation: 'holy-ascension 1.5s ease-out forwards',
                        boxShadow: '0 0 15px 5px rgba(253, 224, 71, 0.6)'
                      }}
                   >
                     {/* Inner bright sparkle */}
                     <div className="w-1/2 h-1/2 bg-white rounded-full absolute top-1/4 left-1/4 animate-pulse"></div>
                   </div>
                 </div>
               );
            }

            return (
              <Cube 
                key={`${x}-${y}`}
                x={xPos}
                y={yPos}
                z={props.zOff}
                size={s}
                colorClass={props.class}
                heightMult={props.heightMult}
                glow={props.glow}
                texture={props.texture}
              />
            );
          })
        )}

        {/* Character (Center of Grid) */}
        {!small && (
           <div 
             className="absolute preserve-3d" 
             style={{ 
               left: '50%', top: '50%',
               transformOrigin: 'center center',
               animation: isCompleted ? 'holy-ascension 2s ease-in forwards' : 'character-idle 4s ease-in-out infinite'
             }}
           >
              <Cube 
                x={0} y={0} z={0}
                size={s}
                colorClass="bg-blue-700"
                heightMult={1.8}
                glow={false}
                texture={pathTexture} // Use smooth texture for cloth
                isCharacter={true}
              />
           </div>
        )}

        {/* Atmospheric Particles - Mystical drifting motes */}
        {!small && particles.map((p, i) => (
          <div
            key={i}
            className={`absolute rounded-full opacity-0 ${p.color}`}
            style={{
              width: p.size,
              height: p.size,
              left: '50%',
              top: '50%',
              transform: `translate3d(${p.x}px, ${p.y}px, 0)`,
              animation: `particle-drift ${p.duration}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
              boxShadow: `0 0 ${p.size * 2}px ${p.color === 'bg-yellow-200' ? 'gold' : 'cyan'}`,
              mixBlendMode: 'screen'
            }}
          />
        ))}

      </div>
    </div>
  );
};

export default VoxelScene;