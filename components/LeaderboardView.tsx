
import React, { useEffect, useState } from 'react';
import Button from './Button';
import { PLAYER_LEVELS, BADGES } from '../constants';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface LeaderboardViewProps {
  currentUser: User | null;
  currentPoints: number;
  onBack: () => void;
}

interface LeaderboardEntry {
  username: string;
  net_worth: number;
  liquid_xp: number;
  asset_xp: number;
  avatar: string;
  badges: string[];
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ currentUser, currentPoints, onBack }) => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // Fetch from the new VIEW which calculates Net Worth
        const { data, error } = await supabase
          .from('player_leaderboard')
          .select('username, net_worth, liquid_xp, asset_xp, avatar, badges')
          .order('net_worth', { ascending: false })
          .limit(50);

        if (error) throw error;
        
        const mappedData: LeaderboardEntry[] = (data || []).map((user: any) => ({
          username: user.username || 'Unknown',
          net_worth: user.net_worth || 0,
          liquid_xp: user.liquid_xp || 0,
          asset_xp: user.asset_xp || 0,
          avatar: user.avatar || 'https://image.pollinations.ai/prompt/pixel%20art%20avatar?width=100&height=100&nologo=true',
          badges: user.badges || []
        }));

        setLeaderboardData(mappedData);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);
  
  const getLevelFromXP = (xp: number) => {
    return PLAYER_LEVELS.filter(l => l.xp <= xp).pop() || PLAYER_LEVELS[0];
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center p-4 pt-20 md:p-6 md:pt-24 bg-[url('https://image.pollinations.ai/prompt/pixel%20art%20stained%20glass%20window%20cathedral?width=1200&height=800&nologo=true')] bg-cover bg-center">
      <div className="absolute inset-0 bg-black/85"></div>
      
      <div className="relative z-10 w-full max-w-5xl">
        <div className="flex justify-between items-center mb-6 md:mb-8 border-b-4 border-yellow-700 pb-4 bg-black/50 p-4 rounded-t-xl backdrop-blur-sm">
           <div>
             <h1 className="text-3xl md:text-4xl font-retro text-yellow-500 text-shadow-md">HALL OF FAITH</h1>
             <p className="text-gray-300 font-serif italic text-sm md:text-base">Ranked by Net Worth (Liquid + Artifacts)</p>
           </div>
           <Button onClick={onBack} variant="secondary" className="text-xs md:text-sm">🏠 Home</Button>
        </div>

        <div className="bg-gray-800/90 rounded-b-xl border-4 border-gray-700 overflow-hidden pixel-shadow min-h-[400px]">
           {loading ? (
             <div className="flex items-center justify-center h-64 text-yellow-500 font-retro animate-pulse">
               Loading Pilgrims...
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[600px]">
                 <thead>
                   <tr className="bg-black/40 text-gray-500 font-retro text-[10px] md:text-xs uppercase border-b-4 border-black">
                     <th className="p-4 w-16 text-center">Rank</th>
                     <th className="p-4">Pilgrim</th>
                     <th className="p-4">Level</th>
                     <th className="p-4">Badges</th>
                     <th className="p-4 text-right">Net Worth</th>
                   </tr>
                 </thead>
                 <tbody className="font-mono text-sm md:text-lg">
                   {leaderboardData.map((entry, idx) => {
                     const rank = idx + 1;
                     const isUser = currentUser && entry.username === currentUser.username;
                     const levelInfo = getLevelFromXP(entry.net_worth);

                     return (
                       <tr 
                         key={idx} 
                         className={`
                           border-b border-gray-700 hover:bg-white/5 transition-colors
                           ${isUser ? 'bg-yellow-900/30 border-yellow-700' : ''}
                         `}
                       >
                         <td className="p-4 text-center">
                           <span className={`
                             inline-block w-8 h-8 text-center leading-8 rounded font-bold
                             ${rank === 1 ? 'bg-yellow-500 text-black shadow-[0_0_10px_orange]' : 
                               rank === 2 ? 'bg-gray-400 text-black' : 
                               rank === 3 ? 'bg-amber-700 text-white' : 'text-gray-500'}
                           `}>
                             {rank}
                           </span>
                         </td>
                         <td className="p-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded border-2 border-gray-600 overflow-hidden bg-black shrink-0">
                               <img src={entry.avatar} alt="avatar" className="w-full h-full object-cover" />
                             </div>
                             <div className="flex flex-col">
                               <span className={isUser ? 'text-yellow-400 font-bold' : 'text-gray-300'}>
                                 {entry.username} {isUser && '(YOU)'}
                               </span>
                               {entry.asset_xp > 0 && (
                                   <span className="text-[10px] text-green-500">
                                       💎 {entry.asset_xp.toLocaleString()} Assets
                                   </span>
                               )}
                             </div>
                           </div>
                         </td>
                         <td className="p-4">
                            <span className="text-xs bg-gray-900 border border-gray-600 px-2 py-1 rounded text-blue-300">
                              Lvl {levelInfo.level}
                            </span>
                         </td>
                         <td className="p-4">
                            <div className="flex gap-1">
                              {entry.badges && entry.badges.map((badgeId: string) => {
                                const badgeDef = BADGES.find(b => b.id === badgeId);
                                return badgeDef ? (
                                  <span key={badgeId} title={badgeDef.name} className="cursor-help text-lg hover:scale-125 transition-transform">
                                    {badgeDef.icon}
                                  </span>
                                ) : null;
                              })}
                            </div>
                         </td>
                         <td className="p-4 text-right font-retro text-green-400">
                           {entry.net_worth.toLocaleString()}
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           )}
        </div>
        
        <div className="mt-4 text-center text-xs text-gray-500 font-mono">
           Global Rankings • Top 50 by Total Net Worth (Assets + XP)
        </div>
      </div>
    </div>
  );
};

export default LeaderboardView;
