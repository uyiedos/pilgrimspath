
import React, { useState, useEffect } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabase';
import { AudioSystem } from '../utils/audio';
import { User } from '../types';

interface BibleActivitiesViewProps {
  user: User | null;
  onBack: () => void;
  onAddPoints: (points: number) => void;
  onUnlockAchievement: (id: string) => void;
  onAwardBadge: (id: string) => void;
}

const BibleActivitiesView: React.FC<BibleActivitiesViewProps> = ({ 
  user, 
  onBack, 
  onAddPoints, 
  onUnlockAchievement, 
  onAwardBadge 
}) => {
  const [learnedActivities, setLearnedActivities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
        fetchLearnedActivities();
    }
  }, [user]);

  const fetchLearnedActivities = async () => {
      if (!user) return;
      setLoading(true);
      const { data } = await supabase
          .from('social_interactions')
          .select('entity_context')
          .eq('user_id', user.id)
          .eq('action_type', 'activity');
      
      if (data) {
          const activityNames = Array.from(new Set(data.map(d => d.entity_context || '')));
          setLearnedActivities(activityNames as string[]);
      }
      setLoading(false);
  };

  const handleLearnActivity = async (activityName: string, xp: number, achievementId: string) => {
      if (!user) {
          alert("Please login to record progress.");
          return;
      }
      
      if (learnedActivities.includes(activityName)) {
          return;
      }
      
      // Update Local State
      const newLearned = [...learnedActivities, activityName];
      setLearnedActivities(newLearned);
      
      // Awards
      onAddPoints(xp);
      onUnlockAchievement(achievementId);
      AudioSystem.playAchievement();
      
      // 1. Log to DB Interaction Table
      await supabase.from('social_interactions').insert({
          user_id: user.id,
          action_type: 'activity',
          entity_context: activityName
      });

      // 2. Log to Global Activity Feed
      await supabase.from('activity_feed').insert({
          user_id: user.id,
          username: user.username,
          avatar: user.avatar,
          activity_type: 'achievement',
          details: { title: `Completed ${activityName}`, icon: '🧩', reward: xp }
      });

      // 3. Update Community Achievements (New Logic)
      if (!user.id.startsWith('offline-')) {
          // Find all communities the user is a member of
          const { data: membershipData } = await supabase
              .from('community_members')
              .select('community_id')
              .eq('user_id', user.id);
          
          if (membershipData && membershipData.length > 0) {
              const communityIds = membershipData.map(m => m.community_id);
              // Increment achievements for each community
              for (const commId of communityIds) {
                  // We increment collective deeds
                  await supabase.rpc('increment_community_achievements', { 
                      p_community_id: commId, 
                      p_amount: 1 
                  });
              }
          }
      }

      // Check for Master Badge (all 4 activities)
      const requiredActivities = ['Lectio Divina', 'Verse Mapping', 'Prayer Walk', 'Scavenger Hunt'];
      const hasAll = requiredActivities.every(act => newLearned.includes(act));
      
      if (hasAll) {
          setTimeout(() => {
              onAwardBadge('disciplined');
          }, 1500); 
      }
  };

  return (
    <div className="min-h-screen bg-teal-900 p-4 pt-20 md:p-8 md:pt-24 flex flex-col items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-fade-in">
        
        {/* Header */}
        <div className="w-full max-w-6xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-teal-950/80 p-6 rounded-xl border-b-4 border-teal-500 shadow-xl backdrop-blur-sm">
            <div>
               <h1 className="text-3xl md:text-4xl font-retro text-teal-300 text-shadow-md">Spiritual Disciplines</h1>
               <p className="text-teal-100/70 font-mono text-sm mt-1">Interactive practices to deepen your walk and strengthen your Fellowship.</p>
            </div>
            <Button onClick={onBack} variant="secondary" className="text-xs bg-teal-800 border-teal-600 hover:bg-teal-700 text-white">
                🏠 Return Home
            </Button>
        </div>

        {/* Content Grid */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
            
            {/* Activity 1: Lectio Divina */}
            <div className="bg-gray-900 border-2 border-teal-700 rounded-xl overflow-hidden shadow-lg flex flex-col h-full hover:border-teal-400 transition-colors group">
                <div className="h-40 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20monk%20reading%20scroll%20candlelight?width=600&height=300&nologo=true')] bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors"></div>
                    <div className="absolute bottom-4 left-4">
                        <h3 className="text-2xl font-bold text-white font-serif drop-shadow-md">Lectio Divina</h3>
                    </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                    <p className="text-gray-300 text-sm mb-4 italic">"Divine Reading" - A traditional monastic practice of scriptural reading, meditation and prayer.</p>
                    <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4 mb-6">
                        <li><strong>Lectio (Read):</strong> Read a short passage slowly.</li>
                        <li><strong>Meditatio (Reflect):</strong> Think about which word speaks to you.</li>
                        <li><strong>Oratio (Respond):</strong> Pray about that word.</li>
                        <li><strong>Contemplatio (Rest):</strong> Sit in God's presence.</li>
                    </ul>
                    <div className="mt-auto">
                        <button 
                            onClick={() => handleLearnActivity('Lectio Divina', 100, 'activity_lectio')}
                            disabled={learnedActivities.includes('Lectio Divina')}
                            className={`w-full py-3 rounded text-xs font-bold uppercase border transition-all ${
                                learnedActivities.includes('Lectio Divina') 
                                ? 'bg-green-900/50 text-green-400 border-green-600 cursor-default' 
                                : 'bg-teal-600 hover:bg-teal-500 text-white border-teal-800 shadow-md hover:shadow-lg hover:-translate-y-1'
                            }`}
                        >
                            {learnedActivities.includes('Lectio Divina') ? '✓ Learned' : 'Mark as Learned (+100 XP)'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Activity 2: Verse Mapping */}
            <div className="bg-gray-900 border-2 border-teal-700 rounded-xl overflow-hidden shadow-lg flex flex-col h-full hover:border-teal-400 transition-colors group">
                <div className="h-40 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20map%20with%20bible%20verses%20connections?width=600&height=300&nologo=true')] bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors"></div>
                    <div className="absolute bottom-4 left-4">
                        <h3 className="text-2xl font-bold text-white font-serif drop-shadow-md">Verse Mapping</h3>
                    </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                    <p className="text-gray-300 text-sm mb-4 italic">Deconstruct a verse to understand its deeper meaning, history, and context.</p>
                    <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4 mb-6">
                        <li>Select a verse.</li>
                        <li>Write out different translations (KJV, ESV, NIV).</li>
                        <li>Circle key words and look up Hebrew/Greek definitions.</li>
                        <li>Write a personal application summary.</li>
                    </ul>
                    <div className="mt-auto">
                        <button 
                            onClick={() => handleLearnActivity('Verse Mapping', 100, 'activity_mapping')}
                            disabled={learnedActivities.includes('Verse Mapping')}
                            className={`w-full py-3 rounded text-xs font-bold uppercase border transition-all ${
                                learnedActivities.includes('Verse Mapping') 
                                ? 'bg-green-900/50 text-green-400 border-green-600 cursor-default' 
                                : 'bg-teal-600 hover:bg-teal-500 text-white border-teal-800 shadow-md hover:shadow-lg hover:-translate-y-1'
                            }`}
                        >
                            {learnedActivities.includes('Verse Mapping') ? '✓ Learned' : 'Mark as Learned (+100 XP)'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Activity 3: Prayer Walk */}
            <div className="bg-gray-900 border-2 border-teal-700 rounded-xl overflow-hidden shadow-lg flex flex-col h-full hover:border-teal-400 transition-colors group">
                <div className="h-40 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20person%20walking%20in%20neighborhood%20praying?width=600&height=300&nologo=true')] bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors"></div>
                    <div className="absolute bottom-4 left-4">
                        <h3 className="text-2xl font-bold text-white font-serif drop-shadow-md">Prayer Walk</h3>
                    </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                    <p className="text-gray-300 text-sm mb-4 italic">Intercede for your community while physically walking through it.</p>
                    <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4 mb-6">
                        <li>Walk your neighborhood.</li>
                        <li>Pray for each house you pass.</li>
                        <li>Ask God to bless the schools and businesses.</li>
                        <li>Listen for spiritual promptings.</li>
                    </ul>
                    <div className="mt-auto">
                        <button 
                            onClick={() => handleLearnActivity('Prayer Walk', 100, 'activity_walk')}
                            disabled={learnedActivities.includes('Prayer Walk')}
                            className={`w-full py-3 rounded text-xs font-bold uppercase border transition-all ${
                                learnedActivities.includes('Prayer Walk') 
                                ? 'bg-green-900/50 text-green-400 border-green-600 cursor-default' 
                                : 'bg-teal-600 hover:bg-teal-500 text-white border-teal-800 shadow-md hover:shadow-lg hover:-translate-y-1'
                            }`}
                        >
                            {learnedActivities.includes('Prayer Walk') ? '✓ Learned' : 'Mark as Learned (+100 XP)'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Activity 4: Scripture Scavenger Hunt */}
            <div className="bg-gray-900 border-2 border-teal-700 rounded-xl overflow-hidden shadow-lg flex flex-col h-full hover:border-teal-400 transition-colors group">
                <div className="h-40 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20treasure%20hunt%20home%20objects?width=600&height=300&nologo=true')] bg-cover bg-center relative">
                    <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors"></div>
                    <div className="absolute bottom-4 left-4">
                        <h3 className="text-2xl font-bold text-white font-serif drop-shadow-md">Scavenger Hunt</h3>
                    </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                    <p className="text-gray-300 text-sm mb-4 italic">Find objects in your home that represent biblical truths. Great for families!</p>
                    <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4 mb-6">
                        <li>Find something <strong>rock</strong> hard (Psalm 18:2).</li>
                        <li>Find something <strong>light</strong> giving (Psalm 119:105).</li>
                        <li>Find something with <strong>bread</strong> (John 6:35).</li>
                        <li>Find water (John 4:14).</li>
                    </ul>
                    <div className="mt-auto">
                        <button 
                            onClick={() => handleLearnActivity('Scavenger Hunt', 100, 'activity_hunt')}
                            disabled={learnedActivities.includes('Scavenger Hunt')}
                            className={`w-full py-3 rounded text-xs font-bold uppercase border transition-all ${
                                learnedActivities.includes('Scavenger Hunt') 
                                ? 'bg-green-900/50 text-green-400 border-green-600 cursor-default' 
                                : 'bg-teal-600 hover:bg-teal-500 text-white border-teal-800 shadow-md hover:shadow-lg hover:-translate-y-1'
                            }`}
                        >
                            {learnedActivities.includes('Scavenger Hunt') ? '✓ Learned' : 'Mark as Learned (+100 XP)'}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default BibleActivitiesView;
