
import React, { useState, useMemo } from 'react';
import Button from './Button';
import { BiblePlan } from '../types';
import { LanguageCode, UI_TEXT } from '../translations';
import { AudioSystem } from '../utils/audio';

interface PlansViewProps {
  onBack: () => void;
  onAddPoints: (points: number) => void;
  language: LanguageCode;
  plans: BiblePlan[];
  onUpdatePlans: (plans: BiblePlan[]) => void;
  spendPoints?: (amount: number) => Promise<boolean>;
}

const PlansView: React.FC<PlansViewProps> = ({ onBack, onAddPoints, language, plans, onUpdatePlans }) => {
  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const t = (key: keyof typeof UI_TEXT['en']) => UI_TEXT.en[key];

  const myActivePlans = useMemo(() => plans.filter(p => p.isActive), [plans]);
  const discoveredPlans = useMemo(() => plans.filter(p => !p.isActive), [plans]);

  const selectedPlan = useMemo(() => 
    plans.find(p => p.id === selectedPlanId), 
    [plans, selectedPlanId]
  );

  const handleStartPlan = (planId: string) => {
    AudioSystem.playAchievement();
    const newPlans = plans.map(p => {
      if (p.id === planId) {
        return {
          ...p,
          isActive: true,
          startDate: new Date().toISOString(),
          progress: 0
        };
      }
      return p;
    });
    onUpdatePlans(newPlans);
    setSelectedPlanId(planId);
    setActiveTab('my');
  };

  const handleCompleteDay = (planId: string, dayNum: number) => {
    AudioSystem.playLevelComplete();
    const newPlans = plans.map(p => {
      if (p.id === planId) {
        const newProgress = Math.max(p.progress, dayNum);
        const isFinished = newProgress >= p.duration;
        
        if (isFinished && !p.lastCompletedDate) {
            onAddPoints(500); // Big bonus for finishing
            alert("✨ HALLELUJAH! You have completed the plan.");
        } else {
            onAddPoints(20); // Small reward per day
        }

        return {
          ...p,
          progress: newProgress,
          lastCompletedDate: isFinished ? new Date().toISOString() : p.lastCompletedDate
        };
      }
      return p;
    });
    onUpdatePlans(newPlans);
  };

  const renderPlanCard = (plan: BiblePlan, isActionable: boolean) => (
    <div key={plan.id} className="bg-gray-800/80 backdrop-blur-md rounded-3xl border-2 border-white/5 overflow-hidden flex flex-col group hover:border-yellow-500/50 transition-all shadow-xl">
      <div className="h-32 relative overflow-hidden">
        <img src={plan.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
        <div className="absolute bottom-3 left-4">
           <span className="bg-black/60 text-white text-[8px] font-bold px-2 py-1 rounded-full border border-white/10 uppercase">{plan.category}</span>
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-white font-retro text-[11px] mb-2 uppercase tracking-tight">{plan.title}</h3>
        <p className="text-gray-400 text-xs font-serif italic mb-4 line-clamp-2 leading-relaxed">"{plan.desc}"</p>
        
        <div className="mt-auto space-y-4">
          <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 uppercase">
            <span>{plan.duration} Days</span>
            {plan.isActive && <span className="text-yellow-500">{Math.round((plan.progress / plan.duration) * 100)}%</span>}
          </div>

          {plan.isActive && (
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-1000" 
                style={{ width: `${(plan.progress / plan.duration) * 100}%` }}
              ></div>
            </div>
          )}

          <Button 
            onClick={() => plan.isActive ? setSelectedPlanId(plan.id) : handleStartPlan(plan.id)} 
            className={`w-full py-3 text-[10px] rounded-2xl ${plan.isActive ? 'bg-blue-600 border-blue-400' : 'bg-yellow-600 border-yellow-400 text-black'}`}
          >
            {plan.isActive ? 'Open Plan' : 'Begin Walk'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] animate-fade-in custom-scroll">
      
      <div className="relative w-full max-w-6xl">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-black/40 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl text-center md:text-left">
          <div>
            <h1 className="text-3xl md:text-5xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 uppercase tracking-tighter">Sacred Plans</h1>
            <p className="text-gray-500 font-mono text-[9px] uppercase tracking-[0.4em] mt-2">Bible_Study_Protocol_v4.2</p>
          </div>
          <div className="flex gap-3">
             <Button onClick={onBack} variant="secondary" className="px-8 py-3 rounded-2xl bg-white/5 border-white/10">🏠 Home</Button>
          </div>
        </header>

        {selectedPlan ? (
          /* ACTIVE PLAN DETAIL VIEW */
          <div className="animate-slide-up space-y-6 max-w-3xl mx-auto pb-24">
             <div className="bg-black/60 backdrop-blur-3xl border-4 border-white/10 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                   <img src={selectedPlan.image} className="w-32 h-32 md:w-48 md:h-48 rounded-[2rem] border-4 border-yellow-500 object-cover shadow-2xl" />
                   <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                         <h2 className="text-2xl md:text-4xl font-retro text-white uppercase tracking-tighter leading-none">{selectedPlan.title}</h2>
                         <button onClick={() => setSelectedPlanId(null)} className="text-gray-500 hover:text-white text-2xl p-2">✕</button>
                      </div>
                      <p className="text-gray-300 font-serif italic text-lg leading-relaxed">"{selectedPlan.desc}"</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-retro text-yellow-500 uppercase tracking-widest">
                           <span>Spiritual Progress</span>
                           <span>{selectedPlan.progress} / {selectedPlan.duration} Days</span>
                        </div>
                        <div className="w-full h-4 bg-black/40 rounded-full border border-white/10 overflow-hidden p-1 shadow-inner">
                           <div 
                              className="h-full bg-gradient-to-r from-green-600 to-yellow-500 rounded-full transition-all duration-1000" 
                              style={{ width: `${(selectedPlan.progress / selectedPlan.duration) * 100}%` }}
                           ></div>
                        </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="text-white font-retro text-[10px] uppercase tracking-[0.3em] ml-2 mb-4">Journey Timeline</h3>
                {selectedPlan.days?.map((day) => {
                   const isCompleted = day.day <= selectedPlan.progress;
                   const isNext = day.day === selectedPlan.progress + 1;
                   
                   return (
                      <div 
                        key={day.day} 
                        className={`bg-white/5 border transition-all rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-center gap-4 ${isCompleted ? 'border-green-500/30 opacity-60' : isNext ? 'border-yellow-500 bg-white/10 shadow-lg scale-[1.02]' : 'border-white/5 opacity-40'}`}
                      >
                         <div className="flex items-center gap-6 text-center md:text-left">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-retro text-sm ${isCompleted ? 'bg-green-600 text-white' : isNext ? 'bg-yellow-600 text-black animate-pulse' : 'bg-gray-800 text-gray-500'}`}>
                               {day.day}
                            </div>
                            <div>
                               <p className="text-white font-bold font-serif text-lg">{day.reading}</p>
                               <p className="text-gray-400 text-xs uppercase font-mono tracking-widest">{day.topic}</p>
                            </div>
                         </div>
                         
                         {isNext ? (
                            <Button 
                               onClick={() => handleCompleteDay(selectedPlan.id, day.day)}
                               className="px-10 py-3 rounded-2xl bg-yellow-600 border-yellow-400 text-black shadow-xl animate-glow"
                            >
                               Mark Complete (+20 XP)
                            </Button>
                         ) : isCompleted ? (
                            <span className="text-green-500 font-retro text-[10px]">✓ FINISHED</span>
                         ) : (
                            <span className="text-gray-600 font-retro text-[10px]">🔒 LOCKED</span>
                         )}
                      </div>
                   );
                })}
             </div>
          </div>
        ) : (
          /* TABBED LIST VIEW */
          <div className="animate-fade-in space-y-8">
            <div className="flex justify-center gap-3 bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-md max-w-md mx-auto">
               <button 
                 onClick={() => setActiveTab('my')} 
                 className={`flex-1 py-3 rounded-2xl font-retro text-[9px] uppercase transition-all ${activeTab === 'my' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
               >
                 My Walk
               </button>
               <button 
                 onClick={() => setActiveTab('discover')} 
                 className={`flex-1 py-3 rounded-2xl font-retro text-[9px] uppercase transition-all ${activeTab === 'discover' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
               >
                 Discover
               </button>
            </div>

            {activeTab === 'my' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                {myActivePlans.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-black/40 border-4 border-dashed border-white/5 rounded-[3rem] opacity-30">
                     <div className="text-6xl mb-4">📖</div>
                     <p className="font-serif italic text-xl text-white">You are not currently enrolled in a plan.</p>
                     <button onClick={() => setActiveTab('discover')} className="mt-6 text-blue-400 font-retro text-[9px] uppercase underline">Discover Wisdom</button>
                  </div>
                ) : (
                  myActivePlans.map(p => renderPlanCard(p, true))
                )}
              </div>
            )}

            {activeTab === 'discover' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                {discoveredPlans.map(p => renderPlanCard(p, true))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlansView;
