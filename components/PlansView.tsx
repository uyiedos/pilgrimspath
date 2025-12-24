import React, { useState, useMemo, useEffect } from 'react';
import Button from './Button';
import { BiblePlan, User } from '../types';
import { UI_TEXT, LanguageCode, getTranslation } from '../translations';
import { AudioSystem } from '../utils/audio';
import { supabase } from '../lib/supabase';
import { getGeminiClient } from '../services/geminiService';

interface PlansViewProps {
  user: User;
  onBack: () => void;
  onAddPoints: (points: number) => void;
  language: LanguageCode;
  plans: BiblePlan[];
  onUpdatePlans: (plans: BiblePlan[]) => void;
  initialPlanId?: string | null;
  spendPoints?: (amount: number, type?: string) => Promise<boolean>;
  onUnlockAchievement?: (id: string) => void;
  onAwardBadge?: (id: string) => void;
}

type SessionStage = 'IDLE' | 'READING' | 'QUIZ' | 'SUCCESS';

const PlansView: React.FC<PlansViewProps> = ({ user, onBack, onAddPoints, language, plans, onUpdatePlans, initialPlanId, spendPoints, onUnlockAchievement, onAwardBadge }) => {
  const [activeTab, setActiveTab] = useState<'my' | 'discover' | 'forge'>('discover');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // Reading Session State
  const [sessionStage, setSessionStage] = useState<SessionStage>('IDLE');
  const [currentStage, setCurrentStage] = useState<any>(null);
  const [scriptureText, setScriptureText] = useState<string>('');
  const [loadingScripture, setLoadingScripture] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Plan Forge State
  const [forgeTitle, setForgeTitle] = useState('');
  const [forgeFocus, setForgeFocus] = useState('');
  const [forgeDuration, setForgeDuration] = useState(7);
  const [isForging, setIsForging] = useState(false);

  useEffect(() => {
    if (initialPlanId) {
        setSelectedPlanId(initialPlanId);
        setActiveTab('discover');
    }
  }, [initialPlanId]);

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return getTranslation(language, key);
  };

  const myActivePlans = useMemo(() => plans.filter(p => p.isActive), [plans]);
  const discoveredPlans = useMemo(() => plans, [plans]);
  const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId), [plans, selectedPlanId]);

  const fetchScripture = async (reference: string) => {
    setLoadingScripture(true);
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=web`);
      if (res.ok) {
        const data = await res.json();
        setScriptureText(data.text);
      } else {
        setScriptureText("The archives are currently inaccessible. Please use your physical Bible for this reading.");
      }
    } catch (e) {
      setScriptureText("Connection to the digital sanctuary interrupted.");
    } finally {
      setLoadingScripture(false);
    }
  };

  const savePlanProgress = async (plan: BiblePlan) => {
      if (!user || user.id.startsWith('offline-')) return;
      
      const payload: any = {
          id: plan.id,
          user_id: user.id,
          title: plan.title,
          description: plan.desc, 
          category: plan.category,
          image: plan.image,
          duration: plan.duration,
          is_active: plan.isActive,
          progress: plan.progress,
          start_date: plan.startDate,
          last_completed_date: plan.lastCompletedDate,
          updated_at: new Date().toISOString()
      };

      // Explicitly include days_json if present (critical for custom plans)
      if (plan.days && plan.days.length > 0) {
          payload.days_json = plan.days;
      }

      const { error } = await supabase.from('user_plans').upsert(payload, { onConflict: 'user_id, id' });

      if (error) {
          console.error("Failed to sync plan to sanctuary:", error);
      }
  };

  const handleStartPlan = async (planId: string) => {
    AudioSystem.playAchievement();
    const newPlans = plans.map(p => {
      if (p.id === planId) {
        const updated = { ...p, isActive: true, startDate: new Date().toISOString(), progress: 0 };
        savePlanProgress(updated);
        return updated;
      }
      return p;
    });
    onUpdatePlans(newPlans);
    
    // Unlock first step achievement
    if (onUnlockAchievement) onUnlockAchievement('plan_starter');
    
    setSelectedPlanId(planId);
    setActiveTab('my');
  };

  const startReading = (stage: any) => {
    AudioSystem.playVoxelTap();
    setCurrentStage(stage);
    setSessionStage('READING');
    fetchScripture(stage.reading);
  };

  const handleCompleteObjective = async () => {
    if (!quizAnswer.trim() || !selectedPlan) return;
    setIsSubmitting(true);
    
    // Server-side Logging (Critical for progress tracking)
    if (user && !user.id.startsWith('offline-')) {
        try {
            await supabase.rpc('complete_plan_stage', {
                p_plan_id: selectedPlan.id,
                p_stage_no: currentStage.day
            });
        } catch (e) {
            console.error("Failed to log stage completion:", e);
        }
    }
    
    // Simulate verification of the soul's intent
    await new Promise(resolve => setTimeout(resolve, 800));
    
    AudioSystem.playLevelComplete();
    setSessionStage('SUCCESS');
    
    const newPlans = plans.map(p => {
      if (p.id === selectedPlan.id) {
        const newProgress = Math.max(p.progress, currentStage.day);
        const isFinished = newProgress >= p.duration;
        
        if (isFinished && !p.lastCompletedDate) {
            onAddPoints(1000); 
            if (onUnlockAchievement) onUnlockAchievement('plan_finisher');
        } else {
            onAddPoints(50); 
        }

        const updated = {
          ...p,
          progress: newProgress,
          lastCompletedDate: isFinished ? new Date().toISOString() : p.lastCompletedDate
        };
        
        // Optimistic Local Save (Backup)
        savePlanProgress(updated);
        return updated;
      }
      return p;
    });
    onUpdatePlans(newPlans);
    setIsSubmitting(false);
  };

  const handleForgePath = async () => {
      if (!forgeFocus.trim() || !forgeTitle.trim()) return;
      
      // Cost Check
      if (user.totalPoints && user.totalPoints < 500) {
          alert("Insufficient XP. Creating a custom journey costs 500 XP.");
          return;
      }

      setIsForging(true);
      AudioSystem.playVoxelTap();

      try {
          const ai = getGeminiClient();
          const prompt = `Create a ${forgeDuration}-stage Bible Reading Plan titled "${forgeTitle}" focused on "${forgeFocus}". 
          Return ONLY a JSON array of objects with keys "day" (number), "reading" (reference like "John 1"), and "topic" (short string).`;
          
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });

          // Deduct points on success generation but before saving
          if (spendPoints) {
              const success = await spendPoints(500, 'forge_plan');
              if (!success) {
                  throw new Error("Payment failed.");
              }
          }

          const jsonStr = response.text?.replace(/```json|```/g, '').trim() || '';
          const days = JSON.parse(jsonStr);

          const newPlan: BiblePlan = {
              id: `custom_${Date.now()}`,
              title: forgeTitle,
              desc: `A custom path focused on ${forgeFocus}`,
              category: 'Custom',
              image: `https://image.pollinations.ai/prompt/pixel%20art%20holy%20path%20${encodeURIComponent(forgeFocus)}?width=400&height=250&nologo=true`,
              duration: forgeDuration,
              progress: 0,
              isActive: true,
              startDate: new Date().toISOString(),
              days: days
          };

          onUpdatePlans([newPlan, ...plans]);
          setSelectedPlanId(newPlan.id);
          setActiveTab('my');
          savePlanProgress(newPlan);
          
          // Rewards for forging
          if (onUnlockAchievement) onUnlockAchievement('plan_architect');
          if (onAwardBadge) onAwardBadge('architect');
          
          AudioSystem.playLevelComplete();
      } catch (e) {
          alert("Forge cooling. Please try again.");
      } finally {
          setIsForging(false);
      }
  };

  const handleSharePlan = async (plan: BiblePlan) => {
    AudioSystem.playVoxelTap();
    const deepLink = `${window.location.origin}${window.location.pathname}?plan_id=${plan.id}`;
    const shareText = `📖 I'm navigating the "${plan.title}" journey on The Journey App. Step into the Word with me!\n\nOverall Completion: ${Math.round((plan.progress/plan.duration)*100)}%`;
    
    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({ title: plan.title, text: shareText, url: deepLink });
        shared = true;
      } catch (e) {}
    } 
    
    if (!shared) {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${deepLink}`);
        alert("Sanctuary link copied!");
        shared = true;
      } catch(e) {}
    }

    if (shared) {
        onAddPoints(20);
        if (onUnlockAchievement) onUnlockAchievement('evangelist');
        AudioSystem.playAchievement();
        alert("+20 XP: Evangelist Bonus");
    }
  };

  const renderPlanCard = (plan: BiblePlan) => (
    <div key={plan.id} className="bg-gray-800/80 backdrop-blur-md rounded-3xl border-2 border-white/5 overflow-hidden flex flex-col group hover:border-yellow-500/50 transition-all shadow-xl">
      <div className="h-40 relative overflow-hidden">
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
            <span>{plan.duration} Stages</span>
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

          <div className="flex gap-2">
            <Button 
              onClick={() => plan.isActive ? setSelectedPlanId(plan.id) : handleStartPlan(plan.id)} 
              className={`flex-1 py-3 text-[10px] rounded-2xl ${plan.isActive ? 'bg-blue-600 border-blue-400' : 'bg-yellow-600 border-yellow-400 text-black'}`}
            >
              {plan.isActive ? 'Resume Journey' : 'Begin Walk'}
            </Button>
            <button onClick={() => handleSharePlan(plan)} className="p-3 bg-gray-700 hover:bg-gray-600 rounded-2xl border border-white/10 transition-colors">↗️</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0d0f] p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] animate-fade-in custom-scroll relative">
      
      {/* READING SESSION OVERLAY */}
      {sessionStage !== 'IDLE' && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center animate-fade-in p-4">
           <div className="w-full max-w-3xl max-h-[90vh] bg-gray-900 border-4 border-white/10 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl relative">
              <button onClick={() => setSessionStage('IDLE')} className="absolute top-6 right-6 z-10 text-gray-500 hover:text-white text-2xl transition-colors">✕</button>
              
              <div className="p-6 md:p-12 overflow-y-auto custom-scroll flex-1">
                  <div className="text-center mb-10">
                     <p className="text-yellow-500 font-retro text-[10px] uppercase tracking-[0.4em] mb-2">Sacred Reflection • Stage {currentStage.day}</p>
                     <h2 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight">{currentStage.reading}</h2>
                  </div>

                  {sessionStage === 'READING' && (
                    <div className="flex flex-col animate-slide-up">
                       <div className="bg-white/[0.03] border-4 border-white/5 p-8 rounded-[3rem] mb-8 relative shadow-inner min-h-[300px]">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
                          {loadingScripture ? (
                            <div className="h-full flex flex-col items-center justify-center py-20 opacity-40">
                                <div className="w-12 h-12 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                                <p className="font-retro text-[8px] uppercase">Unrolling Scroll...</p>
                            </div>
                          ) : (
                            <div className="prose prose-invert prose-lg max-w-none font-serif italic text-gray-200 leading-[1.8] text-lg md:text-2xl whitespace-pre-wrap">
                               {scriptureText}
                            </div>
                          )}
                       </div>
                       <Button onClick={() => setSessionStage('QUIZ')} className="w-full py-5 text-xl bg-yellow-600 border-yellow-400 text-black shadow-2xl animate-glow rounded-3xl uppercase font-retro tracking-widest">
                          Proceed to Faith Check
                       </Button>
                    </div>
                  )}

                  {sessionStage === 'QUIZ' && (
                    <div className="flex flex-col items-center justify-center animate-slide-up space-y-8">
                       <div className="text-center">
                          <div className="text-7xl mb-6 drop-shadow-lg">🕯️</div>
                          <h3 className="text-2xl md:text-4xl font-retro text-white uppercase tracking-tighter mb-4">The Faith Check</h3>
                          <p className="text-gray-400 font-serif italic text-lg max-w-md">What spiritual truth or command resonates from this passage for your life today?</p>
                       </div>
                       
                       <textarea 
                         value={quizAnswer}
                         onChange={(e) => setQuizAnswer(e.target.value)}
                         className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-[2.5rem] text-white outline-none focus:border-yellow-500 font-serif text-xl h-40 resize-none shadow-inner"
                         placeholder="Scribe your reflection..."
                       />

                       <Button 
                         onClick={handleCompleteObjective} 
                         disabled={!quizAnswer.trim() || isSubmitting}
                         className="w-full py-5 text-xl bg-green-600 border-green-400 rounded-3xl"
                       >
                         {isSubmitting ? 'COMMUNING...' : 'COMPLETE STAGE (+50 XP)'}
                       </Button>
                    </div>
                  )}

                  {sessionStage === 'SUCCESS' && (
                    <div className="flex flex-col items-center justify-center animate-slide-up text-center space-y-8 py-10">
                       <div className="text-9xl mb-6 animate-float">✨</div>
                       <h2 className="text-5xl md:text-7xl font-retro text-yellow-400 drop-shadow-2xl uppercase tracking-tighter">Path Clear</h2>
                       <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] inline-block shadow-xl">
                          <p className="text-green-400 font-mono text-3xl font-bold">+50 SPIRIT XP</p>
                          <p className="text-gray-500 text-[10px] uppercase mt-1 tracking-widest">Recorded in Sanctuary Archives</p>
                       </div>
                       <Button onClick={() => { setSessionStage('IDLE'); setQuizAnswer(''); }} className="px-12 py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 uppercase tracking-widest text-xs">Continue Pilgrimage</Button>
                    </div>
                  )}
              </div>
           </div>
        </div>
      )}

      <div className="relative w-full max-w-6xl">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 bg-black/40 backdrop-blur-xl p-4 md:p-6 rounded-[2rem] border border-white/10 shadow-2xl text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4">
             <div className="text-5xl animate-float">📖</div>
             <div>
                <h1 className="text-3xl md:text-5xl font-retro text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600 uppercase tracking-tighter">Reading Plans</h1>
                <p className="text-gray-500 font-mono text-[9px] uppercase tracking-[0.4em] mt-2">Sequential_Wisdom_Module_v7.0</p>
             </div>
          </div>
          <div className="flex gap-3">
             <Button onClick={onBack} variant="secondary" className="px-8 py-3 rounded-2xl bg-white/5 border-white/10">🏠 Home</Button>
          </div>
        </header>

        {selectedPlan ? (
          /* ACTIVE PLAN DETAIL VIEW */
          <div className="animate-slide-up space-y-6 max-w-3xl mx-auto pb-24">
             <div className="bg-black/60 backdrop-blur-3xl border-4 border-white/10 p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
                   <span className="text-9xl grayscale">✨</span>
                </div>
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left relative z-10">
                   <img src={selectedPlan.image} className="w-32 h-32 md:w-48 md:h-48 rounded-[2rem] border-4 border-yellow-500 object-cover shadow-2xl" />
                   <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                         <h2 className="text-2xl md:text-4xl font-retro text-white uppercase tracking-tighter leading-none">{selectedPlan.title}</h2>
                         <button onClick={() => setSelectedPlanId(null)} className="text-gray-500 hover:text-white text-2xl p-2">✕</button>
                      </div>
                      <p className="text-gray-300 font-serif italic text-lg leading-relaxed">"{selectedPlan.desc}"</p>
                      
                      <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                        <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                           <span className="text-[8px] text-gray-500 block uppercase">Length</span>
                           <span className="text-white font-bold">{selectedPlan.duration} Stages</span>
                        </div>
                        <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                           <span className="text-[8px] text-gray-500 block uppercase">Final Reward</span>
                           <span className="text-yellow-500 font-bold">1000 XP</span>
                        </div>
                        <button onClick={() => handleSharePlan(selectedPlan)} className="bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/50 px-4 py-2 rounded-xl text-xs font-bold transition-all">SHARE</button>
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="text-white font-retro text-[10px] uppercase tracking-[0.3em] ml-2 mb-4">Journey Map</h3>
                {selectedPlan.days?.map((day) => {
                   const isCompleted = day.day <= selectedPlan.progress;
                   const isNext = day.day === selectedPlan.progress + 1;
                   
                   return (
                      <div 
                        key={day.day} 
                        className={`bg-white/5 border transition-all rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-center gap-4 ${isCompleted ? 'border-green-500/30 opacity-60' : isNext ? 'border-yellow-500 bg-white/10 shadow-lg scale-[1.02]' : 'border-white/5 opacity-40'}`}
                      >
                         <div className="flex items-center gap-6 text-center md:text-left">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-retro text-sm ${isCompleted ? 'bg-green-600 text-white shadow-inner' : isNext ? 'bg-yellow-600 text-black animate-pulse shadow-[0_0_15px_rgba(202,138,4,0.3)]' : 'bg-gray-800 text-gray-500'}`}>
                               {day.day}
                            </div>
                            <div>
                               <p className="text-white font-bold font-serif text-xl">{day.reading}</p>
                               <p className="text-gray-400 text-[10px] uppercase font-mono tracking-widest">{day.topic}</p>
                            </div>
                         </div>
                         
                         {isNext ? (
                            <Button 
                               onClick={() => startReading(day)}
                               className="px-12 py-3 rounded-2xl bg-yellow-600 border-yellow-400 text-black shadow-xl animate-glow uppercase font-retro text-[10px]"
                            >
                               Start Stage
                            </Button>
                         ) : isCompleted ? (
                            <div className="flex items-center gap-2 text-green-500 font-retro text-[9px] bg-green-900/20 px-4 py-2 rounded-full border border-green-800/30">
                               <span className="text-lg">✓</span> COMPLETE
                            </div>
                         ) : (
                            <div className="flex items-center gap-2 text-gray-600 font-retro text-[9px] bg-white/5 px-4 py-2 rounded-full border border-white/10">
                               <span className="text-lg">🔒</span> FOGGED
                            </div>
                         )}
                      </div>
                   );
                })}
             </div>
          </div>
        ) : (
          /* TABBED LIST VIEW */
          <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-3 gap-2 bg-black/40 p-2 rounded-[2rem] border border-white/10 backdrop-blur-md max-w-xl mx-auto shadow-2xl">
               <button 
                 onClick={() => { AudioSystem.playVoxelTap(); setActiveTab('discover'); }} 
                 className={`flex-1 py-3 rounded-2xl font-retro text-[9px] uppercase transition-all ${activeTab === 'discover' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
               >
                 Discover
               </button>
               <button 
                 onClick={() => { AudioSystem.playVoxelTap(); setActiveTab('my'); }} 
                 className={`flex-1 py-3 rounded-2xl font-retro text-[9px] uppercase transition-all ${activeTab === 'my' ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
               >
                 My Walk
               </button>
               <button 
                 onClick={() => { AudioSystem.playVoxelTap(); setActiveTab('forge'); }} 
                 className={`flex-1 py-3 rounded-2xl font-retro text-[9px] uppercase transition-all ${activeTab === 'forge' ? 'bg-yellow-600 text-black shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
               >
                 Forge
               </button>
            </div>

            {activeTab === 'my' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                {myActivePlans.length === 0 ? (
                  <div className="col-span-full py-32 text-center bg-black/40 border-4 border-dashed border-white/5 rounded-[3rem] opacity-30">
                     <div className="text-8xl mb-6">⛪</div>
                     <p className="font-serif italic text-2xl text-white">Your study table is currently empty.</p>
                     <button onClick={() => setActiveTab('discover')} className="mt-8 text-yellow-500 font-retro text-[10px] uppercase underline tracking-widest hover:text-yellow-400 transition-colors">Browse Wisdom</button>
                  </div>
                ) : (
                  myActivePlans.map(p => renderPlanCard(p))
                )}
              </div>
            )}

            {activeTab === 'discover' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                {discoveredPlans.map(p => renderPlanCard(p))}
              </div>
            )}

            {activeTab === 'forge' && (
              <div className="max-w-2xl mx-auto w-full animate-slide-up pb-24">
                 <div className="bg-black/60 backdrop-blur-2xl p-8 md:p-12 rounded-[3.5rem] border-4 border-yellow-600/30 shadow-2xl">
                    <div className="text-center mb-10">
                       <div className="text-6xl mb-4">⚒️</div>
                       <h2 className="text-3xl font-retro text-yellow-500 uppercase tracking-tighter mb-2">Sacred Forge</h2>
                       <p className="text-gray-400 font-serif italic text-lg">manifest a unique reading journey tailored to your soul's current season.</p>
                    </div>

                    <div className="space-y-6">
                       <div>
                          <label className="block text-gray-500 font-retro text-[8px] uppercase tracking-widest mb-2 ml-2">Plan Title</label>
                          <input 
                            type="text" 
                            value={forgeTitle}
                            onChange={(e) => setForgeTitle(e.target.value)}
                            placeholder="e.g. Overcoming Anxiety"
                            className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-2xl text-white outline-none focus:border-yellow-500 font-serif text-lg"
                          />
                       </div>

                       <div>
                          <label className="block text-gray-500 font-retro text-[8px] uppercase tracking-widest mb-2 ml-2">Spiritual Focus / Passages</label>
                          <textarea 
                            value={forgeFocus}
                            onChange={(e) => setForgeFocus(e.target.value)}
                            placeholder="e.g. Strength in hardship, focusing on the book of James"
                            className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-2xl text-white outline-none focus:border-yellow-500 font-serif text-lg h-32 resize-none"
                          />
                       </div>

                       <div>
                          <label className="block text-gray-500 font-retro text-[8px] uppercase tracking-widest mb-2 ml-2">Duration: {forgeDuration} Stages</label>
                          <input 
                            type="range" min="3" max="30" step="1"
                            value={forgeDuration}
                            onChange={(e) => setForgeDuration(parseInt(e.target.value))}
                            className="w-full accent-yellow-600 h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-[8px] font-mono text-gray-600 mt-2 uppercase">
                             <span>Quick Walk</span>
                             <span>Long Pilgrimage</span>
                          </div>
                       </div>

                       <Button 
                         onClick={handleForgePath} 
                         disabled={isForging || !forgeFocus || !forgeTitle}
                         className="w-full py-6 text-xl bg-yellow-600 border-yellow-400 text-black shadow-2xl animate-glow rounded-3xl uppercase font-retro tracking-widest mt-4"
                       >
                         {isForging ? 'CONSULTING ARCHIVES...' : 'FORGE JOURNEY (-500 XP)'}
                       </Button>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlansView;
