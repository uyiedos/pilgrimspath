import React, { useEffect, useState } from 'react';
import { Achievement } from '../types';

interface AchievementPopupProps {
  achievement: Achievement | null;
  onClose: () => void;
}

const AchievementPopup: React.FC<AchievementPopupProps> = ({ achievement, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 500); // Wait for exit animation
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  return (
    <div 
      className={`
        fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] 
        transition-all duration-500 ease-out
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
      `}
    >
      <div className="flex items-center gap-4 bg-gray-900 border-4 border-yellow-500 rounded-lg p-4 pixel-shadow shadow-2xl min-w-[300px]">
        <div className="text-4xl animate-bounce">
          {achievement.icon}
        </div>
        <div>
           <h4 className="text-yellow-500 font-retro text-xs uppercase tracking-widest mb-1">Achievement Unlocked!</h4>
           <h3 className="text-white font-bold font-serif text-lg leading-none">{achievement.title}</h3>
           <p className="text-gray-400 text-xs font-mono mt-1">+{achievement.xpReward} XP</p>
        </div>
      </div>
    </div>
  );
};

export default AchievementPopup;