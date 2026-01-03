
import React, { useEffect, useRef, useState } from 'react';
import { LevelConfig } from '../types';
import { AudioSystem } from '../utils/audio';

interface VoxelSceneProps {
  level: LevelConfig;
  small?: boolean;
  isCompleted?: boolean;
}

const VoxelScene: React.FC<VoxelSceneProps> = ({ level, small = false, isCompleted = false }) => {
  const { gridPattern, colorTheme } = level;
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [dissolvedBlocks, setDissolvedBlocks] = useState<Set<string>>(new Set());
  
  const rotationRef = useRef({ x: 60, z: 45 });
  const targetRotationRef = useRef({ x: 60, z: 45 });

  // Size of each voxel block (Lego Unit)
  const s = small ? 14 : 28; 
  const gridSize = 8;
  const totalWidth = gridSize * s;
  
  // --- Lego / Voxel Textures ---
  // We use CSS gradients to create the "plastic" shine and the "stud" on top
  
  useEffect(() => {
    setDissolvedBlocks(new Set());
    rotationRef.current = { x: 60, z: 45 };
    targetRotationRef.current = { x: 60, z: 45 };
  }, [level]);

  // Level Completion Dissolve Effect
  useEffect(() => {
    if (isCompleted) {
      const targetBlocks: string[] = [];
      gridPattern.forEach((row, y) => {
        row.forEach((code, x) => {
          if (code !== 0) targetBlocks.push(`${x}-${y}`);
        });
      });

      // Spiral dissolve pattern
      targetBlocks.sort((a, b) => {
        const [x1, y1] = a.split('-').map(Number);
        const [x2, y2] = b.split('-').map(Number);
        const distA = Math.sqrt(Math.pow(x1 - 4, 2) + Math.pow(y1 - 4, 2));
        const distB = Math.sqrt(Math.pow(x2 - 4, 2) + Math.pow(y2 - 4, 2));
        return distA - distB;
      });

      let i = 0;
      const interval = setInterval(() => {
        if (i >= targetBlocks.length) {
          clearInterval(interval);
          return;
        }
        const coord = targetBlocks[i];
        setDissolvedBlocks(prev => new Set(prev).add(coord));
        i++;
      }, 30); 
      return () => clearInterval(interval);
    }
  }, [isCompleted, gridPattern]);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      if (sceneRef.current) {
        const ease = 0.1;
        const current = rotationRef.current;
        const target = targetRotationRef.current;
        if (!isHovering) target.z = (target.z + 0.1); 
        current.x += (target.x - current.x) * ease;
        current.z += (target.z - current.z) * ease;
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
    const rotateX = Math.max(30, Math.min(70, 60 - (y / rect.height) * 40)); 
    const rotateZ = rotationRef.current.z + (x / rect.width) * 15; 
    targetRotationRef.current = { x: rotateX, z: rotateZ };
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    targetRotationRef.current.x = 60;
  };

  const getBlockStyles = (code: number) => {
    // colors for faces: top, side (darker), front (darkest)
    switch (code) {
      case 1: // Path (Sand/Earth)
        return { top: '#d4b483', side: '#c19a6b', front: '#ac8552', h: 1, type: 'solid' };
      case 2: // Goal (Gold)
        return { top: '#fbbf24', side: '#d97706', front: '#b45309', h: 1.5, type: 'solid', glow: true };
      case 3: // Wall (Stone)
        return { top: '#78716c', side: '#57534e', front: '#44403c', h: 2, type: 'solid' };
      case 4: // Water
        return { top: 'rgba(59, 130, 246, 0.8)', side: 'rgba(37, 99, 235, 0.8)', front: 'rgba(29, 78, 216, 0.8)', h: 0.8, type: 'liquid' };
      default: return { top: 'transparent', side: 'transparent', front: 'transparent', h: 0, type: 'air' };
    }
  };

  const LegoBlock = ({ x, y, z, size, styles, isDissolved }: any) => {
    if (styles.type === 'air' || isDissolved) return null;

    const height = size * styles.h;
    
    // CSS for the "Stud" on top of the Lego brick
    const studSize = size * 0.6;
    const studOffset = (size - studSize) / 2;
    const studHeight = size * 0.2;

    return (
      <div 
        className="absolute preserve-3d transition-transform duration-300"
        style={{ 
          width: size, height: size,
          transform: `translate3d(${x}px, ${y}px, ${z}px)`
        }}
        onMouseEnter={() => !small && AudioSystem.playVoxelTap()}
      >
        {/* STUD (The Lego Bump) */}
        {styles.type !== 'liquid' && (
            <div className="absolute preserve-3d" style={{ width: studSize, height: studSize, left: studOffset, top: studOffset, transform: `translateZ(${height}px)` }}>
                <div className="absolute inset-0" style={{ backgroundColor: styles.top, transform: `translateZ(${studHeight}px)` }}>
                    {/* Logo on stud */}
                    <div className="w-full h-full opacity-30 flex items-center justify-center text-[4px] font-bold text-black/20">†</div>
                </div> 
                <div className="absolute inset-0 origin-bottom" style={{ height: studHeight, backgroundColor: styles.side, transform: `rotateX(-90deg) translateZ(${studSize}px)` }}></div>
                <div className="absolute inset-0 origin-right" style={{ width: studHeight, backgroundColor: styles.side, transform: `rotateY(90deg) translateZ(${studSize}px)` }}></div>
                <div className="absolute inset-0 origin-top" style={{ height: studHeight, backgroundColor: styles.front, transform: `rotateX(90deg)` }}></div>
                <div className="absolute inset-0 origin-left" style={{ width: studHeight, backgroundColor: styles.front, transform: `rotateY(-90deg)` }}></div>
            </div>
        )}

        {/* MAIN BLOCK BODY */}
        <div className="absolute inset-0" style={{ backgroundColor: styles.top, transform: `translateZ(${height}px)`, boxShadow: 'inset 0 0 5px rgba(255,255,255,0.2)' }}></div>
        <div className="absolute inset-0 origin-bottom" style={{ height: height, backgroundColor: styles.front, transform: `rotateX(-90deg) translateZ(${size}px)` }}></div>
        <div className="absolute inset-0 origin-right" style={{ width: height, backgroundColor: styles.side, transform: `rotateY(90deg) translateZ(${size}px)` }}></div>
        <div className="absolute inset-0 origin-top" style={{ height: height, backgroundColor: styles.side, transform: `rotateX(90deg)` }}></div>
        <div className="absolute inset-0 origin-left" style={{ width: height, backgroundColor: styles.front, transform: `rotateY(-90deg)` }}></div>
        
        {/* Glow effect for special blocks */}
        {styles.glow && (
            <div className="absolute inset-0 bg-yellow-400/20 blur-md rounded-full animate-pulse" style={{ transform: `translateZ(${height}px) scale(1.5)` }}></div>
        )}
      </div>
    );
  };

  const offset = (gridSize * s) / 2;

  return (
    <div ref={containerRef} className={`relative flex items-center justify-center ${small ? 'w-32 h-32' : 'w-full h-96'} overflow-hidden select-none perspective-1000 ${!small ? 'cursor-grab active:cursor-grabbing' : ''}`} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
      `}</style>

      {/* Base Plate */}
      <div ref={sceneRef} className="relative preserve-3d will-change-transform" style={{ width: totalWidth, height: totalWidth, transform: `rotateX(60deg) rotateZ(45deg)` }}>
        
        {/* Lego Baseplate */}
        <div className="absolute inset-0 bg-green-900/80 border-4 border-green-950" style={{ transform: 'translateZ(-10px)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            {/* Studs on baseplate */}
            <div className="w-full h-full opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2.5px)', backgroundSize: `${s}px ${s}px` }}></div>
        </div>

        {gridPattern.map((row, y) => 
          row.map((code, x) => {
            const styles = getBlockStyles(code);
            const xPos = x * s - offset;
            const yPos = y * s - offset;
            const key = `${x}-${y}`;
            
            return (
              <LegoBlock 
                key={key} 
                x={xPos} 
                y={yPos} 
                z={0} 
                size={s} 
                styles={styles} 
                isDissolved={dissolvedBlocks.has(key)} 
              />
            );
          })
        )}

        {/* Player Figure (Pixel/Voxel Style) */}
        {!small && (
           <div className="absolute preserve-3d transition-all duration-500 ease-in-out" 
                style={{ 
                    left: '50%', top: '50%', width: s, height: s,
                    transform: `translate3d(0, 0, ${s}px)` 
                }}>
              <div className="absolute w-full h-[150%] bg-blue-600 origin-bottom transform rotateX(-90deg) translateZ(14px)">
                  {/* Body Textures */}
                  <div className="w-full h-1/3 bg-yellow-200"></div> {/* Face */}
                  <div className="w-full h-2/3 bg-blue-800 border-t-2 border-black/20"></div> {/* Tunic */}
              </div>
           </div>
        )}

      </div>
    </div>
  );
};

export default VoxelScene;
