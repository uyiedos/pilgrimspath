import React, { useEffect } from 'react';
import Button from './Button';

interface LevelUpModalProps {
  level: number;
  title: string;
  onClose: () => void;
}

const LevelUpModal: React.FC<LevelUpModalProps> = ({ level, title, onClose }) => {
  
  // Confetti effect could go here, but we'll use pure CSS animation for simplicity
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-fade-in">
       <div className="text-center p-8 relative">
          
          {/* Animated Background Elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
          
          <div className="relative z-10 transform transition-all animate-bounce-slow">
             <div className="text-6xl mb-4">⭐</div>
             <h2 className="text-6xl md:text-8xl font-retro text-yellow-400 drop-shadow-[4px_4px_0_#b45309] mb-4">
                LEVEL UP!
             </h2>
             
             <div className="bg-gray-800 border-4 border-yellow-500 p-6 rounded-xl inline-block pixel-shadow">
                <p className="text-gray-400 font-retro text-xs uppercase mb-2">New Rank Achieved</p>
                <h3 className="text-4xl font-serif text-white font-bold">{title}</h3>
                <div className="w-full h-1 bg-gray-700 mt-4 mb-2">
                   <div className="h-full bg-yellow-500 w-full animate-width-grow"></div>
                </div>
                <p className="text-yellow-500 font-mono text-xl">Lvl {level}</p>
             </div>
             
             <div className="mt-12">
               <Button onClick={onClose} className="animate-pulse">Continue Journey</Button>
             </div>
          </div>
       </div>
    </div>
  );
};

export default LevelUpModal;