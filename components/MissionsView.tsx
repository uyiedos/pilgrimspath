
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { User, Mission, AppView } from '../types';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { UI_TEXT, LanguageCode } from '../translations';

interface MissionsViewProps {
  user: User | null;
  collectedVerses: string[];
  onBack: () => void;
  onNavigate: (view: AppView) => void;
  onAddPoints: (amount: number) => void;
  language?: LanguageCode;
}

const MOCK_MISSIONS: Mission[] = [
    { id: '1', title: 'Morning Prayer', description: 'Complete your Daily Devotional', type: 'Daily', reward_xp: 50, icon: '🙏', action_key: 'daily_devo', target_count: 1 },
    { id: '2', title: 'Scripture Hunter', description: 'Find 3 new verses in Campaign Mode', type: 'Daily', reward_xp: 100, icon: '🔍', action_key: 'find_verses', target_count: 3 },
    { id: '3', title: 'Faithful Scribe', description: 'Write 5 Journal Entries', type: 'Weekly', reward_xp: 300, icon: '✍️', action_key: 'journal_entry', target_count: 5 },
    { id: '4', title: 'Community Pillar', description: 'Donate to the Treasury', type: 'Weekly', reward_xp: 250, icon: '🪙', action_key: 'tithe', target_count: 1 },
    { id: '5', title: 'Legendary Pilgrim', description: 'Reach Level 20', type: 'Career', reward_xp: 5000, icon: '👑', action_key: 'level_up', target_count: 20 },
];

const MissionsView: React.FC<MissionsViewProps> = ({ user, collectedVerses, onBack, onNavigate, onAddPoints, language = 'en' }) => {
  const [activeTab, setActiveTab] = useState<'Daily' | 'Weekly' | 'Career'>('Daily');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);

  const t = (key: keyof typeof UI_TEXT['en']) => {
    return UI_TEXT[language][key] || UI_TEXT['en'][key];
  };

  useEffect(() => {
    fetchMissions();
  }, [activeTab]);

  const fetchMissions = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('missions')
            .select('*')
            .eq('type', activeTab);
        
        if (data && data.length > 0) {
            setMissions(data);
        } else {
            // Fallback to mocks if no DB data
            setMissions(MOCK_MISSIONS.filter(m => m.type === activeTab)); 
        }
    } catch(e) {
        console.error(e);
        setMissions(MOCK_MISSIONS.filter(m => m.type === activeTab));
    }
    setLoading(false);
  };

  const handleClaim = async (mission: Mission) => {
      if (!user) return;
      
      AudioSystem.playAchievement();
      onAddPoints(mission.reward_xp);
      alert(`Claimed ${mission.reward_xp} XP!`);
      
      // Ideally update DB here to mark as claimed
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] animate-fade-in custom-scroll">
        <div className="w-full max-w-4xl mb-6 flex justify-between items-center bg-gray-900/80 p-6 rounded-2xl border-b-4 border-yellow-600 shadow-xl">
            <div>
                <h1 className="text-3xl font-retro text-yellow-500 uppercase tracking-tighter">{t('header_quest_log')}</h1>
                <p className="text-gray-400 text-xs font-mono mt-1">Current Objectives</p>
            </div>
            <Button onClick={onBack} variant="secondary">Back</Button>
        </div>

        <div className="w-full max-w-4xl flex flex-col h-[70vh] bg-gray-900/60 rounded-3xl border border-white/10 overflow-hidden backdrop-blur-md shadow-2xl">
            {/* Tabs */}
            <div className="flex bg-black/50 p-2 gap-2 overflow-x-auto no-scrollbar mb-2 shrink-0">
                {['Daily', 'Weekly', 'Career'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`flex-1 py-3 px-6 rounded-xl font-retro text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-yellow-600 text-black shadow-lg scale-[1.02]' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'}`}
                    >
                        {t(`mission_${tab.toLowerCase()}` as any)}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 custom-scroll bg-black/40">
                {loading ? (
                    <div className="text-center py-20 text-gray-500 font-mono animate-pulse">Loading directives...</div>
                ) : missions.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">
                        <div className="text-4xl mb-4 grayscale opacity-50">📜</div>
                        <p>No active missions in this category.</p>
                    </div>
                ) : (
                    missions.map(mission => (
                        <div key={mission.id} className="bg-gray-800/80 p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-yellow-500/30 transition-colors">
                            <div className="text-3xl bg-black/40 w-12 h-12 flex items-center justify-center rounded-xl">{mission.icon || '⚔️'}</div>
                            <div className="flex-1">
                                <h4 className="text-white font-bold text-sm">{mission.title}</h4>
                                <p className="text-gray-400 text-xs">{mission.description}</p>
                                <div className="mt-2 w-full bg-black/50 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-yellow-600 h-full w-1/2"></div> {/* Mock progress */}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block text-yellow-500 font-mono text-xs font-bold mb-2">+{mission.reward_xp} XP</span>
                                <button onClick={() => handleClaim(mission)} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider">
                                    Claim
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

export default MissionsView;
