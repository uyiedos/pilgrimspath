
import React, { useState } from 'react';
import Button from './Button';
import { AudioSystem } from '../utils/audio';
import { LanguageCode, UI_TEXT } from '../translations';
import { BiblePlan } from '../types';
import { supabase } from '../lib/supabase';

interface PlansViewProps {
  onBack: () => void;
  onAddPoints: (points: number) => void;
  language: LanguageCode;
  plans: BiblePlan[];
  onUpdatePlans: (plans: BiblePlan[]) => void;
  spendPoints?: (amount: number) => Promise<boolean>;
}

const PlansView: React.FC<PlansViewProps> = ({ 
  onBack, 
  onAddPoints, 
  language,
  plans,
  onUpdatePlans,
  spendPoints
}) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'create'>('browse');
  const [selectedPlan, setSelectedPlan] = useState<BiblePlan | null>(null);
  const [activeReading, setActiveReading] = useState<{ plan: BiblePlan; day: any } | null>(null);

  // Form State
  const [customTitle, setCustomTitle] = useState('');
  const [customFocus, setCustomFocus] = useState('');
  const [customDuration, setCustomDuration] = useState(7);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[language][key] || UI_TEXT['en'][key];
  };

  // Helper to check if a day is locked
  const isDayLocked = (plan: BiblePlan, dayNum: number) => {
    if (!plan.isActive) return true;
    
    // If plan is active but has no startDate, set it to today
    if (!plan.startDate) {
      const today = new Date().toISOString().split('T')[0];
      const updatedPlans = plans.map(p => {
        if (p.id === plan.id) {
          return { ...p, startDate: today };
        }
        return p;
      });
      onUpdatePlans(updatedPlans);
      return dayNum > 1; // Only day 1 should be unlocked for new plans
    }
    
    // Calculate days passed since start date (inclusive)
    // e.g. Start 2023-10-01. Today 2023-10-01. Diff = 0. Day 1 should be unlocked.
    const start = new Date(plan.startDate).setHours(0,0,0,0);
    const now = new Date().setHours(0,0,0,0);
    const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    
    // DayNum 1 is index 0. Unlock logic:
    // If Day 1, needed daysPassed >= 0.
    // If Day 2, needed daysPassed >= 1.
    // This logic is correct - day is locked if it's beyond days passed
    return (dayNum - 1) > daysPassed;
  };

  const getDaysUntilUnlock = (plan: BiblePlan, dayNum: number) => {
      if (!plan.startDate) return 0;
      const start = new Date(plan.startDate).setHours(0,0,0,0);
      const targetDate = new Date(start);
      targetDate.setDate(targetDate.getDate() + (dayNum - 1));
      
      const now = new Date().setHours(0,0,0,0);
      return Math.ceil((targetDate.getTime() - now) / (1000 * 60 * 60 * 24));
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customFocus || !startDate) return;

    // Check Cost - 50 XP
    if (spendPoints) {
        const success = await spendPoints(50);
        if (!success) return;
    }

    setIsGenerating(true);
    setGenerationStatus('Consulting Scriptures & Generating Imagery...');

    // Calculate End Date
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(start.getDate() + customDuration);
    
    // Generate Unique ID for the plan
    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : Date.now().toString(36) + Math.random().toString(36).substr(2);
      
    const planId = `custom_${uniqueId}`;

    // Generate Cover Image & Upload to Storage
    let finalImageUrl = '';
    try {
        const imageUrl = `https://image.pollinations.ai/prompt/pixel%20art%20bible%20spiritual%20concept%20${encodeURIComponent(customFocus)}?width=400&height=250&nologo=true`;
        
        // Fetch Blob
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        // Upload
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
             const fileName = `plans/${userId}/${uniqueId}.png`;
             await supabase.storage.from('journey_assets').upload(fileName, blob, { contentType: 'image/png', upsert: true });
             
             // Get Public URL
             const { data } = supabase.storage.from('journey_assets').getPublicUrl(fileName);
             finalImageUrl = data.publicUrl;
        } else {
             // Fallback if not authenticated or error
             finalImageUrl = imageUrl;
        }
    } catch (err) {
        console.error("Error generating/uploading plan image", err);
        // Fallback to direct link
        finalImageUrl = `https://image.pollinations.ai/prompt/pixel%20art%20bible%20spiritual%20concept%20${encodeURIComponent(customFocus)}?width=400&height=250&nologo=true`;
    }

    const newPlan: BiblePlan = {
        id: planId,
        title: customTitle,
        desc: `A custom journey focusing on ${customFocus}. Created by you.`,
        category: 'Custom',
        image: finalImageUrl,
        duration: customDuration,
        progress: 0,
        isActive: false,
        startDate: startDate,
        endDate: end.toISOString().split('T')[0],
        days: Array.from({ length: customDuration }, (_, i) => ({
            day: i + 1,
            reading: "Generating...",
            topic: `Day ${i + 1} of ${customTitle}`,
            content: `AI generated reflection for day ${i + 1} focusing on ${customFocus}.`
        }))
    };

    onUpdatePlans([newPlan, ...plans]);
    setIsGenerating(false);
    setGenerationStatus('');
    setActiveTab('browse');
    setCustomTitle('');
    setCustomFocus('');
    
    // Award XP for creation
    onAddPoints(25);
    AudioSystem.playAchievement();
  };

  const handleStartPlan = (plan: BiblePlan) => {
    let updatedPlanList = [...plans];
    let activePlan = plan;

    // If not active, activate it first
    if (!plan.isActive) {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + plan.duration);

        updatedPlanList = plans.map(p => {
            if (p.id === plan.id) {
                return {
                    ...p,
                    isActive: true,
                    progress: 0, 
                    startDate: today.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    lastCompletedDate: undefined // Reset daily completion tracking
                };
            }
            return p;
        });
        onUpdatePlans(updatedPlanList);
        
        // Update local ref to the new object in array
        activePlan = updatedPlanList.find(p => p.id === plan.id)!;
        
        // Awards
        onAddPoints(20);
        AudioSystem.playLevelComplete();
    }

    // Determine which day to open
    const daysPassed = Math.floor((Date.now() - new Date(activePlan.startDate!).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    // We open the latest available day (daysPassed + 1), but cap at duration.
    const dayIndexToOpen = Math.min(daysPassed, activePlan.duration - 1);
    
    const availableDays = activePlan.days || [];
    
    if (dayIndexToOpen < activePlan.duration) {
        let dayToRead;
        
        if (dayIndexToOpen < availableDays.length) {
            dayToRead = availableDays[dayIndexToOpen];
        } else {
             dayToRead = {
                 day: dayIndexToOpen + 1,
                 topic: `Day ${dayIndexToOpen + 1}: Reflection`,
                 reading: "Psalm 119:105", 
                 content: "Continue your journey in the Word. Reflect on God's guidance today as you progress further into your plan."
             };
        }

        setActiveReading({ plan: activePlan, day: dayToRead });
        setSelectedPlan(null); // Close the detail modal
    }
  };

  const handleOpenDay = (plan: BiblePlan, day: any) => {
      const locked = isDayLocked(plan, day.day);
      
      if (plan.isActive && locked) {
          alert(`This day is locked until tomorrow. Patience is a virtue.`);
          return;
      }
      setActiveReading({ plan, day });
      setSelectedPlan(null);
  }

  const handleCompleteReading = () => {
      if (!activeReading) return;

      const { plan } = activeReading;
      const today = new Date().toISOString().split('T')[0];

      // Check for daily limit abuse
      if (plan.lastCompletedDate === today) {
          alert("You have already completed your reading for today. Come back tomorrow for the next step in your journey.");
          setActiveReading(null); // Close reading view
          return;
      }
      
      // Calculate new progress
      const step = 100 / plan.duration;
      const newProgress = Math.min(100, plan.progress + step);
      
      const updatedPlans = plans.map(p => {
          if (p.id === plan.id) {
              return { 
                  ...p, 
                  progress: newProgress,
                  lastCompletedDate: today 
              };
          }
          return p;
      });
      onUpdatePlans(updatedPlans);
      
      onAddPoints(50);
      AudioSystem.playLevelComplete();
      
      setActiveReading(null); // Close reading view
  };

  // Helper to calculate End Date for form display
  const getCalculatedEndDate = () => {
      if (!startDate) return '...';
      const d = new Date(startDate);
      d.setDate(d.getDate() + customDuration);
      return d.toLocaleDateString();
  };

  // Ensure full duration array for display
  const getDisplayDays = (plan: BiblePlan) => {
      const definedDays = plan.days || [];
      const fullDurationDays = [];
      
      for(let i=0; i<plan.duration; i++) {
          if (i < definedDays.length) {
              fullDurationDays.push(definedDays[i]);
          } else {
              fullDurationDays.push({
                  day: i + 1,
                  topic: `Day ${i + 1}: Continuing the Path`,
                  reading: "Daily Scripture",
                  content: "Detailed content will be revealed on this day."
              });
          }
      }
      return fullDurationDays;
  };

  const handleSharePlan = async (plan: BiblePlan) => {
    const textToShare = `Join me on The Journey! I'm starting the '${plan.title}' reading plan. \n\nFound on The Journey App.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'The Journey: Bible Plans',
          text: textToShare,
          url: window.location.href
        });
      } catch (err) {
        // Ignore cancellation
      }
    } else {
      navigator.clipboard.writeText(textToShare);
      alert("Plan link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center animate-fade-in relative">
       
       {/* Background Texture */}
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-50 pointer-events-none"></div>

       {/* READING VIEW OVERLAY */}
       {activeReading && (
         <div className="fixed inset-0 z-[60] bg-gray-900 flex flex-col animate-slide-up overflow-y-auto">
             {/* Header Image */}
             <div className="relative h-48 md:h-64 shrink-0">
                 <img src={activeReading.plan.image} className="w-full h-full object-cover opacity-60" />
                 <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
                 <div className="absolute bottom-4 left-4 md:left-8">
                    <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded font-bold uppercase mb-2 inline-block">{t('days')} {activeReading.day.day}</span>
                    <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">{activeReading.day.topic}</h2>
                 </div>
                 <button 
                   onClick={() => setActiveReading(null)}
                   className="absolute top-4 right-4 bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors border-2 border-white/20"
                 >
                   ✕
                 </button>
             </div>

             <div className="flex-1 max-w-3xl mx-auto w-full p-6 md:p-8">
                 <div className="bg-gray-800 p-6 rounded-xl border-l-4 border-yellow-500 mb-8 shadow-lg">
                    <div className="flex items-center gap-3 mb-4 text-yellow-500">
                       <span className="text-2xl">📖</span>
                       <span className="font-retro text-sm uppercase">Scripture Reading</span>
                    </div>
                    <h3 className="text-xl md:text-2xl text-white font-serif font-bold mb-2">{activeReading.day.reading}</h3>
                    <p className="text-gray-400 text-sm italic">Read this passage in your Bible or the Reader app.</p>
                 </div>

                 <div className="prose prose-invert prose-lg max-w-none mb-12">
                    <p className="text-gray-300 leading-relaxed text-lg">
                      {activeReading.day.content || "Reflect on today's scripture. Ask God to speak to you through His Word. What is the Holy Spirit highlighting to you in this passage?"}
                    </p>
                 </div>

                 <div className="flex flex-col gap-4 mb-12">
                    <div className="bg-blue-900/20 p-6 rounded-lg border border-blue-500/30">
                       <h4 className="text-blue-400 font-bold mb-2 uppercase text-xs tracking-widest">{t('prayer_focus')}</h4>
                       <p className="text-gray-300 italic">"Lord, open my eyes to see the truth in this word. Help me apply it to my life today. Amen."</p>
                    </div>
                 </div>
                 
                 <div className="flex flex-col items-center gap-6">
                    <Button onClick={handleCompleteReading} className="w-full md:w-auto py-4 px-12 text-lg bg-green-600 hover:bg-green-500">
                       {t('complete_reading')} (+50 XP)
                    </Button>
                 </div>
             </div>
         </div>
       )}

       {/* Header */}
       <header className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center mb-8 border-b-4 border-gray-700 pb-4 relative z-10 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-retro text-white text-shadow-md">{t('plans')}</h1>
            <p className="text-gray-400 font-serif italic mt-1">Structured paths for spiritual growth.</p>
          </div>
          
          <div className="flex gap-4">
              <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-600">
                  <button 
                    onClick={() => setActiveTab('browse')}
                    className={`px-4 py-2 rounded font-retro text-xs transition-colors ${activeTab === 'browse' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    {t('browse').toUpperCase()}
                  </button>
                  <button 
                    onClick={() => setActiveTab('create')}
                    className={`px-4 py-2 rounded font-retro text-xs transition-colors ${activeTab === 'create' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    + {t('create').toUpperCase()}
                  </button>
              </div>
              <Button onClick={onBack} variant="secondary" className="text-xs">🏠 {t('exit')}</Button>
          </div>
       </header>

       {/* CONTENT AREA */}
       <div className="w-full max-w-6xl relative z-10">
          
          {/* BROWSE TAB */}
          {activeTab === 'browse' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-up">
                {plans.map((plan) => (
                    <div 
                        key={plan.id} 
                        onClick={() => setSelectedPlan(plan)}
                        className={`
                           bg-gray-800 rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.02] cursor-pointer group pixel-shadow flex flex-col h-full
                           ${plan.isActive ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-gray-700 hover:border-gray-500'}
                        `}
                    >
                    <div className="h-40 overflow-hidden relative border-b-2 border-black">
                        <img src={plan.image} alt={plan.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="absolute top-2 right-2 flex gap-1">
                             {plan.isActive && (
                               <span className="text-[10px] px-2 py-1 rounded font-bold uppercase border shadow-sm bg-green-600 border-green-400 text-white animate-pulse">
                                 ACTIVE
                               </span>
                             )}
                             <span className={`
                                text-[10px] px-2 py-1 rounded font-bold uppercase border shadow-sm
                                ${plan.category === 'Custom' ? 'bg-purple-600 border-purple-400 text-white' : 'bg-black/70 border-gray-500 text-gray-300'}
                             `}>
                                {plan.category}
                             </span>
                        </div>

                        {plan.isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-900">
                            <div className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000" style={{ width: `${Math.max(5, plan.progress)}%` }}></div>
                        </div>
                        )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs text-gray-400 font-mono">📅 {plan.duration} {t('days')}</span>
                            {plan.isActive && <span className="text-xs text-green-400 font-bold">{Math.round(plan.progress)}%</span>}
                        </div>
                        <h3 className="text-white font-bold text-lg mb-1 leading-tight group-hover:text-yellow-400 transition-colors">{plan.title}</h3>
                        <p className="text-gray-400 text-xs mb-4 line-clamp-3">{plan.desc}</p>
                        
                        {plan.startDate && (
                           <p className="text-[10px] text-blue-300 font-mono mb-2">
                             {t('schedule').toUpperCase()}: {new Date(plan.startDate).toLocaleDateString()} - {plan.endDate ? new Date(plan.endDate).toLocaleDateString() : '...'}
                           </p>
                        )}

                        <div className="mt-auto">
                            <Button 
                                className={`w-full text-xs py-2 ${plan.isActive ? 'bg-green-700 hover:bg-green-600' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation(); // Don't open detail modal, go straight to action
                                    handleStartPlan(plan);
                                }}
                            >
                                {plan.isActive ? t('continue_journey') : t('start_plan')}
                            </Button>
                        </div>
                    </div>
                    </div>
                ))}
            </div>
          )}

          {/* CREATE TAB */}
          {activeTab === 'create' && (
              <div className="max-w-2xl mx-auto bg-gray-800 border-4 border-green-700 p-8 rounded-xl pixel-shadow animate-slide-in">
                  <div className="text-center mb-8">
                      <div className="text-5xl mb-2">🛠️</div>
                      <h2 className="text-2xl font-retro text-green-400">{t('forge_path')}</h2>
                      <p className="text-gray-400 text-sm mt-2">
                          {t('custom_plan_desc')}
                      </p>
                  </div>

                  <form onSubmit={handleCreatePlan} className="space-y-6">
                      <div>
                          <label className="block text-green-400 font-retro text-xs uppercase mb-2">{t('name_plan')}</label>
                          <input 
                            type="text" 
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder="e.g., Finding Hope in Anxiety..."
                            className="w-full bg-black border-2 border-gray-600 text-white p-3 rounded focus:border-green-500 outline-none font-mono"
                            maxLength={40}
                            disabled={isGenerating}
                          />
                      </div>

                      <div>
                          <label className="block text-green-400 font-retro text-xs uppercase mb-2">{t('spiritual_focus')}</label>
                          <textarea 
                            value={customFocus}
                            onChange={(e) => setCustomFocus(e.target.value)}
                            placeholder="What do you want to learn? (e.g., 'Leadership lessons from Moses' or 'Understanding grace')"
                            className="w-full bg-black border-2 border-gray-600 text-white p-3 rounded focus:border-green-500 outline-none font-mono h-24 resize-none"
                            disabled={isGenerating}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-6 bg-black/30 p-4 rounded border border-gray-700">
                        <div>
                            <label className="block text-green-400 font-retro text-xs uppercase mb-2">{t('duration')}: <span className="text-white">{customDuration} {t('days')}</span></label>
                            <input 
                                type="range" 
                                min="3" 
                                max="30" 
                                value={customDuration}
                                onChange={(e) => setCustomDuration(Number(e.target.value))}
                                className="w-full accent-green-500 cursor-pointer"
                                disabled={isGenerating}
                            />
                        </div>
                        <div>
                            <label className="block text-green-400 font-retro text-xs uppercase mb-2">Start Date</label>
                            <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-black border-2 border-gray-600 text-white p-2 rounded focus:border-green-500 outline-none font-mono text-sm"
                                disabled={isGenerating}
                                required
                            />
                        </div>
                        <div className="col-span-2 text-center text-xs font-mono text-gray-400 border-t border-gray-700 pt-2">
                           {t('projected_end').toUpperCase()}: <span className="text-white">{getCalculatedEndDate()}</span>
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        className={`w-full py-4 text-sm ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                        disabled={isGenerating || !customTitle || !customFocus || !startDate}
                        variant="success"
                      >
                          {isGenerating ? (
                              <span className="flex items-center justify-center gap-2">
                                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                  {generationStatus || t('consulting_scriptures').toUpperCase()}
                              </span>
                          ) : (
                              `${t('generate_plan').toUpperCase()} (-50 XP)`
                          )}
                      </Button>
                  </form>
              </div>
          )}
       </div>

       {/* PLAN DETAIL MODAL */}
       {selectedPlan && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
               <div className="bg-gray-800 w-full max-w-3xl rounded-xl border-4 border-gray-600 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                   
                   {/* Modal Header */}
                   <div className="relative h-48 bg-black shrink-0">
                       <img src={selectedPlan.image} className="w-full h-full object-cover opacity-60" />
                       <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent"></div>
                       
                       <div className="absolute top-4 right-4 flex gap-2">
                           <button 
                             onClick={() => handleSharePlan(selectedPlan)}
                             className="bg-black/50 hover:bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors border-2 border-white/20"
                             title="Share Plan"
                           >
                             ↗️
                           </button>
                           <button 
                             onClick={() => setSelectedPlan(null)}
                             className="bg-black/50 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors border-2 border-white/20"
                           >
                             ✕
                           </button>
                       </div>

                       <div className="absolute bottom-4 left-6">
                           <h2 className="text-3xl font-retro text-white text-shadow-md">{selectedPlan.title}</h2>
                           <div className="flex items-center gap-3 mt-1">
                               {selectedPlan.isActive && (
                                 <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded font-bold uppercase animate-pulse">In Progress</span>
                               )}
                               <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-bold uppercase">{selectedPlan.category}</span>
                               <span className="text-xs text-gray-300 font-mono">{t('duration')}: {selectedPlan.duration} {t('days')}</span>
                           </div>
                       </div>
                   </div>

                   {/* Modal Body */}
                   <div className="p-6 overflow-y-auto custom-scroll">
                       <p className="text-gray-300 text-lg font-serif mb-6 border-l-4 border-yellow-500 pl-4 bg-gray-900/50 py-2">
                           {selectedPlan.desc}
                       </p>

                       {selectedPlan.isActive && (
                         <div className="mb-6 bg-gray-900 p-4 rounded border border-green-800/50">
                            <h4 className="text-green-400 font-retro text-xs uppercase mb-2">Your {t('schedule')}</h4>
                            <div className="flex justify-between text-sm font-mono text-gray-300">
                               <span>Start: {selectedPlan.startDate ? new Date(selectedPlan.startDate).toLocaleDateString() : 'N/A'}</span>
                               <span>End: {selectedPlan.endDate ? new Date(selectedPlan.endDate).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="w-full h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                               <div className="h-full bg-green-500" style={{ width: `${selectedPlan.progress}%` }}></div>
                            </div>
                         </div>
                       )}

                       <h3 className="text-yellow-500 font-retro text-sm uppercase mb-4">
                           {selectedPlan.isActive ? 'Click a day to read' : 'Schedule Preview'}
                       </h3>
                       
                       <div className="space-y-2">
                           {getDisplayDays(selectedPlan).map((day) => {
                               const locked = selectedPlan.isActive && isDayLocked(selectedPlan, day.day);
                               return (
                               <div 
                                  key={day.day} 
                                  onClick={() => handleOpenDay(selectedPlan, day)}
                                  className={`
                                      flex items-center bg-gray-900 p-3 rounded border transition-all cursor-pointer group
                                      ${locked ? 'border-gray-800 opacity-60' : 'border-gray-700 hover:border-blue-500 hover:bg-gray-800'}
                                  `}
                               >
                                   <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-mono text-sm mr-4 ${selectedPlan.isActive && day.day <= 1 ? 'bg-green-900 border-green-500 text-green-300' : 'bg-gray-800 border-gray-600 text-gray-400'}`}>
                                       {day.day}
                                   </div>
                                   <div className="flex-1">
                                       <h4 className="text-white font-bold text-sm group-hover:text-yellow-400 transition-colors">
                                            {day.topic}
                                       </h4>
                                       <p className="text-gray-400 text-xs font-serif">{day.reading}</p>
                                   </div>
                                   <div className="text-gray-600 text-lg group-hover:text-blue-400 transform group-hover:translate-x-1 transition-transform">
                                       {locked ? '🔒' : '→'}
                                   </div>
                               </div>
                           )})}
                       </div>
                   </div>

                   {/* Modal Footer */}
                   <div className="p-4 bg-gray-900 border-t border-gray-700 shrink-0 flex justify-end gap-3">
                       <Button variant="secondary" onClick={() => setSelectedPlan(null)} className="text-xs">Close</Button>
                       <Button 
                         className={`text-xs ${selectedPlan.isActive ? 'bg-green-700 hover:bg-green-600' : ''}`}
                         onClick={() => handleStartPlan(selectedPlan)}
                       >
                         {selectedPlan.isActive ? t('continue_journey') : `${t('start_plan')} (+20 XP)`}
                       </Button>
                   </div>
               </div>
           </div>
       )}

    </div>
  );
};

export default PlansView;
