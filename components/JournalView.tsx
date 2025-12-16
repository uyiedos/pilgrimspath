
import React, { useMemo, useState } from 'react';
import Button from './Button';
import { GameState, GameModeId } from '../types';
import { LEVELS, GAMES } from '../constants';
import { AudioSystem } from '../utils/audio';

interface JournalViewProps {
  state: GameState;
  onBack: () => void;
  onSocialAction?: (action: 'like' | 'pray' | 'comment' | 'share') => void;
  onSaveNote?: (content: string) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ state, onBack, onSocialAction, onSaveNote }) => {
  const [activeTab, setActiveTab] = useState<'gameplay' | 'personal'>('gameplay');
  const [filter, setFilter] = useState<'all' | GameModeId>('all');
  const [newNote, setNewNote] = useState('');

  // Calculate aggregated stats
  const stats = useMemo(() => {
    let totalLevelsCleared = 0;
    const campaignProgress = GAMES.map(game => {
      const unlocked = state.progress[game.id] || 1;
      const total = game.levels.length;
      const cleared = Math.min(unlocked - 1, total); // Level 1 unlocked means 0 cleared
      totalLevelsCleared += cleared;
      
      return {
        id: game.id,
        title: game.title,
        cleared,
        total,
        percentage: Math.round((cleared / total) * 100)
      };
    });

    return { totalLevelsCleared, campaignProgress };
  }, [state.progress]);

  // Group verses by Campaign
  const groupedVerses = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    
    // Initialize groups
    GAMES.forEach(g => grouped[g.id] = []);
    grouped['unknown'] = [];

    state.collectedVerses.forEach(verse => {
      // Find source level
      const sourceLevel = LEVELS.find(l => l.bibleContext.keyVerse === verse);
      
      if (sourceLevel) {
        // Find which game this level belongs to
        let foundGameId = 'unknown';
        for (const g of GAMES) {
             if (g.levels.some(l => l.bibleContext.keyVerse === verse)) {
                 foundGameId = g.id;
                 break;
             }
        }
        if (grouped[foundGameId]) {
            grouped[foundGameId].push(verse);
        } else {
            grouped['unknown'].push(verse);
        }
      } else {
        grouped['unknown'].push(verse);
      }
    });

    return grouped;
  }, [state.collectedVerses]);

  const activeVerses = filter === 'all' 
    ? state.collectedVerses 
    : groupedVerses[filter] || [];

  // Determine collection based on badges/XP (Simple logic for now until synced from avatar_history via props)
  const isForged = state.user?.badges.includes('creator') || (state.totalPoints > 10000 && state.user?.avatar.includes('journey_assets'));
  const collectionName = isForged ? 'Forged Collection' : 'Genesis Collection';

  const handleShareVerse = async (verse: string, reference: string) => {
    const textToShare = `"${verse}"\n— ${reference}\nFound on The Journey App`;
    
    if (onSocialAction) onSocialAction('share');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Journey Revelation',
          text: textToShare,
          url: window.location.href,
        });
      } catch (err) {
        // Ignore cancellation
      }
    } else {
      navigator.clipboard.writeText(textToShare);
      alert("Verse copied to clipboard!");
    }
  };

  const handleSubmitNote = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newNote.trim() || !onSaveNote) return;
      
      // Play audio feedback
      AudioSystem.playVoxelTap();
      
      onSaveNote(newNote);
      setNewNote('');
      alert("Note saved to journal.");
  };

  return (
    <div className="min-h-screen bg-amber-50 text-amber-900 font-serif p-4 pt-20 md:p-8 md:pt-24 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] animate-fade-in">
      <div className="max-w-6xl mx-auto border-4 border-amber-800 bg-amber-100 shadow-2xl relative overflow-hidden rounded-lg min-h-[80vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-amber-900 text-amber-50 p-6 flex flex-col md:flex-row justify-between items-center shadow-md relative z-10">
           <div className="flex items-center gap-4">
              <div className="relative">
                  <div className="text-4xl">📜</div>
                  {/* NFT Collection Badge */}
                  <div className={`absolute -bottom-1 -right-8 text-[8px] uppercase font-bold px-1.5 py-0.5 rounded border border-white/30 ${isForged ? 'bg-purple-600 text-white' : 'bg-yellow-600 text-black'}`}>
                      {isForged ? 'Forged' : 'Genesis'}
                  </div>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-retro text-amber-200">Spiritual Journal</h1>
                <p className="text-amber-200/60 font-serif italic text-sm">Record of the Soul • {state.user?.username || 'Traveler'}</p>
              </div>
           </div>
           
           <div className="flex gap-2 mt-4 md:mt-0">
               <button 
                 onClick={() => setActiveTab('gameplay')}
                 className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors ${activeTab === 'gameplay' ? 'bg-amber-200 text-amber-900 shadow-inner' : 'bg-amber-800 text-amber-300 hover:bg-amber-700'}`}
               >
                 Campaign Revelations
               </button>
               <button 
                 onClick={() => setActiveTab('personal')}
                 className={`px-4 py-2 rounded text-xs font-bold uppercase transition-colors ${activeTab === 'personal' ? 'bg-amber-200 text-amber-900 shadow-inner' : 'bg-amber-800 text-amber-300 hover:bg-amber-700'}`}
               >
                 My Notes
               </button>
               <Button onClick={onBack} variant="secondary" className="bg-amber-950 border-amber-950 text-amber-100 hover:bg-amber-800 ml-2">
                 Close
               </Button>
           </div>
        </div>

        {/* GAMEPLAY TAB */}
        {activeTab === 'gameplay' && (
            <div className="flex-1 flex flex-col md:flex-row">
            
            {/* LEFT SIDEBAR: CAMPAIGN PROGRESS */}
            <div className="w-full md:w-1/3 bg-amber-100/80 p-6 border-r-2 border-amber-800/20 overflow-y-auto">
                <h3 className="text-xl font-bold font-retro text-amber-900 mb-6 flex items-center gap-2">
                    <span>🗺️</span> Campaign Progress
                </h3>

                <div className="space-y-6">
                    {/* Aggregate Stats */}
                    <div className="bg-white p-4 rounded-lg border border-amber-200 shadow-sm flex justify-around text-center">
                        <div>
                        <div className="text-2xl font-bold text-amber-800">{stats.totalLevelsCleared}</div>
                        <div className="text-[10px] uppercase tracking-widest text-amber-600">Levels Cleared</div>
                        </div>
                        <div>
                        <div className="text-2xl font-bold text-amber-800">{state.collectedVerses.length}</div>
                        <div className="text-[10px] uppercase tracking-widest text-amber-600">Verses Found</div>
                        </div>
                    </div>

                    {/* Individual Campaigns */}
                    {stats.campaignProgress.map(camp => (
                        <div 
                        key={camp.id} 
                        onClick={() => setFilter(filter === camp.id ? 'all' : camp.id)}
                        className={`
                            p-4 rounded-lg border-2 transition-all cursor-pointer group
                            ${filter === camp.id 
                            ? 'bg-amber-200 border-amber-600 shadow-md transform scale-[1.02]' 
                            : 'bg-amber-50 border-amber-200 hover:border-amber-400 hover:bg-white'}
                        `}
                        >
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-retro text-sm text-amber-900 group-hover:text-amber-700">{camp.title}</h4>
                            <span className={`text-xs font-bold ${camp.percentage === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                                {camp.percentage}%
                            </span>
                        </div>
                        
                        <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
                            <div 
                                className={`h-full transition-all duration-1000 ${camp.percentage === 100 ? 'bg-green-500' : 'bg-amber-600'}`} 
                                style={{ width: `${camp.percentage}%` }}
                            ></div>
                        </div>
                        <div className="text-right mt-1 text-[10px] text-amber-500">
                            {camp.cleared} / {camp.total} Circles
                        </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT CONTENT: VERSES */}
            <div className="flex-1 p-6 md:p-8 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] bg-amber-50 relative">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold font-retro text-amber-900 flex items-center gap-2">
                        <span>✨</span> Divine Wisdom {filter !== 'all' && <span className="text-sm bg-amber-200 px-2 py-1 rounded-full text-amber-800 normal-case font-serif ml-2">Filtering: {GAMES.find(g => g.id === filter)?.title}</span>}
                    </h3>
                    <span className="text-xs font-mono text-amber-500 hidden md:inline-block">Sync Status: Up to date</span>
                </div>

                {activeVerses.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center border-4 border-dashed border-amber-200 rounded-xl text-amber-400">
                        <span className="text-5xl mb-4 opacity-50">📖</span>
                        <p className="text-lg font-serif italic">No scriptures found yet in this section.</p>
                        <p className="text-sm mt-2">Continue your journey to unlock divine truths.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
                        {activeVerses.map((verse, idx) => {
                        const originLevel = LEVELS.find(l => l.bibleContext.keyVerse === verse);
                        const reference = originLevel ? originLevel.bibleContext.reference : 'Scripture';
                        
                        return (
                            <div key={idx} className="relative group perspective-1000">
                                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-amber-600 transform transition-all hover:scale-[1.01] hover:shadow-xl">
                                    <div className="flex gap-4">
                                    <div className="hidden md:block shrink-0 pt-1">
                                        <div className="w-12 h-12 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-2xl">
                                            {originLevel ? (originLevel.virtue === 'Hope' ? '🕊️' : originLevel.virtue === 'Faith' ? '🛡️' : '✝️') : '✨'}
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-lg md:text-xl font-serif text-gray-800 italic leading-relaxed">
                                            "{verse}"
                                        </p>
                                        
                                        <div className="mt-4 flex flex-wrap justify-between items-center pt-4 border-t border-amber-100">
                                            <div className="flex gap-2 items-center">
                                                {originLevel && (
                                                <>
                                                    <span className="text-[10px] font-retro bg-amber-100 text-amber-800 px-2 py-1 rounded">
                                                        {originLevel.virtue}
                                                    </span>
                                                    <span className="text-[10px] font-retro bg-gray-100 text-gray-600 px-2 py-1 rounded uppercase">
                                                        {originLevel.sin}
                                                    </span>
                                                </>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-bold text-amber-800/60 uppercase tracking-wider">
                                                    {reference}
                                                </span>
                                                <button 
                                                  onClick={() => handleShareVerse(verse, reference)}
                                                  className="text-amber-500 hover:text-amber-700 transition-colors"
                                                  title="Share"
                                                >
                                                    ↗️
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>
            </div>
        )}

        {/* PERSONAL NOTES TAB */}
        {activeTab === 'personal' && (
            <div className="flex-1 p-6 md:p-8 bg-white/50 flex flex-col md:flex-row gap-8">
                
                {/* Note Taking Form */}
                <div className="w-full md:w-1/3">
                    <div className="bg-amber-100 p-6 rounded-xl border-2 border-amber-200 shadow-lg">
                        <h3 className="font-retro text-amber-900 mb-4">Write a Reflection</h3>
                        <form onSubmit={handleSubmitNote}>
                            <textarea 
                                className="w-full h-40 p-4 rounded bg-white border border-amber-300 focus:border-amber-500 outline-none resize-none font-serif text-amber-900 mb-4"
                                placeholder="What is God speaking to you today?"
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                            />
                            <Button type="submit" className="w-full bg-amber-800 border-amber-950 text-amber-100 hover:bg-amber-700">
                                Save Entry
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto max-h-[60vh] pr-2 custom-scroll">
                    <h3 className="font-retro text-amber-900 mb-4">My Journal Entries</h3>
                    
                    {state.journalEntries.length === 0 ? (
                        <div className="text-center py-12 text-amber-800/50 border-4 border-dashed border-amber-200 rounded-xl">
                            <p>No personal notes yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {state.journalEntries.map(entry => (
                                <div key={entry.id} className="bg-white p-5 rounded-lg border border-amber-200 shadow-sm hover:shadow-md transition-shadow relative group">
                                    <span className={`absolute top-4 right-4 text-[10px] uppercase font-bold px-2 py-1 rounded ${entry.type === 'verse' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {entry.type}
                                    </span>
                                    
                                    <div className="mb-2 text-xs text-amber-500 font-mono">
                                        {new Date(entry.createdAt).toLocaleDateString()} • {new Date(entry.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                    
                                    <p className="text-amber-900 font-serif leading-relaxed whitespace-pre-wrap">
                                        {entry.content}
                                    </p>
                                    
                                    {entry.reference && (
                                        <div className="mt-3 pt-3 border-t border-amber-100 text-sm font-bold text-amber-700">
                                            — {entry.reference}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default JournalView;
