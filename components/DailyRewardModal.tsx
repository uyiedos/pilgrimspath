import React from 'react';
import Button from './Button';

interface DailyRewardModalProps {
  onClaim: () => void;
}

const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ onClaim }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-fade-in backdrop-blur-sm">
       <div className="relative bg-gray-900 border-4 border-yellow-500 p-8 rounded-xl max-w-sm w-full text-center shadow-[0_0_50px_rgba(234,179,8,0.4)] animate-slide-up">
          
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-500 text-black font-retro px-4 py-1 rounded border-2 border-white shadow-lg whitespace-nowrap">
             DAILY BLESSING
          </div>

          <div className="py-6">
             <div className="text-6xl mb-4 animate-bounce">☀️</div>
             <h2 className="text-2xl font-serif text-white font-bold mb-2">A New Day Dawns</h2>
             <p className="text-gray-400 text-sm mb-6">
               "His mercies are new every morning."<br/>
               <span className="text-xs italic text-gray-500">Lamentations 3:23</span>
             </p>
             
             <div className="bg-gray-800 p-4 rounded border-2 border-gray-700 mb-6 flex items-center justify-center gap-3">
                <span className="text-yellow-400 font-retro text-2xl">+10</span>
                <span className="text-gray-300 font-mono text-sm uppercase">Spirit XP</span>
             </div>

             <Button onClick={onClaim} className="w-full bg-green-600 hover:bg-green-500 border-green-800">
               Claim Reward
             </Button>
          </div>
       </div>
    </div>
  );
};

export default DailyRewardModal;